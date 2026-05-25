# CodePilot — AI Agentic Code Review & PR Intelligence Platform

> Autonomous AI agent that reviews GitHub PRs, identifies bugs, runs analysis, and posts structured comments — orchestrated with Go + Next.js.

---

## Architecture

```
GitHub Webhook → Go (Gin) → Redis Queue → Worker → Gemini Agent (Tool Use)
                                                          ↓
                                              PostgreSQL (reviews, issues)
                                                          ↓
                                              Next.js Dashboard (SWR polling)
```

### Stack

| Layer | Tech |
|---|---|
| Backend | Go 1.22, Gin, lib/pq, go-redis |
| AI Agent | Gemini 3 Flash Preview (tool use: read_pr_diff, report_issues, post_github_comment) |
| Queue | Redis (reliable BRPOPLPUSH pattern) |
| Database | PostgreSQL 16 (reviews, issues, repos) |
| Frontend | Next.js 14 App Router, Recharts, SWR |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## Local Development

### Prerequisites

- Go 1.22+
- Node.js 20+
- Docker + Docker Compose
- Gemini API key
- GitHub Personal Access Token (or GitHub App)

### 1. Start infrastructure

```bash
docker compose up postgres redis -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY, GITHUB_TOKEN, GITHUB_WEBHOOK_SECRET

go mod download
go run ./cmd/server
# → Listening on :8080
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8080

npm install
npm run dev
# → http://localhost:3000
```

### 4. Expose webhook (local dev)

Use [ngrok](https://ngrok.com) or [smee.io](https://smee.io) to forward GitHub webhooks to your local machine:

```bash
ngrok http 8080
# Copy the HTTPS URL → set as GitHub webhook URL: https://xxxx.ngrok.io/api/v1/webhooks/github
```

---

## GitHub App Setup

1. Go to GitHub → Settings → Developer Settings → GitHub Apps → New App
2. Set webhook URL: `https://your-backend.railway.app/api/v1/webhooks/github`
3. Permissions needed:
   - **Pull requests**: Read & Write
   - **Issues**: Write (for comments)
4. Subscribe to events: `pull_request`
5. Copy App ID, generate private key, set `GITHUB_WEBHOOK_SECRET`

---

## Manual Review Trigger (testing without GitHub)

```bash
curl -X POST http://localhost:8080/api/v1/reviews/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "repo_full_name": "owner/repo",
    "pr_number": 42,
    "pr_title": "Fix auth middleware",
    "pr_author": "sumit",
    "diff_url": "https://github.com/owner/repo/pull/42.diff"
  }'
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/v1/webhooks/github` | GitHub webhook receiver |
| GET | `/api/v1/reviews` | List reviews (`?limit=50`) |
| GET | `/api/v1/reviews/:id` | Get review detail |
| GET | `/api/v1/reviews/:id/issues` | Get issues for review |
| POST | `/api/v1/reviews/trigger` | Manual review trigger |
| GET | `/api/v1/repos` | List connected repos |
| GET | `/api/v1/stats` | Dashboard stats |
| GET | `/api/v1/queue/depth` | Redis queue depth |

---

## Gemini Agent Tools

The agent runs an autonomous loop with three tools:

| Tool | Description |
|---|---|
| `read_pr_diff` | Fetches raw unified diff from GitHub (up to 512KB) |
| `report_issues` | Stores structured issues: file, line, severity, category, suggestion |
| `post_github_comment` | Posts formatted review comment (APPROVE / COMMENT / REQUEST_CHANGES) |

**Severity levels**: `none` · `info` · `warning` · `critical`  
**Issue categories**: `bug` · `security` · `performance` · `logic` · `style`

---

## Deployment

### Backend → Railway

```bash
railway login
railway init
railway up --service backend
```

Set env vars in Railway dashboard: `DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY`, `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`

### Frontend → Vercel

```bash
cd frontend
vercel --prod
```

Set `NEXT_PUBLIC_API_URL` to your Railway backend URL.

### Database → Supabase (free tier)

1. Create project at supabase.com
2. Copy connection string → set as `DATABASE_URL`
3. Migrations run automatically on server start

### Redis → Upstash (free tier)

1. Create Redis database at upstash.com
2. Copy Redis URL → set as `REDIS_URL`

---

## Resume Bullets

- **Built an autonomous AI code reviewer** using Gemini tool-use (gemini-3-flash-preview) that reads PR diffs, detects bugs/security issues, and posts structured GitHub reviews with zero human intervention
- **Engineered Go webhook server** (Gin + Redis BRPOPLPUSH reliable queue) handling concurrent PR analysis workloads with graceful shutdown and context cancellation
- **Designed agentic tool-use loop** with three domain tools — diff fetcher, structured issue reporter, GitHub comment poster — demonstrating multi-step AI orchestration
- **Built real-time Next.js 14 dashboard** with App Router, SWR polling, Recharts analytics, and Stitch precision-instrument design system
- **Full CI/CD** via GitHub Actions with Go vet/test and Next.js type-check/lint; deployed on Railway + Vercel at zero cost

---

## Project Structure

```
codepilot/
├── backend/
│   ├── cmd/server/main.go          ← Entrypoint, graceful shutdown
│   ├── internal/
│   │   ├── agent/agent.go          ← Gemini tool-use loop
│   │   ├── github/github.go        ← Webhook validation, diff fetcher, comment poster
│   │   ├── queue/queue.go          ← Redis BRPOPLPUSH queue
│   │   ├── queue/worker.go         ← Background worker goroutine
│   │   ├── api/router.go           ← Gin routes + all handlers
│   │   └── db/db.go                ← PostgreSQL + auto-migration
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              ← Root layout + Sidebar
│   │   ├── dashboard/page.tsx      ← KPI strip + review feed + activity chart
│   │   ├── reviews/page.tsx        ← Full reviews table
│   │   ├── reviews/[id]/page.tsx   ← Review detail: agent log + issue cards
│   │   └── repos/page.tsx          ← Repo health grid
│   ├── components/
│   │   ├── layout/Sidebar.tsx
│   │   ├── dashboard/{StatsBar,ReviewFeed,ActivityChart}.tsx
│   │   ├── reviews/{AgentLog,IssueCard}.tsx
│   │   └── ui/{Badge,Card}.tsx
│   ├── lib/{api,types}.ts
│   ├── styles/globals.css          ← Stitch design tokens
│   └── Dockerfile
│
├── docker-compose.yml
├── .github/workflows/ci.yml
└── FRONTEND_STITCH_PROMPT.md       ← Stitch design system reference
```
