export type Severity = 'none' | 'info' | 'warning' | 'critical'
export type ReviewStatus = 'pending' | 'processing' | 'done' | 'failed'
export type IssueCategory = 'bug' | 'security' | 'performance' | 'style' | 'logic'

export interface Repository {
  id: number
  owner: string
  name: string
  full_name: string
  install_id: number
  active: boolean
  created_at: string
}

export interface AgentLogEntry {
  ts: string
  action: string
  detail: string
}

export interface Review {
  id: number
  repo_full_name: string
  pr_number: number
  pr_title: string
  pr_author: string
  pr_url: string
  status: ReviewStatus
  severity: Severity
  summary: string
  issues_count: number
  agent_log: AgentLogEntry[]
  created_at: string
  updated_at: string
}

export interface ReviewIssue {
  id: number
  review_id: number
  file_path: string
  line_start: number
  line_end: number
  severity: Severity
  category: IssueCategory
  title: string
  description: string
  suggestion: string
}

export interface Stats {
  total_reviews: number
  completed: number
  failed: number
  critical_prs: number
  severity_breakdown: Record<Severity, number>
  activity: { date: string; count: number }[]
}

export interface TriggerReviewBody {
  repo_full_name: string
  pr_number: number
  pr_title?: string
  pr_author?: string
  pr_url?: string
  diff_url?: string
}

export interface ListReviewsResponse {
  reviews: Review[]
  count: number
}

export interface ListReposResponse {
  repositories: Repository[]
  count: number
}

export interface ListIssuesResponse {
  issues: ReviewIssue[]
  count: number
}

export interface AuthUser {
  id: string | number
  name: string
  email: string
  github_username?: string
  avatar_url?: string
  plan?: string
}

export interface SignInBody {
  email: string
  password: string
}

export interface SignUpBody {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  user: AuthUser
  token?: string
  expires_at?: string
}

export interface ProfileUser {
  id: number
  name: string
  email: string
  github_username: string
  avatar_url: string
  plan: string
  api_key: string
  notification_email: boolean
  notification_slack: boolean
  notification_weekly_digest: boolean
  joined_at: string
}

export interface ProfileStats {
  reviews_total: number
  repos_connected: number
  completed: number
  failed: number
  critical_prs: number
}

export interface ProfileResponse {
  user: ProfileUser
  stats: ProfileStats
}

export interface UpdateProfileBody {
  name: string
  email: string
  github_username: string
  avatar_url: string
}

export interface UpdateNotificationBody {
  email_enabled: boolean
  slack_enabled: boolean
  digest_enabled: boolean
}
