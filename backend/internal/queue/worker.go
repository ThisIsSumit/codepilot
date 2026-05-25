package queue

import (
	"context"
	"log"

	"github.com/codepilot/backend/internal/agent"
	"github.com/codepilot/backend/internal/db"
)

// processJob is called by the worker for each dequeued job.
// It runs the Gemini agent and persists the results.
func processJob(ctx context.Context, database *db.DB, job PRJob) {
	// Mark as processing
	if err := database.UpdateReviewStatus(job.ReviewID, "processing", "none", "", 0, "[]"); err != nil {
		log.Printf("processJob: failed to mark processing: %v", err)
	}

	a := agent.New(database)
	result, err := a.ReviewPR(ctx, agent.ReviewRequest{
		ReviewID:     job.ReviewID,
		RepoFullName: job.RepoFullName,
		PRNumber:     job.PRNumber,
		DiffURL:      job.DiffURL,
		InstallID:    job.InstallID,
	})

	if err != nil {
		log.Printf("processJob: agent error for review %d: %v", job.ReviewID, err)
		database.UpdateReviewStatus(job.ReviewID, "failed", "none", err.Error(), 0, "[]")
		return
	}

	log.Printf("processJob: review %d done — severity=%s issues=%d",
		job.ReviewID, result.Severity, len(result.Issues))
}
