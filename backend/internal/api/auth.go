package api

import (
	"database/sql"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/codepilot/backend/internal/db"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type authClaims struct {
	UserID int `json:"uid"`
	jwt.RegisteredClaims
}

type authUserResponse struct {
	ID             int    `json:"id"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	GitHubUsername string `json:"github_username,omitempty"`
	AvatarURL      string `json:"avatar_url,omitempty"`
	Plan           string `json:"plan,omitempty"`
}

func (h *Handler) authSignUp(c *gin.Context) {
	var body struct {
		Name     string `json:"name" binding:"required"`
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	name := strings.TrimSpace(body.Name)
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create account"})
		return
	}

	user, err := h.db.CreateUser(name, email, string(hash))
	if err != nil {
		if db.IsUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	token, expiry, err := h.signSessionToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}
	h.setSessionCookie(c, token, expiry)

	c.JSON(http.StatusCreated, gin.H{
		"user":       toAuthUser(user),
		"expires_at": expiry.UTC().Format(time.RFC3339),
	})
}

func (h *Handler) authSignIn(c *gin.Context) {
	var body struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	email := strings.ToLower(strings.TrimSpace(body.Email))
	user, err := h.db.GetUserByEmail(email)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	token, expiry, err := h.signSessionToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}
	h.setSessionCookie(c, token, expiry)

	c.JSON(http.StatusOK, gin.H{
		"user":       toAuthUser(user),
		"expires_at": expiry.UTC().Format(time.RFC3339),
	})
}

func (h *Handler) authSession(c *gin.Context) {
	user, expiry, err := h.currentUserFromCookie(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"user":       toAuthUser(user),
		"expires_at": expiry.UTC().Format(time.RFC3339),
	})
}

func (h *Handler) authSignOut(c *gin.Context) {
	h.clearSessionCookie(c)
	c.JSON(http.StatusOK, gin.H{"ok": true})
}

func (h *Handler) authGitHub(c *gin.Context) {
	if url := strings.TrimSpace(os.Getenv("GITHUB_OAUTH_URL")); url != "" {
		c.Redirect(http.StatusTemporaryRedirect, url)
		return
	}
	c.JSON(http.StatusNotImplemented, gin.H{
		"error": "github oauth is not configured",
	})
}

func (h *Handler) requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, _, err := h.currentUserFromCookie(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Set("auth_user", user)
		c.Next()
	}
}

func (h *Handler) signSessionToken(user *db.User) (string, time.Time, error) {
	expiry := time.Now().Add(h.sessionTTL())
	claims := authClaims{
		UserID: user.ID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(user.ID),
			ExpiresAt: jwt.NewNumericDate(expiry),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(h.jwtSecret()))
	if err != nil {
		return "", time.Time{}, err
	}
	return signed, expiry, nil
}

func (h *Handler) currentUserFromCookie(c *gin.Context) (*db.User, time.Time, error) {
	token, err := c.Cookie(h.cookieName())
	if err != nil {
		return nil, time.Time{}, err
	}

	claims := &authClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(h.jwtSecret()), nil
	})
	if err != nil || !parsed.Valid {
		return nil, time.Time{}, http.ErrNoCookie
	}

	userID := claims.UserID
	if userID == 0 {
		if claims.Subject == "" {
			return nil, time.Time{}, http.ErrNoCookie
		}
		parsedID, convErr := strconv.Atoi(claims.Subject)
		if convErr != nil {
			return nil, time.Time{}, http.ErrNoCookie
		}
		userID = parsedID
	}

	user, err := h.db.GetUserByID(userID)
	if err != nil {
		return nil, time.Time{}, err
	}

	expiry := time.Time{}
	if claims.ExpiresAt != nil {
		expiry = claims.ExpiresAt.Time
	}
	return user, expiry, nil
}

func (h *Handler) setSessionCookie(c *gin.Context, token string, expiry time.Time) {
	secure := strings.EqualFold(os.Getenv("ENV"), "production")
	c.SetSameSite(http.SameSiteLaxMode)
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     h.cookieName(),
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		Expires:  expiry,
		MaxAge:   int(time.Until(expiry).Seconds()),
	})
}

func (h *Handler) clearSessionCookie(c *gin.Context) {
	secure := strings.EqualFold(os.Getenv("ENV"), "production")
	c.SetSameSite(http.SameSiteLaxMode)
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     h.cookieName(),
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func (h *Handler) cookieName() string {
	if v := strings.TrimSpace(os.Getenv("AUTH_COOKIE_NAME")); v != "" {
		return v
	}
	return "codepilot_session"
}

func (h *Handler) jwtSecret() string {
	if v := strings.TrimSpace(os.Getenv("JWT_SECRET")); v != "" {
		return v
	}
	return "codepilot-dev-secret-change-me"
}

func (h *Handler) sessionTTL() time.Duration {
	if v := strings.TrimSpace(os.Getenv("AUTH_SESSION_HOURS")); v != "" {
		if hours, err := strconv.Atoi(v); err == nil && hours > 0 {
			return time.Duration(hours) * time.Hour
		}
	}
	return 7 * 24 * time.Hour
}

func toAuthUser(user *db.User) authUserResponse {
	return authUserResponse{
		ID:             user.ID,
		Name:           user.Name,
		Email:          user.Email,
		GitHubUsername: user.GitHubUsername,
		AvatarURL:      user.AvatarURL,
		Plan:           user.Plan,
	}
}
