package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

// DB wraps sql.DB with domain methods.
type DB struct {
	*sql.DB
}

func New(dsn string) (*DB, error) {
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/codepilot?sslmode=disable"
	}
	sqlDB, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}
	return &DB{sqlDB}, nil
}

func (d *DB) Migrate() error {
	if _, err := d.Exec(schema); err != nil {
		return err
	}
	for _, stmt := range []string{
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'Pro'`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_email BOOLEAN NOT NULL DEFAULT true`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_slack BOOLEAN NOT NULL DEFAULT false`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_weekly_digest BOOLEAN NOT NULL DEFAULT true`,
	} {
		if _, err := d.Exec(stmt); err != nil {
			return err
		}
	}
	return nil
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
	id            SERIAL PRIMARY KEY,
	name          TEXT NOT NULL,
	email         TEXT NOT NULL UNIQUE,
	github_username TEXT NOT NULL DEFAULT '',
	avatar_url    TEXT NOT NULL DEFAULT '',
	plan          TEXT NOT NULL DEFAULT 'Pro',
	api_key       TEXT NOT NULL DEFAULT '',
	notification_email BOOLEAN NOT NULL DEFAULT true,
	notification_slack BOOLEAN NOT NULL DEFAULT false,
	notification_weekly_digest BOOLEAN NOT NULL DEFAULT true,
	password_hash TEXT NOT NULL,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS repositories (
	id          SERIAL PRIMARY KEY,
	owner       TEXT NOT NULL,
	name        TEXT NOT NULL,
	full_name   TEXT NOT NULL UNIQUE,
	install_id  BIGINT NOT NULL DEFAULT 0,
	active      BOOLEAN NOT NULL DEFAULT true,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
	id            SERIAL PRIMARY KEY,
	repo_full_name TEXT NOT NULL,
	pr_number     INT NOT NULL,
	pr_title      TEXT NOT NULL,
	pr_author     TEXT NOT NULL,
	pr_url        TEXT NOT NULL,
	status        TEXT NOT NULL DEFAULT 'pending',   -- pending|processing|done|failed
	severity      TEXT NOT NULL DEFAULT 'none',       -- none|info|warning|critical
	summary       TEXT,
	issues_count  INT NOT NULL DEFAULT 0,
	agent_log     JSONB NOT NULL DEFAULT '[]',
	created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE(repo_full_name, pr_number)
);

CREATE TABLE IF NOT EXISTS review_issues (
	id          SERIAL PRIMARY KEY,
	review_id   INT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
	file_path   TEXT NOT NULL,
	line_start  INT,
	line_end    INT,
	severity    TEXT NOT NULL,   -- info|warning|critical
	category    TEXT NOT NULL,   -- bug|security|style|performance|logic
	title       TEXT NOT NULL,
	description TEXT NOT NULL,
	suggestion  TEXT,
	created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_repo ON reviews(repo_full_name);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_review_issues_review ON review_issues(review_id);
`

// ─── Users ───────────────────────────────────────────────────────────────────

type User struct {
	ID                       int       `json:"id"`
	Name                     string    `json:"name"`
	Email                    string    `json:"email"`
	GitHubUsername           string    `json:"github_username"`
	AvatarURL                string    `json:"avatar_url"`
	Plan                     string    `json:"plan"`
	APIKey                   string    `json:"api_key"`
	NotificationEmail        bool      `json:"notification_email"`
	NotificationSlack        bool      `json:"notification_slack"`
	NotificationWeeklyDigest bool      `json:"notification_weekly_digest"`
	PasswordHash             string    `json:"-"`
	CreatedAt                time.Time `json:"created_at"`
}

func (d *DB) CreateUser(name, email, passwordHash string) (*User, error) {
	row := d.QueryRow(`
		INSERT INTO users (name, email, github_username, avatar_url, plan, api_key,
			notification_email, notification_slack, notification_weekly_digest, password_hash)
		VALUES ($1, $2, '', '', 'Pro', '', true, false, true, $3)
		RETURNING id, name, email, github_username, avatar_url, plan, api_key,
			notification_email, notification_slack, notification_weekly_digest, password_hash, created_at
	`, name, email, passwordHash)

	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
		&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) GetUserByEmail(email string) (*User, error) {
	row := d.QueryRow(`
		SELECT id, name, email, github_username, avatar_url, plan, api_key,
		       notification_email, notification_slack, notification_weekly_digest,
		       password_hash, created_at
		FROM users WHERE email = $1
	`, email)

	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
		&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) GetUserByID(id int) (*User, error) {
	row := d.QueryRow(`
		SELECT id, name, email, github_username, avatar_url, plan, api_key,
		       notification_email, notification_slack, notification_weekly_digest,
		       password_hash, created_at
		FROM users WHERE id = $1
	`, id)

	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
		&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) ListUsers() ([]User, error) {
	rows, err := d.Query(`
		SELECT id, name, email, github_username, avatar_url, plan, api_key,
		       notification_email, notification_slack, notification_weekly_digest,
		       password_hash, created_at
		FROM users ORDER BY created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]User, 0)
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
			&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
			&u.PasswordHash, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// UpsertUserFromGitHub inserts or updates a user based on their email from GitHub OAuth.
func (d *DB) UpsertUserFromGitHub(name, email, githubUsername, avatarURL string) (*User, error) {
	row := d.QueryRow(`
		INSERT INTO users (name, email, github_username, avatar_url, plan, api_key,
			notification_email, notification_slack, notification_weekly_digest, password_hash)
		VALUES ($1, $2, $3, $4, 'Pro', '', true, false, true, '')
		ON CONFLICT (email) DO UPDATE
		  SET name = EXCLUDED.name,
			  github_username = EXCLUDED.github_username,
			  avatar_url = EXCLUDED.avatar_url,
			  updated_at = NOW()
		RETURNING id, name, email, github_username, avatar_url, plan, api_key,
			notification_email, notification_slack, notification_weekly_digest, password_hash, created_at
	`, name, email, githubUsername, avatarURL)

	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
		&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) UpdateUserProfile(id int, name, email, githubUsername, avatarURL string) (*User, error) {
	row := d.QueryRow(`
		UPDATE users
		SET name = $2,
		    email = $3,
		    github_username = $4,
		    avatar_url = $5,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, email, github_username, avatar_url, plan, api_key,
		          notification_email, notification_slack, notification_weekly_digest,
		          password_hash, created_at
	`, id, name, email, githubUsername, avatarURL)

	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
		&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) UpdateUserNotifications(id int, emailEnabled, slackEnabled, digestEnabled bool) (*User, error) {
	row := d.QueryRow(`
		UPDATE users
		SET notification_email = $2,
		    notification_slack = $3,
		    notification_weekly_digest = $4,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, email, github_username, avatar_url, plan, api_key,
		          notification_email, notification_slack, notification_weekly_digest,
		          password_hash, created_at
	`, id, emailEnabled, slackEnabled, digestEnabled)

	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
		&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) RotateUserAPIKey(id int, apiKey string) (*User, error) {
	row := d.QueryRow(`
		UPDATE users
		SET api_key = $2,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, email, github_username, avatar_url, plan, api_key,
		          notification_email, notification_slack, notification_weekly_digest,
		          password_hash, created_at
	`, id, apiKey)

	var u User
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.GitHubUsername, &u.AvatarURL, &u.Plan,
		&u.APIKey, &u.NotificationEmail, &u.NotificationSlack, &u.NotificationWeeklyDigest,
		&u.PasswordHash, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (d *DB) DeleteUser(id int) error {
	_, err := d.Exec(`DELETE FROM users WHERE id = $1`, id)
	return err
}

func IsUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	pqErr, ok := err.(*pq.Error)
	if !ok {
		return false
	}
	return pqErr.Code == "23505"
}

// ─── Repository ─────────────────────────────────────────────────────────────

type Repository struct {
	ID        int       `json:"id"`
	Owner     string    `json:"owner"`
	Name      string    `json:"name"`
	FullName  string    `json:"full_name"`
	InstallID int64     `json:"install_id"`
	Active    bool      `json:"active"`
	CreatedAt time.Time `json:"created_at"`
}

func (d *DB) UpsertRepository(owner, name string, installID int64) (*Repository, error) {
	row := d.QueryRow(`
		INSERT INTO repositories (owner, name, full_name, install_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (full_name) DO UPDATE
		  SET install_id = EXCLUDED.install_id,
		      updated_at = NOW()
		RETURNING id, owner, name, full_name, install_id, active, created_at
	`, owner, name, owner+"/"+name, installID)

	var r Repository
	err := row.Scan(&r.ID, &r.Owner, &r.Name, &r.FullName, &r.InstallID, &r.Active, &r.CreatedAt)
	return &r, err
}

func (d *DB) ListRepositories() ([]Repository, error) {
	rows, err := d.Query(`
		SELECT id, owner, name, full_name, install_id, active, created_at
		FROM repositories WHERE active = true ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var repos []Repository
	for rows.Next() {
		var r Repository
		if err := rows.Scan(&r.ID, &r.Owner, &r.Name, &r.FullName, &r.InstallID, &r.Active, &r.CreatedAt); err != nil {
			return nil, err
		}
		repos = append(repos, r)
	}
	return repos, rows.Err()
}

// ─── Review ──────────────────────────────────────────────────────────────────

type Review struct {
	ID           int             `json:"id"`
	RepoFullName string          `json:"repo_full_name"`
	PRNumber     int             `json:"pr_number"`
	PRTitle      string          `json:"pr_title"`
	PRAuthor     string          `json:"pr_author"`
	PRUrl        string          `json:"pr_url"`
	Status       string          `json:"status"`
	Severity     string          `json:"severity"`
	Summary      string          `json:"summary"`
	IssuesCount  int             `json:"issues_count"`
	AgentLog     []AgentLogEntry `json:"agent_log"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

type AgentLogEntry struct {
	Timestamp time.Time `json:"ts"`
	Action    string    `json:"action"`
	Detail    string    `json:"detail"`
}

func (d *DB) UpsertReview(r *Review) (*Review, error) {
	logJSON := "[]"
	row := d.QueryRow(`
		INSERT INTO reviews (repo_full_name, pr_number, pr_title, pr_author, pr_url, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		ON CONFLICT (repo_full_name, pr_number) DO UPDATE
		  SET pr_title = EXCLUDED.pr_title,
		      status   = 'pending',
		      updated_at = NOW()
		RETURNING id, repo_full_name, pr_number, pr_title, pr_author, pr_url,
		          status, severity, COALESCE(summary,''), issues_count, agent_log::text, created_at, updated_at
	`, r.RepoFullName, r.PRNumber, r.PRTitle, r.PRAuthor, r.PRUrl)

	return scanReview(row, logJSON)
}

func (d *DB) UpdateReviewStatus(id int, status, severity, summary string, issuesCount int, agentLog string) error {
	_, err := d.Exec(`
		UPDATE reviews SET status=$2, severity=$3, summary=$4, issues_count=$5,
		       agent_log=$6::jsonb, updated_at=NOW()
		WHERE id=$1
	`, id, status, severity, summary, issuesCount, agentLog)
	return err
}

func (d *DB) ListReviews(limit int) ([]Review, error) {
	rows, err := d.Query(`
		SELECT id, repo_full_name, pr_number, pr_title, pr_author, pr_url,
		       status, severity, COALESCE(summary,''), issues_count, agent_log::text, created_at, updated_at
		FROM reviews ORDER BY created_at DESC LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var r Review
		var logStr string
		err := rows.Scan(&r.ID, &r.RepoFullName, &r.PRNumber, &r.PRTitle, &r.PRAuthor,
			&r.PRUrl, &r.Status, &r.Severity, &r.Summary, &r.IssuesCount, &logStr,
			&r.CreatedAt, &r.UpdatedAt)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, r)
	}
	return reviews, rows.Err()
}

func (d *DB) ListFailedReviews(limit int) ([]Review, error) {
	rows, err := d.Query(`
		SELECT id, repo_full_name, pr_number, pr_title, pr_author, pr_url,
		       status, severity, COALESCE(summary,''), issues_count, agent_log::text, created_at, updated_at
		FROM reviews
		WHERE status = 'failed'
		ORDER BY updated_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []Review
	for rows.Next() {
		var r Review
		var logStr string
		err := rows.Scan(&r.ID, &r.RepoFullName, &r.PRNumber, &r.PRTitle, &r.PRAuthor,
			&r.PRUrl, &r.Status, &r.Severity, &r.Summary, &r.IssuesCount, &logStr,
			&r.CreatedAt, &r.UpdatedAt)
		if err != nil {
			return nil, err
		}
		r.AgentLog = parseAgentLog(logStr)
		reviews = append(reviews, r)
	}
	return reviews, rows.Err()
}

func (d *DB) GetReview(id int) (*Review, error) {
	row := d.QueryRow(`
		SELECT id, repo_full_name, pr_number, pr_title, pr_author, pr_url,
		       status, severity, COALESCE(summary,''), issues_count, agent_log::text, created_at, updated_at
		FROM reviews WHERE id=$1
	`, id)
	return scanReview(row, "")
}

func (d *DB) GetStats() (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var total, done, failed, critical int
	d.QueryRow(`SELECT COUNT(*) FROM reviews`).Scan(&total)
	d.QueryRow(`SELECT COUNT(*) FROM reviews WHERE status='done'`).Scan(&done)
	d.QueryRow(`SELECT COUNT(*) FROM reviews WHERE status='failed'`).Scan(&failed)
	d.QueryRow(`SELECT COUNT(*) FROM reviews WHERE severity='critical'`).Scan(&critical)

	stats["total_reviews"] = total
	stats["completed"] = done
	stats["failed"] = failed
	stats["critical_prs"] = critical

	// Severity breakdown
	rows, err := d.Query(`
		SELECT severity, COUNT(*) FROM reviews
		WHERE status='done' GROUP BY severity
	`)
	if err == nil {
		defer rows.Close()
		breakdown := make(map[string]int)
		for rows.Next() {
			var sev string
			var cnt int
			rows.Scan(&sev, &cnt)
			breakdown[sev] = cnt
		}
		stats["severity_breakdown"] = breakdown
	}

	// Recent activity (last 7 days)
	actRows, err := d.Query(`
		SELECT DATE(created_at), COUNT(*)
		FROM reviews
		WHERE created_at > NOW() - INTERVAL '7 days'
		GROUP BY DATE(created_at)
		ORDER BY DATE(created_at)
	`)
	if err == nil {
		defer actRows.Close()
		type dataPoint struct {
			Date  string `json:"date"`
			Count int    `json:"count"`
		}
		var activity []dataPoint
		for actRows.Next() {
			var dp dataPoint
			actRows.Scan(&dp.Date, &dp.Count)
			activity = append(activity, dp)
		}
		stats["activity"] = activity
	}

	return stats, nil
}

// ─── Issues ──────────────────────────────────────────────────────────────────

type ReviewIssue struct {
	ID          int    `json:"id"`
	ReviewID    int    `json:"review_id"`
	FilePath    string `json:"file_path"`
	LineStart   int    `json:"line_start"`
	LineEnd     int    `json:"line_end"`
	Severity    string `json:"severity"`
	Category    string `json:"category"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

func (d *DB) InsertIssues(reviewID int, issues []ReviewIssue) error {
	tx, err := d.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Clear old issues for this review
	if _, err := tx.Exec(`DELETE FROM review_issues WHERE review_id=$1`, reviewID); err != nil {
		return err
	}

	for _, iss := range issues {
		_, err := tx.Exec(`
			INSERT INTO review_issues (review_id, file_path, line_start, line_end,
			                          severity, category, title, description, suggestion)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		`, reviewID, iss.FilePath, iss.LineStart, iss.LineEnd,
			iss.Severity, iss.Category, iss.Title, iss.Description, iss.Suggestion)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (d *DB) GetIssuesByReview(reviewID int) ([]ReviewIssue, error) {
	rows, err := d.Query(`
		SELECT id, review_id, file_path, COALESCE(line_start,0), COALESCE(line_end,0),
		       severity, category, title, description, COALESCE(suggestion,'')
		FROM review_issues WHERE review_id=$1 ORDER BY severity DESC, file_path
	`, reviewID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []ReviewIssue
	for rows.Next() {
		var i ReviewIssue
		if err := rows.Scan(&i.ID, &i.ReviewID, &i.FilePath, &i.LineStart, &i.LineEnd,
			&i.Severity, &i.Category, &i.Title, &i.Description, &i.Suggestion); err != nil {
			return nil, err
		}
		issues = append(issues, i)
	}
	return issues, rows.Err()
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func scanReview(row *sql.Row, _ string) (*Review, error) {
	var r Review
	var logStr string
	err := row.Scan(&r.ID, &r.RepoFullName, &r.PRNumber, &r.PRTitle, &r.PRAuthor,
		&r.PRUrl, &r.Status, &r.Severity, &r.Summary, &r.IssuesCount, &logStr,
		&r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return nil, err
	}
	r.AgentLog = parseAgentLog(logStr)
	return &r, nil
}

func parseAgentLog(logStr string) []AgentLogEntry {
	if strings.TrimSpace(logStr) == "" {
		return []AgentLogEntry{}
	}
	var entries []AgentLogEntry
	if err := json.Unmarshal([]byte(logStr), &entries); err != nil {
		return []AgentLogEntry{}
	}
	return entries
}
