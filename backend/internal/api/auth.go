package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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
	// Allow overriding full URL (convenience for deploys)
	if u := strings.TrimSpace(os.Getenv("GITHUB_OAUTH_URL")); u != "" {
		c.Redirect(http.StatusTemporaryRedirect, u)
		return
	}

	clientID := strings.TrimSpace(os.Getenv("GITHUB_CLIENT_ID"))
	if clientID == "" {
		c.JSON(http.StatusNotImplemented, gin.H{"error": "github oauth not configured"})
		return
	}

	redirect := strings.TrimSpace(os.Getenv("GITHUB_REDIRECT_URL"))
	if redirect == "" {
		backend := strings.TrimSpace(os.Getenv("BACKEND_ORIGIN"))
		if backend == "" {
			backend = "http://localhost:8080"
		}
		redirect = backend + "/api/v1/auth/github/callback"
	}

	authURL := fmt.Sprintf("https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=%s&allow_signup=true",
		url.QueryEscape(clientID), url.QueryEscape(redirect), url.QueryEscape("user:email"))
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// authGitHubCallback handles the OAuth callback, exchanges code for token, fetches
// the GitHub user, upserts into DB and signs a session cookie before redirecting.
func (h *Handler) authGitHubCallback(c *gin.Context) {
	code := c.Query("code")
	if strings.TrimSpace(code) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	clientID := strings.TrimSpace(os.Getenv("GITHUB_CLIENT_ID"))
	clientSecret := strings.TrimSpace(os.Getenv("GITHUB_CLIENT_SECRET"))
	if clientID == "" || clientSecret == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "github client not configured"})
		return
	}

	// Exchange code for access token
	tokenURL := "https://github.com/login/oauth/access_token"
	data := url.Values{}
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("code", code)
	if redirect := strings.TrimSpace(os.Getenv("GITHUB_REDIRECT_URL")); redirect != "" {
		data.Set("redirect_uri", redirect)
	}

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token request failed"})
		return
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "token exchange failed"})
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	var tokResp struct {
		AccessToken string `json:"access_token"`
		Scope       string `json:"scope"`
		TokenType   string `json:"token_type"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.Unmarshal(body, &tokResp); err != nil || tokResp.AccessToken == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid token response"})
		return
	}

	// Fetch GitHub user
	userReq, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	userReq.Header.Set("Authorization", "token "+tokResp.AccessToken)
	userReq.Header.Set("Accept", "application/vnd.github.v3+json")
	userResp, err := client.Do(userReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch github user"})
		return
	}
	defer userResp.Body.Close()
	ubody, _ := io.ReadAll(userResp.Body)
	var gu struct {
		ID        int64  `json:"id"`
		Login     string `json:"login"`
		Name      string `json:"name"`
		Email     string `json:"email"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.Unmarshal(ubody, &gu); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid github user response"})
		return
	}

	email := strings.TrimSpace(gu.Email)
	// If email not public, query /user/emails
	if email == "" {
		emailsReq, _ := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
		emailsReq.Header.Set("Authorization", "token "+tokResp.AccessToken)
		emailsReq.Header.Set("Accept", "application/vnd.github.v3+json")
		eresp, err := client.Do(emailsReq)
		if err == nil {
			defer eresp.Body.Close()
			eb, _ := io.ReadAll(eresp.Body)
			var emails []struct {
				Email      string `json:"email"`
				Primary    bool   `json:"primary"`
				Verified   bool   `json:"verified"`
				Visibility string `json:"visibility"`
			}
			if json.Unmarshal(eb, &emails) == nil {
				for _, e := range emails {
					if e.Primary && e.Verified {
						email = e.Email
						break
					}
				}
				if email == "" && len(emails) > 0 {
					email = emails[0].Email
				}
			}
		}
	}

	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email not available from github"})
		return
	}

	name := strings.TrimSpace(gu.Name)
	if name == "" {
		name = gu.Login
	}

	user, err := h.db.UpsertUserFromGitHub(name, strings.ToLower(email), gu.Login, gu.AvatarURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db error"})
		return
	}

	tokenStr, expiry, err := h.signSessionToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}
	h.setSessionCookie(c, tokenStr, expiry)

	// Redirect user to frontend dashboard with cookie set
	frontend := strings.TrimSpace(os.Getenv("FRONTEND_ORIGIN"))
	if frontend == "" {
		frontend = "http://localhost:3000"
	}
	c.Redirect(http.StatusSeeOther, frontend+"/dashboard")
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
