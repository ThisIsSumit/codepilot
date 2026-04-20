package agent

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/codepilot/backend/internal/db"
	gh "github.com/codepilot/backend/internal/github"
)

// ─── Types ───────────────────────────────────────────────────────────────────

type Agent struct {
	db         *db.DB
	ghClient   *gh.Client
	httpClient *http.Client
	apiKey     string
}

type ReviewRequest struct {
	ReviewID     int
	RepoFullName string
	PRNumber     int
	DiffURL      string
	InstallID    int64
}

type ReviewResult struct {
	Severity string
	Summary  string
	Issues   []db.ReviewIssue
	AgentLog []db.AgentLogEntry
}

// ─── Claude API types ─────────────────────────────────────────────────────────

type claudeMessage struct {
	Role    string        `json:"role"`
	Content []contentPart `json:"content"`
}

type contentPart struct {
	Type       string      `json:"type"`
	Text       string      `json:"text,omitempty"`
	ID         string      `json:"id,omitempty"`
	Name       string      `json:"name,omitempty"`
	Input      interface{} `json:"input,omitempty"`
	ToolUseID  string      `json:"tool_use_id,omitempty"`
	Content    string      `json:"content,omitempty"`
}

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	System    string          `json:"system"`
	Tools     []claudeTool    `json:"tools"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeTool struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	InputSchema interface{} `json:"input_schema"`
}

type claudeResponse struct {
	ID         string        `json:"id"`
	Type       string        `json:"type"`
	StopReason string        `json:"stop_reason"`
	Content    []contentPart `json:"content"`
}

// ─── Constructor ─────────────────────────────────────────────────────────────

func New(database *db.DB) *Agent {
	ghToken := os.Getenv("GITHUB_TOKEN")
	return &Agent{
		db:         database,
		ghClient:   gh.NewClient(ghToken),
		httpClient: &http.Client{Timeout: 120 * time.Second},
		apiKey:     os.Getenv("ANTHROPIC_API_KEY"),
	}
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

var tools = []claudeTool{
	{
		Name:        "read_pr_diff",
		Description: "Fetches the raw unified diff for the PR. Returns the full git diff showing all added/removed lines across all changed files.",
		InputSchema: map[string]interface{}{
			"type":       "object",
			"properties": map[string]interface{}{},
			"required":   []string{},
		},
	},
	{
		Name:        "post_github_comment",
		Description: "Posts a formatted review comment on the GitHub PR. Use this after completing your analysis to share findings with the team.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"comment": map[string]interface{}{
					"type":        "string",
					"description": "The markdown-formatted review comment to post",
				},
				"event": map[string]interface{}{
					"type":        "string",
					"enum":        []string{"COMMENT", "REQUEST_CHANGES", "APPROVE"},
					"description": "Review event type based on severity of findings",
				},
			},
			"required": []string{"comment", "event"},
		},
	},
	{
		Name:        "report_issues",
		Description: "Stores the structured list of issues found in this PR. Call this with all identified bugs, security issues, and code quality problems.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"summary": map[string]interface{}{
					"type":        "string",
					"description": "A 2-3 sentence executive summary of the PR quality",
				},
				"severity": map[string]interface{}{
					"type":        "string",
					"enum":        []string{"none", "info", "warning", "critical"},
					"description": "Overall PR severity based on worst issue found",
				},
				"issues": map[string]interface{}{
					"type": "array",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"file_path":   map[string]interface{}{"type": "string"},
							"line_start":  map[string]interface{}{"type": "integer"},
							"line_end":    map[string]interface{}{"type": "integer"},
							"severity":    map[string]interface{}{"type": "string", "enum": []string{"info", "warning", "critical"}},
							"category":    map[string]interface{}{"type": "string", "enum": []string{"bug", "security", "performance", "style", "logic"}},
							"title":       map[string]interface{}{"type": "string"},
							"description": map[string]interface{}{"type": "string"},
							"suggestion":  map[string]interface{}{"type": "string"},
						},
						"required": []string{"file_path", "severity", "category", "title", "description"},
					},
				},
			},
			"required": []string{"summary", "severity", "issues"},
		},
	},
}

// ─── Agent loop ───────────────────────────────────────────────────────────────

// ReviewPR runs the agentic tool-use loop for a single PR.
func (a *Agent) ReviewPR(ctx context.Context, req ReviewRequest) (*ReviewResult, error) {
	result := &ReviewResult{
		Severity: "none",
		AgentLog: []db.AgentLogEntry{},
	}

	owner, repo, err := gh.ParseParts(req.RepoFullName)
	if err != nil {
		return nil, err
	}

	messages := []claudeMessage{
		{
			Role: "user",
			Content: []contentPart{{
				Type: "text",
				Text: fmt.Sprintf(
					"You are CodePilot, an expert AI code reviewer. Your job is to thoroughly review PR #%d in the repository %s.\n\n"+
						"Follow this process:\n"+
						"1. Call `read_pr_diff` to fetch the code changes\n"+
						"2. Analyze the diff carefully for: bugs, security vulnerabilities, performance issues, logic errors, and code quality problems\n"+
						"3. Call `report_issues` with your structured findings (even if there are no issues — report an empty array with a summary)\n"+
						"4. Call `post_github_comment` with a well-formatted markdown summary for the PR author\n\n"+
						"Be thorough but pragmatic. Flag real issues, not style nitpicks.",
					req.PRNumber, req.RepoFullName,
				),
			}},
		},
	}

	systemPrompt := "You are CodePilot, an autonomous AI code reviewer integrated with GitHub. " +
		"You have access to tools to read PR diffs, analyze code, and post structured review comments. " +
		"Always use all three tools: read_pr_diff → report_issues → post_github_comment. " +
		"Be precise, technical, and actionable in your feedback."

	a.logAction(result, "agent_start", fmt.Sprintf("Starting review for %s PR#%d", req.RepoFullName, req.PRNumber))

	// Agentic loop — max 10 turns to prevent runaway
	for turn := 0; turn < 10; turn++ {
		resp, err := a.callClaude(ctx, systemPrompt, messages)
		if err != nil {
			return nil, fmt.Errorf("claude API error on turn %d: %w", turn, err)
		}

		// Build assistant message from response content
		assistantContent := resp.Content
		messages = append(messages, claudeMessage{
			Role:    "assistant",
			Content: assistantContent,
		})

		// Process tool calls
		toolResults := []contentPart{}
		hasToolUse := false

		for _, part := range resp.Content {
			if part.Type != "tool_use" {
				continue
			}
			hasToolUse = true

			a.logAction(result, "tool_call", fmt.Sprintf("→ %s", part.Name))

			toolResult, err := a.executeTool(ctx, part.Name, part.Input, part.ID,
				owner, repo, req, result)
			if err != nil {
				log.Printf("Tool %s error: %v", part.Name, err)
				toolResult = contentPart{
					Type:      "tool_result",
					ToolUseID: part.ID,
					Content:   fmt.Sprintf("Error: %v", err),
				}
			}
			toolResults = append(toolResults, toolResult)
		}

		if !hasToolUse || resp.StopReason == "end_turn" {
			a.logAction(result, "agent_done", fmt.Sprintf("Completed with severity=%s", result.Severity))
			break
		}

		// Return tool results to Claude
		messages = append(messages, claudeMessage{
			Role:    "user",
			Content: toolResults,
		})
	}

	// Persist agent log and final status
	logJSON := marshalAgentLog(result.AgentLog)
	err = a.db.UpdateReviewStatus(
		req.ReviewID,
		"done",
		result.Severity,
		result.Summary,
		len(result.Issues),
		logJSON,
	)
	if err != nil {
		log.Printf("Failed to update review status: %v", err)
	}

	if len(result.Issues) > 0 {
		if err := a.db.InsertIssues(req.ReviewID, result.Issues); err != nil {
			log.Printf("Failed to insert issues: %v", err)
		}
	}

	return result, nil
}

// ─── Tool executor ────────────────────────────────────────────────────────────

func (a *Agent) executeTool(ctx context.Context, toolName string, input interface{},
	toolUseID string, owner, repo string, req ReviewRequest, result *ReviewResult,
) (contentPart, error) {
	switch toolName {

	case "read_pr_diff":
		diff, err := a.ghClient.FetchDiff(req.DiffURL)
		if err != nil {
			return contentPart{}, err
		}
		// Truncate very large diffs
		if len(diff) > 100_000 {
			diff = diff[:100_000] + "\n\n[Diff truncated — too large]"
		}
		a.logAction(result, "diff_fetched", fmt.Sprintf("Fetched %d bytes of diff", len(diff)))
		return contentPart{
			Type:      "tool_result",
			ToolUseID: toolUseID,
			Content:   diff,
		}, nil

	case "report_issues":
		data := toMap(input)
		result.Summary = getString(data, "summary")
		result.Severity = getString(data, "severity")

		if issuesRaw, ok := data["issues"].([]interface{}); ok {
			for _, raw := range issuesRaw {
				issMap := toMap(raw)
				iss := db.ReviewIssue{
					ReviewID:    req.ReviewID,
					FilePath:    getString(issMap, "file_path"),
					Severity:    getString(issMap, "severity"),
					Category:    getString(issMap, "category"),
					Title:       getString(issMap, "title"),
					Description: getString(issMap, "description"),
					Suggestion:  getString(issMap, "suggestion"),
					LineStart:   getInt(issMap, "line_start"),
					LineEnd:     getInt(issMap, "line_end"),
				}
				result.Issues = append(result.Issues, iss)
			}
		}
		a.logAction(result, "issues_reported",
			fmt.Sprintf("Severity=%s, %d issues found", result.Severity, len(result.Issues)))
		return contentPart{
			Type:      "tool_result",
			ToolUseID: toolUseID,
			Content:   fmt.Sprintf("Issues recorded: %d", len(result.Issues)),
		}, nil

	case "post_github_comment":
		data := toMap(input)
		comment := getString(data, "comment")
		event := getString(data, "event")

		if a.ghClient != nil && os.Getenv("GITHUB_TOKEN") != "" {
			if err := a.ghClient.PostReviewRequest(owner, repo, req.PRNumber, event, comment); err != nil {
				a.logAction(result, "comment_failed", err.Error())
				return contentPart{
					Type:      "tool_result",
					ToolUseID: toolUseID,
					Content:   "Failed to post comment: " + err.Error(),
				}, nil
			}
		}
		a.logAction(result, "comment_posted",
			fmt.Sprintf("Posted %s review to GitHub", event))
		return contentPart{
			Type:      "tool_result",
			ToolUseID: toolUseID,
			Content:   "Comment posted successfully",
		}, nil
	}

	return contentPart{}, fmt.Errorf("unknown tool: %s", toolName)
}

// ─── Claude API call ──────────────────────────────────────────────────────────

func (a *Agent) callClaude(ctx context.Context, system string, messages []claudeMessage) (*claudeResponse, error) {
	reqBody := claudeRequest{
		Model:     "claude-opus-4-6",
		MaxTokens: 4096,
		System:    system,
		Tools:     tools,
		Messages:  messages,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST",
		"https://api.anthropic.com/v1/messages",
		bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", a.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("anthropic API %d: %s", resp.StatusCode, string(body))
	}

	var claudeResp claudeResponse
	if err := json.Unmarshal(body, &claudeResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &claudeResp, nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func (a *Agent) logAction(result *ReviewResult, action, detail string) {
	log.Printf("[agent] %s: %s", action, detail)
	result.AgentLog = append(result.AgentLog, db.AgentLogEntry{
		Timestamp: time.Now().UTC(),
		Action:    action,
		Detail:    detail,
	})
}

func marshalAgentLog(log []db.AgentLogEntry) string {
	b, err := json.Marshal(log)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func toMap(v interface{}) map[string]interface{} {
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	// Try re-marshaling
	b, _ := json.Marshal(v)
	var m map[string]interface{}
	json.Unmarshal(b, &m)
	return m
}

func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return strings.TrimSpace(s)
		}
	}
	return ""
}

func getInt(m map[string]interface{}, key string) int {
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		}
	}
	return 0
}
