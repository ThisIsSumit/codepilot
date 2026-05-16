package api

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/codepilot/backend/internal/db"
	gh "github.com/codepilot/backend/internal/github"
	"github.com/codepilot/backend/internal/queue"
	"github.com/gin-gonic/gin"
)

type Handler struct {
	db    *db.DB
	queue *queue.Queue
}

// NewRouter wires all routes and returns the gin Engine.
func NewRouter(database *db.DB, q *queue.Queue) *gin.Engine {
	h := &Handler{db: database, queue: q}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), corsMiddleware())

	// Health
	r.GET("/health", h.health)

	v1 := r.Group("/api/v1")
	{
		// Auth
		v1.POST("/auth/signup", h.authSignUp)
		v1.POST("/auth/signin", h.authSignIn)
		v1.GET("/auth/session", h.authSession)
		v1.POST("/auth/signout", h.authSignOut)
		v1.GET("/auth/github", h.authGitHub)
		v1.GET("/auth/github/callback", h.authGitHubCallback)

		// Webhooks
		v1.POST("/webhooks/github", h.handleGitHubWebhook)

		protected := v1.Group("/")
		protected.Use(h.requireAuth())
		{
			// Profile
			protected.GET("/me", h.getProfile)
			protected.PATCH("/me", h.updateProfile)
			protected.PATCH("/me/notifications", h.updateNotificationPreferences)
			protected.POST("/me/api-key/rotate", h.rotateAPIKey)
			protected.DELETE("/me", h.deleteAccount)

			// Repositories
			protected.GET("/repos", h.listRepos)

			// Reviews
			protected.GET("/reviews", h.listReviews)
			protected.GET("/reviews/:id", h.getReview)
			protected.GET("/reviews/:id/issues", h.getReviewIssues)
			protected.POST("/reviews/trigger", h.triggerReview) // manual trigger

			// Analytics
			protected.GET("/stats", h.getStats)
			protected.GET("/queue/depth", h.queueDepth)
		}
	}

	return r
}

// ─── Health ───────────────────────────────────────────────────────────────────

func (h *Handler) health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"time":   time.Now().UTC(),
	})
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

func (h *Handler) handleGitHubWebhook(c *gin.Context) {
	secret := os.Getenv("GITHUB_WEBHOOK_SECRET")
	sig := c.GetHeader("X-Hub-Signature-256")

	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "read body failed"})
		return
	}

	if !gh.ValidateSignature(secret, body, sig) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	event := c.GetHeader("X-GitHub-Event")
	switch event {
	case "pull_request":
		h.handlePREvent(c, body)
	case "ping":
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	default:
		c.JSON(http.StatusOK, gin.H{"message": "event ignored"})
	}
}

func (h *Handler) handlePREvent(c *gin.Context, body []byte) {
	var event gh.PullRequestEvent
	if err := json.Unmarshal(body, &event); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "parse event failed"})
		return
	}

	// Only process opened or synchronize (new commits)
	if event.Action != "opened" && event.Action != "synchronize" {
		c.JSON(http.StatusOK, gin.H{"message": "action ignored"})
		return
	}

	var installID int64
	if event.Installation != nil {
		installID = event.Installation.ID
	}

	// Upsert repository
	_, err := h.db.UpsertRepository(
		event.Repository.Owner.Login,
		event.Repository.Name,
		installID,
	)
	if err != nil {
		log.Printf("UpsertRepository error: %v", err)
	}

	// Upsert review record
	review, err := h.db.UpsertReview(&db.Review{
		RepoFullName: event.Repository.FullName,
		PRNumber:     event.Number,
		PRTitle:      event.PullRequest.Title,
		PRAuthor:     event.PullRequest.User.Login,
		PRUrl:        event.PullRequest.HTMLURL,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	// Enqueue for async processing
	job := queue.PRJob{
		ReviewID:     review.ID,
		RepoFullName: event.Repository.FullName,
		PRNumber:     event.Number,
		PRTitle:      event.PullRequest.Title,
		PRAuthor:     event.PullRequest.User.Login,
		PRUrl:        event.PullRequest.HTMLURL,
		DiffURL:      event.PullRequest.DiffURL,
		InstallID:    installID,
	}

	if err := h.queue.Enqueue(c.Request.Context(), job); err != nil {
		log.Printf("Enqueue error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "queue error"})
		return
	}

	log.Printf("Enqueued review_id=%d for %s PR#%d", review.ID, event.Repository.FullName, event.Number)
	c.JSON(http.StatusAccepted, gin.H{
		"message":   "review enqueued",
		"review_id": review.ID,
	})
}

// ─── Repos ────────────────────────────────────────────────────────────────────

func (h *Handler) listRepos(c *gin.Context) {
	repos, err := h.db.ListRepositories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if repos == nil {
		repos = []db.Repository{}
	}
	c.JSON(http.StatusOK, gin.H{"repositories": repos, "count": len(repos)})
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

func (h *Handler) listReviews(c *gin.Context) {
	limit := 50
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 200 {
			limit = n
		}
	}
	reviews, err := h.db.ListReviews(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if reviews == nil {
		reviews = []db.Review{}
	}
	c.JSON(http.StatusOK, gin.H{"reviews": reviews, "count": len(reviews)})
}

func (h *Handler) getReview(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	review, err := h.db.GetReview(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, review)
}

func (h *Handler) getReviewIssues(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	issues, err := h.db.GetIssuesByReview(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if issues == nil {
		issues = []db.ReviewIssue{}
	}
	c.JSON(http.StatusOK, gin.H{"issues": issues, "count": len(issues)})
}

// triggerReview is a manual webhook trigger for testing without GitHub.
func (h *Handler) triggerReview(c *gin.Context) {
	var body struct {
		RepoFullName string `json:"repo_full_name" binding:"required"`
		PRNumber     int    `json:"pr_number" binding:"required"`
		PRTitle      string `json:"pr_title"`
		PRAuthor     string `json:"pr_author"`
		PRUrl        string `json:"pr_url"`
		DiffURL      string `json:"diff_url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	review, err := h.db.UpsertReview(&db.Review{
		RepoFullName: body.RepoFullName,
		PRNumber:     body.PRNumber,
		PRTitle:      body.PRTitle,
		PRAuthor:     body.PRAuthor,
		PRUrl:        body.PRUrl,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	job := queue.PRJob{
		ReviewID:     review.ID,
		RepoFullName: body.RepoFullName,
		PRNumber:     body.PRNumber,
		PRTitle:      body.PRTitle,
		PRAuthor:     body.PRAuthor,
		PRUrl:        body.PRUrl,
		DiffURL:      body.DiffURL,
	}

	if err := h.queue.Enqueue(c.Request.Context(), job); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "queue error"})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"review_id": review.ID, "status": "enqueued"})
}

// ─── Analytics ────────────────────────────────────────────────────────────────

func (h *Handler) getStats(c *gin.Context) {
	stats, err := h.db.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) queueDepth(c *gin.Context) {
	depth, err := h.queue.QueueDepth(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"depth": depth})
}

// ─── Middleware ───────────────────────────────────────────────────────────────

func corsMiddleware() gin.HandlerFunc {
	allowedOrigin := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3000"
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && origin == allowedOrigin {
			c.Header("Access-Control-Allow-Origin", origin)
		}
		c.Header("Vary", "Origin")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
