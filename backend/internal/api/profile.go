package api

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/codepilot/backend/internal/db"
	"github.com/gin-gonic/gin"
)

type profileResponse struct {
	User  profileUserResponse `json:"user"`
	Stats profileStats        `json:"stats"`
}

type profileUserResponse struct {
	ID                       int    `json:"id"`
	Name                     string `json:"name"`
	Email                    string `json:"email"`
	GitHubUsername           string `json:"github_username"`
	AvatarURL                string `json:"avatar_url"`
	Plan                     string `json:"plan"`
	APIKey                   string `json:"api_key"`
	NotificationEmail        bool   `json:"notification_email"`
	NotificationSlack        bool   `json:"notification_slack"`
	NotificationWeeklyDigest bool   `json:"notification_weekly_digest"`
	JoinedAt                 string `json:"joined_at"`
}

type profileStats struct {
	ReviewsTotal   int `json:"reviews_total"`
	ReposConnected int `json:"repos_connected"`
	Completed      int `json:"completed"`
	Failed         int `json:"failed"`
	CriticalPRs    int `json:"critical_prs"`
}

func (h *Handler) getProfile(c *gin.Context) {
	user := h.mustAuthUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	fresh, err := h.db.GetUserByID(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "profile unavailable"})
		return
	}

	stats, err := h.profileStats(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "stats unavailable"})
		return
	}

	c.JSON(http.StatusOK, profileResponse{
		User:  toProfileUser(fresh),
		Stats: stats,
	})
}

func (h *Handler) updateProfile(c *gin.Context) {
	user := h.mustAuthUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var body struct {
		Name           string `json:"name" binding:"required"`
		Email          string `json:"email" binding:"required,email"`
		GitHubUsername string `json:"github_username"`
		AvatarURL      string `json:"avatar_url"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	name := strings.TrimSpace(body.Name)
	email := strings.ToLower(strings.TrimSpace(body.Email))
	githubUsername := strings.TrimSpace(body.GitHubUsername)
	avatarURL := strings.TrimSpace(body.AvatarURL)
	if name == "" || email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name and email are required"})
		return
	}

	updated, err := h.db.UpdateUserProfile(user.ID, name, email, githubUsername, avatarURL)
	if err != nil {
		if db.IsUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": toProfileUser(updated)})
}

func (h *Handler) updateNotificationPreferences(c *gin.Context) {
	user := h.mustAuthUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var body struct {
		EmailEnabled  bool `json:"email_enabled"`
		SlackEnabled  bool `json:"slack_enabled"`
		DigestEnabled bool `json:"digest_enabled"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := h.db.UpdateUserNotifications(user.ID, body.EmailEnabled, body.SlackEnabled, body.DigestEnabled)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": toProfileUser(updated)})
}

func (h *Handler) rotateAPIKey(c *gin.Context) {
	user := h.mustAuthUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	key, err := generateAPIKey()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate api key"})
		return
	}

	updated, err := h.db.RotateUserAPIKey(user.ID, key)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not rotate api key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": toProfileUser(updated)})
}

func (h *Handler) deleteAccount(c *gin.Context) {
	user := h.mustAuthUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var body struct {
		Confirm string `json:"confirm"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if strings.TrimSpace(body.Confirm) != "delete my account" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "confirmation text does not match"})
		return
	}

	if err := h.db.DeleteUser(user.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete account"})
		return
	}

	h.clearSessionCookie(c)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) mustAuthUser(c *gin.Context) *db.User {
	user, ok := c.Get("auth_user")
	if !ok {
		return nil
	}
	if typed, ok := user.(*db.User); ok {
		return typed
	}
	return nil
}

func (h *Handler) profileStats(user *db.User) (profileStats, error) {
	if user == nil {
		return profileStats{}, nil
	}
	owner := strings.TrimSpace(user.GitHubUsername)
	if owner == "" {
		return profileStats{}, nil
	}

	stats, err := h.db.GetStatsByOwner(owner)
	if err != nil {
		return profileStats{}, err
	}

	repos, err := h.db.ListRepositoriesByOwner(owner)
	if err != nil {
		return profileStats{}, err
	}

	converted := profileStats{}
	if total, ok := stats["total_reviews"].(int); ok {
		converted.ReviewsTotal = total
	}
	if completed, ok := stats["completed"].(int); ok {
		converted.Completed = completed
	}
	if failed, ok := stats["failed"].(int); ok {
		converted.Failed = failed
	}
	if critical, ok := stats["critical_prs"].(int); ok {
		converted.CriticalPRs = critical
	}
	converted.ReposConnected = len(repos)
	return converted, nil
}

func toProfileUser(user *db.User) profileUserResponse {
	return profileUserResponse{
		ID:                       user.ID,
		Name:                     user.Name,
		Email:                    user.Email,
		GitHubUsername:           user.GitHubUsername,
		AvatarURL:                user.AvatarURL,
		Plan:                     user.Plan,
		APIKey:                   user.APIKey,
		NotificationEmail:        user.NotificationEmail,
		NotificationSlack:        user.NotificationSlack,
		NotificationWeeklyDigest: user.NotificationWeeklyDigest,
		JoinedAt:                 user.CreatedAt.Format("January 2006"),
	}
}

func generateAPIKey() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "cp_live_" + hex.EncodeToString(buf), nil
}
