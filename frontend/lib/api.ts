import type {
  AuthResponse,
  ProfileResponse,
  UpdateNotificationBody,
  UpdateProfileBody,
  ListReviewsResponse,
  ListReposResponse,
  ListIssuesResponse,
  Review,
  SignInBody,
  SignUpBody,
  Stats,
  TriggerReviewBody,
} from './types'

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:8080'

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  signIn: (body: SignInBody) =>
    fetcher<AuthResponse>('/api/v1/auth/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  signUp: (body: SignUpBody) =>
    fetcher<AuthResponse>('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  signOut: () =>
    fetcher<{ ok: boolean }>('/api/v1/auth/signout', {
      method: 'POST',
    }),

  getSession: () => fetcher<AuthResponse>('/api/v1/auth/session'),

  getProfile: () => fetcher<ProfileResponse>('/api/v1/me'),

  updateProfile: (body: UpdateProfileBody) =>
    fetcher<{ user: ProfileResponse['user'] }>('/api/v1/me', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  updateNotificationPreferences: (body: UpdateNotificationBody) =>
    fetcher<{ user: ProfileResponse['user'] }>('/api/v1/me/notifications', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  rotateApiKey: () =>
    fetcher<{ user: ProfileResponse['user'] }>('/api/v1/me/api-key/rotate', {
      method: 'POST',
    }),

  deleteAccount: (confirm: string) =>
    fetcher<{ ok: boolean }>('/api/v1/me', {
      method: 'DELETE',
      body: JSON.stringify({ confirm }),
    }),

  getStats: () => fetcher<Stats>('/api/v1/stats'),

  listReviews: (limit = 50) =>
    fetcher<ListReviewsResponse>(`/api/v1/reviews?limit=${limit}`),

  getReview: (id: number) => fetcher<Review>(`/api/v1/reviews/${id}`),

  getIssues: (id: number) =>
    fetcher<ListIssuesResponse>(`/api/v1/reviews/${id}/issues`),

  listRepos: () => fetcher<ListReposResponse>('/api/v1/repos'),

  getQueueDepth: () =>
    fetcher<{ depth: number }>('/api/v1/queue/depth'),

  triggerReview: (body: TriggerReviewBody) =>
    fetcher<{ review_id: number; status: string }>('/api/v1/reviews/trigger', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

// SWR fetcher — returns just the data (SWR passes the key as URL)
export const swrFetcher = (key: string) =>
  fetch(`${BASE}${key}`, { credentials: 'include', cache: 'no-store' }).then((r) => {
    if (!r.ok) throw new Error('fetch error')
    return r.json()
  })

export const apiBaseUrl = BASE
