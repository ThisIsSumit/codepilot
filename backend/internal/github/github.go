package github

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// ─── Webhook validation ───────────────────────────────────────────────────────

// ValidateSignature checks the X-Hub-Signature-256 header against the payload.
func ValidateSignature(secret string, payload []byte, sig string) bool {
	if secret == "" {
		return true // skip validation in dev
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}

// ─── Webhook payloads ─────────────────────────────────────────────────────────

type PullRequestEvent struct {
	Action      string      `json:"action"`
	Number      int         `json:"number"`
	PullRequest PullRequest `json:"pull_request"`
	Repository  Repository  `json:"repository"`
	Installation *Installation `json:"installation"`
}

type PullRequest struct {
	Number  int    `json:"number"`
	Title   string `json:"title"`
	HTMLURL string `json:"html_url"`
	DiffURL string `json:"diff_url"`
	State   string `json:"state"`
	User    User   `json:"user"`
	Head    Branch `json:"head"`
	Base    Branch `json:"base"`
}

type Repository struct {
	FullName string `json:"full_name"`
	Owner    Owner  `json:"owner"`
	Name     string `json:"name"`
}

type Owner struct {
	Login string `json:"login"`
}

type User struct {
	Login string `json:"login"`
}

type Branch struct {
	Ref string `json:"ref"`
	SHA string `json:"sha"`
}

type Installation struct {
	ID int64 `json:"id"`
}

// ─── GitHub REST client ───────────────────────────────────────────────────────

type Client struct {
	token  string
	client *http.Client
}

func NewClient(token string) *Client {
	return &Client{
		token:  token,
		client: &http.Client{},
	}
}

// FetchDiff retrieves the raw unified diff for a PR.
func (c *Client) FetchDiff(diffURL string) (string, error) {
	req, err := http.NewRequest("GET", diffURL, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "token "+c.token)
	req.Header.Set("Accept", "application/vnd.github.v3.diff")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch diff: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("github diff returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024)) // 512 KB limit
	if err != nil {
		return "", fmt.Errorf("read diff: %w", err)
	}
	return string(body), nil
}

// PostComment posts a review comment to a PR.
func (c *Client) PostComment(owner, repo string, prNumber int, body string) error {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%d/comments",
		owner, repo, prNumber)

	payload, _ := json.Marshal(map[string]string{"body": body})
	req, err := http.NewRequest("POST", url, strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "token "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("post comment: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("github comment returned %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// PostReviewRequest submits a formal GitHub PR review (approve/request changes/comment).
func (c *Client) PostReviewRequest(owner, repo string, prNumber int, event, body string) error {
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%d/reviews",
		owner, repo, prNumber)

	payload, _ := json.Marshal(map[string]string{
		"body":  body,
		"event": event, // APPROVE | REQUEST_CHANGES | COMMENT
	})

	req, err := http.NewRequest("POST", url, strings.NewReader(string(payload)))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "token "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("post review: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("github review returned %d: %s", resp.StatusCode, string(b))
	}
	return nil
}

// ParseParts splits "owner/repo" into owner, repo.
func ParseParts(fullName string) (string, string, error) {
	parts := strings.SplitN(fullName, "/", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid repo full name: %s", fullName)
	}
	return parts[0], parts[1], nil
}
