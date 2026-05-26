package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/codepilot/backend/internal/db"
	"github.com/codepilot/backend/internal/notifications"
	"github.com/redis/go-redis/v9"
)

const (
	jobQueue      = "codepilot:jobs"
	processingQ   = "codepilot:processing"
	jobTTL        = 24 * time.Hour
	pollInterval  = 2 * time.Second
	retryInterval = 1 * time.Minute
	retryLimit    = 50
)

// Queue wraps Redis and exposes job operations.
type Queue struct {
	client *redis.Client
}

// PRJob is the payload pushed to Redis for each PR to review.
type PRJob struct {
	ReviewID     int    `json:"review_id"`
	RepoFullName string `json:"repo_full_name"`
	PRNumber     int    `json:"pr_number"`
	PRTitle      string `json:"pr_title"`
	PRAuthor     string `json:"pr_author"`
	PRUrl        string `json:"pr_url"`
	DiffURL      string `json:"diff_url"`
	InstallID    int64  `json:"install_id"`
	EnqueuedAt   string `json:"enqueued_at"`
}

func New(redisURL string) (*Queue, error) {
	if redisURL == "" {
		redisURL = "redis://localhost:6379"
	}
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opts)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping: %w", err)
	}
	log.Println("Redis connected")
	return &Queue{client: client}, nil
}

func (q *Queue) Close() error {
	return q.client.Close()
}

// Enqueue pushes a PRJob onto the queue. It stores the job payload as JSON
// in a Redis list (LPUSH). The worker BRPOPs from the other end.
func (q *Queue) Enqueue(ctx context.Context, job PRJob) error {
	job.EnqueuedAt = time.Now().UTC().Format(time.RFC3339)
	payload, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("marshal job: %w", err)
	}
	return q.client.LPush(ctx, jobQueue, payload).Err()
}

// QueueDepth returns how many jobs are waiting.
func (q *Queue) QueueDepth(ctx context.Context) (int64, error) {
	return q.client.LLen(ctx, jobQueue).Result()
}

// ProcessingDepth returns how many jobs are currently being processed.
func (q *Queue) ProcessingDepth(ctx context.Context) (int64, error) {
	return q.client.LLen(ctx, processingQ).Result()
}

// StartFailedReviewRetryScheduler periodically re-enqueues failed reviews
// when the queue and processing list are both empty.
func (q *Queue) StartFailedReviewRetryScheduler(ctx context.Context, database *db.DB) {
	go func() {
		ticker := time.NewTicker(retryInterval)
		defer ticker.Stop()
		log.Println("Retry scheduler started — will re-enqueue failed reviews when idle")

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				q.retryFailedReviews(ctx, database)
			}
		}
	}()
}

func (q *Queue) retryFailedReviews(ctx context.Context, database *db.DB) {
	queueDepth, err := q.QueueDepth(ctx)
	if err != nil {
		log.Printf("retry scheduler: queue depth check failed: %v", err)
		return
	}
	processingDepth, err := q.ProcessingDepth(ctx)
	if err != nil {
		log.Printf("retry scheduler: processing depth check failed: %v", err)
		return
	}
	if queueDepth > 0 || processingDepth > 0 {
		return
	}

	failedReviews, err := database.ListFailedReviews(retryLimit)
	if err != nil {
		log.Printf("retry scheduler: list failed reviews failed: %v", err)
		return
	}
	if len(failedReviews) == 0 {
		return
	}

	log.Printf("retry scheduler: re-enqueuing %d failed review(s)", len(failedReviews))
	for _, review := range failedReviews {
		if err := database.UpdateReviewStatus(review.ID, "pending", "none", "", 0, "[]"); err != nil {
			log.Printf("retry scheduler: mark pending for review %d failed: %v", review.ID, err)
			continue
		}

		if err := q.Enqueue(ctx, PRJob{
			ReviewID:     review.ID,
			RepoFullName: review.RepoFullName,
			PRNumber:     review.PRNumber,
			PRTitle:      review.PRTitle,
			PRAuthor:     review.PRAuthor,
			PRUrl:        review.PRUrl,
		}); err != nil {
			log.Printf("retry scheduler: enqueue review %d failed: %v", review.ID, err)
			if restoreErr := database.UpdateReviewStatus(review.ID, "failed", review.Severity, review.Summary, review.IssuesCount, marshalAgentLog(review.AgentLog)); restoreErr != nil {
				log.Printf("retry scheduler: restore failed state for review %d failed: %v", review.ID, restoreErr)
			}
			continue
		}
	}
}

// StartWorker runs a blocking loop that processes jobs one at a time.
// It uses a reliable queue pattern: BRPOPLPUSH moves the job to a
// "processing" list before handling, so a crash can be recovered.
func (q *Queue) StartWorker(ctx context.Context, database *db.DB, notifier *notifications.Service) {
	log.Println("Worker started — polling for jobs...")

	for {
		select {
		case <-ctx.Done():
			log.Println("Worker shutting down")
			return
		default:
		}

		// Blocking pop with 2s timeout so we respect context cancellation
		result, err := q.client.BRPopLPush(ctx, jobQueue, processingQ,
			pollInterval).Result()

		if err == redis.Nil {
			// No jobs available, loop again
			continue
		}
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			log.Printf("Worker BRPOPLPUSH error: %v — retrying in 5s", err)
			time.Sleep(5 * time.Second)
			continue
		}

		var job PRJob
		if err := json.Unmarshal([]byte(result), &job); err != nil {
			log.Printf("Worker: malformed job payload: %v", err)
			q.removeFromProcessing(ctx, result)
			continue
		}

		log.Printf("Worker: processing review_id=%d repo=%s PR#%d",
			job.ReviewID, job.RepoFullName, job.PRNumber)

		processJob(ctx, database, notifier, job)

		// Remove from processing queue after successful handling
		q.removeFromProcessing(ctx, result)
	}
}

// removeFromProcessing removes a job from the reliable processing list.
func (q *Queue) removeFromProcessing(ctx context.Context, payload string) {
	q.client.LRem(ctx, processingQ, 1, payload)
}

func marshalAgentLog(entries []db.AgentLogEntry) string {
	if len(entries) == 0 {
		return "[]"
	}
	encoded, err := json.Marshal(entries)
	if err != nil {
		return "[]"
	}
	return string(encoded)
}
