package notifications

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/codepilot/backend/internal/db"
)

type Service struct {
	db              *db.DB
	httpClient      *http.Client
	smtpHost        string
	smtpPort        string
	smtpUsername    string
	smtpPassword    string
	emailFrom       string
	slackWebhookURL string
	weeklyDigestAt  time.Time
}

type reviewDigestItem struct {
	Title     string
	Repo      string
	Number    int
	Severity  string
	Summary   string
	URL       string
	CreatedAt time.Time
	Issues    int
}

func New(database *db.DB) *Service {
	return &Service{
		db:              database,
		httpClient:      &http.Client{Timeout: 15 * time.Second},
		smtpHost:        strings.TrimSpace(os.Getenv("SMTP_HOST")),
		smtpPort:        strings.TrimSpace(os.Getenv("SMTP_PORT")),
		smtpUsername:    strings.TrimSpace(os.Getenv("SMTP_USERNAME")),
		smtpPassword:    strings.TrimSpace(os.Getenv("SMTP_PASSWORD")),
		emailFrom:       strings.TrimSpace(os.Getenv("EMAIL_FROM")),
		slackWebhookURL: strings.TrimSpace(os.Getenv("SLACK_WEBHOOK_URL")),
		weeklyDigestAt:  time.Now().UTC(),
	}
}

func (s *Service) NotifyReviewCompleted(ctx context.Context, reviewID int) {
	review, err := s.db.GetReview(reviewID)
	if err != nil {
		log.Printf("notifications: load review %d failed: %v", reviewID, err)
		return
	}
	repo, err := s.db.GetRepositoryByFullName(review.RepoFullName)
	if err != nil {
		log.Printf("notifications: load repo for review %d failed: %v", reviewID, err)
		return
	}

	issues, err := s.db.GetIssuesByReview(reviewID)
	if err != nil {
		log.Printf("notifications: load issues for review %d failed: %v", reviewID, err)
		issues = nil
	}

	users, err := s.db.ListUsers()
	if err != nil {
		log.Printf("notifications: load users failed: %v", err)
		return
	}

	message := buildReviewMessage(review, len(issues))
	for _, user := range users {
		if strings.TrimSpace(user.GitHubUsername) != strings.TrimSpace(repo.Owner) {
			continue
		}
		if user.NotificationEmail {
			if err := s.sendEmail(ctx, user.Email, message.subject, message.body); err != nil {
				log.Printf("notifications: email to %s failed: %v", user.Email, err)
			}
		}
		if user.NotificationSlack {
			if err := s.sendSlack(ctx, message.body); err != nil {
				log.Printf("notifications: slack delivery failed for user %d: %v", user.ID, err)
			}
		}
	}
}

func (s *Service) SendWeeklyDigest(ctx context.Context) {
	users, err := s.loadUsersForDigest()
	if err != nil {
		log.Printf("notifications: load users for digest failed: %v", err)
		return
	}

	s.deliverWeeklyDigest(ctx, users)
}

func (s *Service) loadUsersForDigest() ([]db.User, error) {
	return s.db.ListUsers()
}

func (s *Service) collectWeeklyDigestItems(owner string) ([]reviewDigestItem, error) {
	if strings.TrimSpace(owner) == "" {
		return []reviewDigestItem{}, nil
	}

	reviews, err := s.db.ListReviewsByOwner(100, owner)
	if err != nil {
		return nil, err
	}

	cutoff := time.Now().UTC().Add(-7 * 24 * time.Hour)
	items := make([]reviewDigestItem, 0, len(reviews))
	for _, review := range reviews {
		if review.CreatedAt.Before(cutoff) {
			continue
		}
		items = append(items, reviewDigestItem{
			Title:    review.PRTitle,
			Repo:     review.RepoFullName,
			Number:   review.PRNumber,
			Severity: review.Severity,
			Summary:  review.Summary,
			URL:      review.PRUrl,
			Issues:   review.IssuesCount,
		})
	}
	return items, nil
}

func (s *Service) deliverWeeklyDigest(ctx context.Context, users []db.User) {
	for _, user := range users {
		if !user.NotificationWeeklyDigest {
			continue
		}
		owner := strings.TrimSpace(user.GitHubUsername)
		items, err := s.collectWeeklyDigestItems(owner)
		if err != nil {
			log.Printf("notifications: load reviews for digest failed for user %d: %v", user.ID, err)
			continue
		}
		if len(items) == 0 {
			continue
		}

		body := buildWeeklyDigestBody(items)
		if user.NotificationEmail {
			if err := s.sendEmail(ctx, user.Email, "Your weekly CodePilot digest", body); err != nil {
				log.Printf("notifications: digest email to %s failed: %v", user.Email, err)
			}
		}
		if user.NotificationSlack {
			if err := s.sendSlack(ctx, body); err != nil {
				log.Printf("notifications: digest slack delivery failed for user %d: %v", user.ID, err)
			}
		}
	}
}

func (s *Service) StartWeeklyDigestScheduler(ctx context.Context) {
	if ctx == nil {
		return
	}
	go func() {
		ticker := time.NewTicker(7 * 24 * time.Hour)
		defer ticker.Stop()
		log.Println("notifications: weekly digest scheduler started")
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.SendWeeklyDigest(ctx)
			}
		}
	}()
}

type reviewMessage struct {
	subject string
	body    string
}

func buildReviewMessage(review *db.Review, issueCount int) reviewMessage {
	subject := fmt.Sprintf("CodePilot review: %s #%d (%s)", review.RepoFullName, review.PRNumber, strings.ToUpper(review.Severity))
	body := fmt.Sprintf(
		"Review completed for %s #%d\n\nTitle: %s\nSeverity: %s\nIssues: %d\nStatus: %s\nSummary: %s\nPR: %s\n",
		review.RepoFullName,
		review.PRNumber,
		review.PRTitle,
		strings.ToUpper(review.Severity),
		issueCount,
		review.Status,
		review.Summary,
		review.PRUrl,
	)
	return reviewMessage{subject: subject, body: body}
}

func buildWeeklyDigestBody(items []reviewDigestItem) string {
	var b strings.Builder
	b.WriteString("Your weekly CodePilot digest\n\n")
	for _, item := range items {
		b.WriteString(fmt.Sprintf("- %s #%d [%s]: %s\n", item.Repo, item.Number, strings.ToUpper(item.Severity), item.Title))
		if item.Summary != "" {
			b.WriteString(fmt.Sprintf("  Summary: %s\n", item.Summary))
		}
		if item.URL != "" {
			b.WriteString(fmt.Sprintf("  PR: %s\n", item.URL))
		}
	}
	return b.String()
}

func (s *Service) sendEmail(ctx context.Context, recipient, subject, body string) error {
	if s.smtpHost == "" || s.smtpPort == "" || s.emailFrom == "" {
		log.Printf("notifications: email skipped for %s because SMTP is not configured", recipient)
		return nil
	}
	if s.smtpUsername == "" || s.smtpPassword == "" {
		log.Printf("notifications: email skipped for %s because SMTP credentials are missing", recipient)
		return nil
	}

	msg := []byte("To: " + recipient + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"Content-Type: text/plain; charset=UTF-8\r\n" +
		"\r\n" + body + "\r\n")
	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
	addr := netJoinHostPort(s.smtpHost, s.smtpPort)
	return smtp.SendMail(addr, auth, s.emailFrom, []string{recipient}, msg)
}

func (s *Service) sendSlack(ctx context.Context, body string) error {
	if s.slackWebhookURL == "" {
		log.Println("notifications: slack skipped because webhook is not configured")
		return nil
	}

	payload, err := json.Marshal(map[string]string{"text": body})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.slackWebhookURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("slack webhook status %d", resp.StatusCode)
	}
	return nil
}

func netJoinHostPort(host, port string) string {
	if strings.Contains(host, ":") {
		return host
	}
	return host + ":" + port
}
