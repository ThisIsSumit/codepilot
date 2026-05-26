package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	openrouter "github.com/OpenRouterTeam/go-sdk"
	"github.com/OpenRouterTeam/go-sdk/models/components"
	"github.com/OpenRouterTeam/go-sdk/models/operations"
	"github.com/OpenRouterTeam/go-sdk/optionalnullable"
	"github.com/codepilot/backend/internal/db"
	gh "github.com/codepilot/backend/internal/github"
)

// Agent coordinates the PR review workflow.
type Agent struct {
	db         *db.DB
	ghClient   *gh.Client
	httpClient *http.Client
	orClient   *openrouter.OpenRouter
	model      string
}

// ReviewRequest identifies a review job.
type ReviewRequest struct {
	ReviewID     int
	RepoFullName string
	PRNumber     int
	DiffURL      string
	InstallID    int64
}

// ReviewResult captures the review output.
type ReviewResult struct {
	Severity string
	Summary  string
	Issues   []db.ReviewIssue
	AgentLog []db.AgentLogEntry
}

type reportIssuesPayload struct {
	Summary  string `json:"summary"`
	Severity string `json:"severity"`
	Issues   []struct {
		FilePath    string `json:"file_path"`
		LineStart   int    `json:"line_start"`
		LineEnd     int    `json:"line_end"`
		Severity    string `json:"severity"`
		Category    string `json:"category"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Suggestion  string `json:"suggestion"`
	} `json:"issues"`
}

// New wires the agent dependencies.
func New(database *db.DB) *Agent {
	ghToken := strings.TrimSpace(os.Getenv("GITHUB_TOKEN"))
	model := strings.TrimSpace(os.Getenv("OPENROUTER_MODEL"))
	if model == "" {
		model = "openai/gpt-4o-mini"
	}

	return &Agent{
		db:         database,
		ghClient:   gh.NewClient(ghToken),
		httpClient: &http.Client{Timeout: 120 * time.Second},
		orClient: openrouter.New(
			openrouter.WithServerURL("https://openrouter.ai/api/v1"),
			openrouter.WithSecurity(strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY"))),
			openrouter.WithClient(&http.Client{Timeout: 120 * time.Second}),
		),
		model: model,
	}
}

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

	userPrompt := fmt.Sprintf(
		"You are CodePilot, an expert AI code reviewer. Your job is to thoroughly review PR #%d in the repository %s.\n\n"+
			"Follow this process:\n"+
			"1. Call read_pr_diff to fetch the code changes\n"+
			"2. Analyze the diff carefully for bugs, security vulnerabilities, performance issues, logic errors, and code quality problems\n"+
			"3. Call report_issues with structured findings, even if there are no issues\n"+
			"4. Call post_github_comment with a well-formatted markdown summary for the PR author\n\n"+
			"Be thorough but pragmatic. Flag real issues, not style nitpicks.",
		req.PRNumber,
		req.RepoFullName,
	)

	messages := []components.ChatMessages{
		components.CreateChatMessagesSystem(components.ChatSystemMessage{
			Content: components.CreateChatSystemMessageContentStr(
				"You are CodePilot, an autonomous AI code reviewer integrated with GitHub. You have access to tools to read PR diffs, analyze code, and post structured review comments. Always use all three tools: read_pr_diff -> report_issues -> post_github_comment. Be precise, technical, and actionable in your feedback.",
			),
			Role: components.ChatSystemMessageRoleSystem,
		}),
		components.CreateChatMessagesUser(components.ChatUserMessage{
			Content: components.CreateChatUserMessageContentStr(userPrompt),
			Role:    components.ChatUserMessageRoleUser,
		}),
	}

	a.logAction(result, "agent_start", fmt.Sprintf("Starting review for %s PR#%d", req.RepoFullName, req.PRNumber))
	needReport := true
	needComment := true

	for turn := 0; turn < 10; turn++ {
		resp, err := a.callOpenRouter(ctx, messages)
		if err != nil {
			return nil, fmt.Errorf("openrouter API error on turn %d: %w", turn, err)
		}

		if len(resp.ChatResult.Choices) == 0 {
			return nil, fmt.Errorf("openrouter returned no choices on turn %d", turn)
		}

		assistantMessage := resp.ChatResult.Choices[0].Message
		messages = append(messages, components.CreateChatMessagesAssistant(assistantMessage))

		if len(assistantMessage.ToolCalls) == 0 {
			if needReport || needComment {
				messages = append(messages, components.CreateChatMessagesUser(components.ChatUserMessage{
					Role: components.ChatUserMessageRoleUser,
					Content: components.CreateChatUserMessageContentStr(
						"You have not finished the review. You must always call report_issues with a structured summary, even when no issues are found. If report_issues is already done, call post_github_comment before finishing. Do not end the turn until both the structured report and the GitHub review comment have been produced.",
					),
				}))
				continue
			}

			a.logAction(result, "agent_done", fmt.Sprintf("Completed with severity=%s", result.Severity))
			break
		}

		for _, call := range assistantMessage.ToolCalls {
			a.logAction(result, "tool_call", fmt.Sprintf("→ %s", call.Function.Name))

			toolResult, err := a.executeTool(ctx, call.Function.Name, call.Function.Arguments, owner, repo, req, result)
			if err != nil {
				log.Printf("Tool %s error: %v", call.Function.Name, err)
				toolResult = fmt.Sprintf("Error: %v", err)
			}

			switch call.Function.Name {
			case "report_issues":
				needReport = false
			case "post_github_comment":
				needComment = false
			}

			messages = append(messages, components.CreateChatMessagesTool(components.ChatToolMessage{
				Role:       components.ChatToolMessageRoleTool,
				ToolCallID: call.ID,
				Content:    components.CreateChatToolMessageContentStr(toolResult),
			}))
		}
	}

	if result.Summary == "" {
		if len(result.Issues) == 0 {
			result.Summary = "Automated review completed. No blocking issues were found, but the PR was still analyzed for bugs, security problems, logic errors, performance risks, and code quality concerns."
		} else {
			result.Summary = fmt.Sprintf("Automated review completed with %d issue(s) found.", len(result.Issues))
		}
	}

	logJSON := marshalAgentLog(result.AgentLog)
	if err := a.db.UpdateReviewStatus(req.ReviewID, "done", result.Severity, result.Summary, len(result.Issues), logJSON); err != nil {
		log.Printf("Failed to update review status: %v", err)
	}

	if len(result.Issues) > 0 {
		if err := a.db.InsertIssues(req.ReviewID, result.Issues); err != nil {
			log.Printf("Failed to insert issues: %v", err)
		}
	}

	return result, nil
}

func (a *Agent) callOpenRouter(ctx context.Context, messages []components.ChatMessages) (*operations.SendChatCompletionRequestResponse, error) {
	if a.orClient == nil {
		return nil, fmt.Errorf("openrouter client is not configured")
	}

	res, err := a.orClient.Chat.Send(ctx, components.ChatRequest{
		Model:             openrouter.Pointer(a.model),
		Messages:          messages,
		MaxTokens:         optionalnullable.From(openrouter.Pointer[int64](4096)),
		Temperature:       optionalnullable.From(openrouter.Pointer[float64](0)),
		ParallelToolCalls: optionalnullable.From(openrouter.Pointer(false)),
		Tools:             openRouterTools(),
	})
	if err != nil {
		return nil, err
	}
	if res.Type != operations.SendChatCompletionRequestResponseTypeChatResult {
		return nil, fmt.Errorf("unexpected openrouter response type: %s", res.Type)
	}
	return res, nil
}

func openRouterTools() []components.ChatFunctionTool {
	return []components.ChatFunctionTool{
		components.CreateChatFunctionToolChatFunctionToolFunction(components.ChatFunctionToolFunction{
			Type: components.ChatFunctionToolTypeFunction,
			Function: components.ChatFunctionToolFunctionFunction{
				Name:        "read_pr_diff",
				Description: openrouter.Pointer("Fetches the raw unified diff for the PR. Returns the full git diff showing all added/removed lines across all changed files."),
				Parameters:  objectSchema(nil, nil),
				Strict:      optionalnullable.From(openrouter.Pointer(true)),
			},
		}),
		components.CreateChatFunctionToolChatFunctionToolFunction(components.ChatFunctionToolFunction{
			Type: components.ChatFunctionToolTypeFunction,
			Function: components.ChatFunctionToolFunctionFunction{
				Name:        "post_github_comment",
				Description: openrouter.Pointer("Posts a formatted review comment on the GitHub PR. Use this after completing your analysis to share findings with the team."),
				Parameters: objectSchema(map[string]any{
					"comment": map[string]any{
						"type":        "string",
						"description": "The markdown-formatted review comment to post",
					},
					"event": map[string]any{
						"type":        "string",
						"description": "Review event type based on severity of findings",
						"enum":        []string{"COMMENT", "REQUEST_CHANGES", "APPROVE"},
					},
				}, []string{"comment", "event"}),
				Strict: optionalnullable.From(openrouter.Pointer(true)),
			},
		}),
		components.CreateChatFunctionToolChatFunctionToolFunction(components.ChatFunctionToolFunction{
			Type: components.ChatFunctionToolTypeFunction,
			Function: components.ChatFunctionToolFunctionFunction{
				Name:        "report_issues",
				Description: openrouter.Pointer("Stores the structured list of issues found in this PR. Call this with all identified bugs, security issues, and code quality problems."),
				Parameters: objectSchema(map[string]any{
					"summary": map[string]any{
						"type":        "string",
						"description": "A 2-3 sentence executive summary of the PR quality",
					},
					"severity": map[string]any{
						"type":        "string",
						"description": "Overall PR severity based on worst issue found",
						"enum":        []string{"none", "info", "warning", "critical"},
					},
					"issues": map[string]any{
						"type": "array",
						"items": objectSchema(map[string]any{
							"file_path":   map[string]any{"type": "string"},
							"line_start":  map[string]any{"type": "integer"},
							"line_end":    map[string]any{"type": "integer"},
							"severity":    map[string]any{"type": "string", "enum": []string{"info", "warning", "critical"}},
							"category":    map[string]any{"type": "string", "enum": []string{"bug", "security", "performance", "style", "logic"}},
							"title":       map[string]any{"type": "string"},
							"description": map[string]any{"type": "string"},
							"suggestion":  map[string]any{"type": "string"},
						}, []string{"file_path", "severity", "category", "title", "description"}),
					},
				}, []string{"summary", "severity", "issues"}),
				Strict: optionalnullable.From(openrouter.Pointer(true)),
			},
		}),
	}
}

func objectSchema(properties map[string]any, required []string) map[string]any {
	if properties == nil {
		properties = map[string]any{}
	}
	if required == nil {
		required = []string{}
	}
	return map[string]any{
		"type":                 "object",
		"additionalProperties": false,
		"properties":           properties,
		"required":             required,
	}
}

func (a *Agent) executeTool(ctx context.Context, toolName string, input string, owner, repo string, req ReviewRequest, result *ReviewResult) (string, error) {
	_ = ctx

	switch toolName {
	case "read_pr_diff":
		diff, err := a.ghClient.FetchDiff(req.DiffURL)
		if err != nil {
			return "", err
		}
		return diff, nil

	case "report_issues":
		var payload reportIssuesPayload
		if err := json.Unmarshal([]byte(input), &payload); err != nil {
			return "", fmt.Errorf("parse report_issues payload: %w", err)
		}

		result.Severity = payload.Severity
		result.Summary = payload.Summary
		result.Issues = make([]db.ReviewIssue, 0, len(payload.Issues))
		for _, issue := range payload.Issues {
			result.Issues = append(result.Issues, db.ReviewIssue{
				FilePath:    issue.FilePath,
				LineStart:   issue.LineStart,
				LineEnd:     issue.LineEnd,
				Severity:    issue.Severity,
				Category:    issue.Category,
				Title:       issue.Title,
				Description: issue.Description,
				Suggestion:  issue.Suggestion,
			})
		}

		return fmt.Sprintf("Severity=%s, %d issues found", result.Severity, len(result.Issues)), nil

	case "post_github_comment":
		var payload struct {
			Comment string `json:"comment"`
			Event   string `json:"event"`
		}
		if err := json.Unmarshal([]byte(input), &payload); err != nil {
			return "", fmt.Errorf("parse post_github_comment payload: %w", err)
		}

		event := strings.ToUpper(strings.TrimSpace(payload.Event))
		if event == "" {
			event = "COMMENT"
		}
		if err := a.ghClient.PostReviewRequest(owner, repo, req.PRNumber, event, payload.Comment); err != nil {
			return "", err
		}
		return "Comment posted", nil

	default:
		return "", fmt.Errorf("unknown tool: %s", toolName)
	}
}

func (a *Agent) logAction(result *ReviewResult, action, detail string) {
	result.AgentLog = append(result.AgentLog, db.AgentLogEntry{
		Timestamp: time.Now().UTC(),
		Action:    action,
		Detail:    detail,
	})
}

func marshalAgentLog(logEntries []db.AgentLogEntry) string {
	if len(logEntries) == 0 {
		return "[]"
	}
	buf, err := json.Marshal(logEntries)
	if err != nil {
		return "[]"
	}
	return string(buf)
}
