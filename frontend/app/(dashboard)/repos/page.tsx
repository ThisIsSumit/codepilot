'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api'
import type { ListReposResponse, ListReviewsResponse } from '@/lib/types'
import { PageHeader, EmptyState, Skeleton } from '@/components/ui/Card'

function RepoCard({ repo }: { repo: { owner: string; name: string; full_name: string; created_at: string } }) {
  const { data: reviewsData } = useSWR<ListReviewsResponse>(
    `/api/v1/reviews?limit=100`,
    swrFetcher,
    { refreshInterval: 30000 }
  )

  const repoReviews = (reviewsData?.reviews ?? []).filter(
    (r) => r.repo_full_name === repo.full_name
  )
  const critical = repoReviews.filter((r) => r.severity === 'critical').length
  const warning  = repoReviews.filter((r) => r.severity === 'warning').length
  const clean    = repoReviews.filter((r) => r.severity === 'none' && r.status === 'done').length

  const healthColor =
    critical > 0 ? 'var(--critical)'
    : warning > 0 ? 'var(--warning)'
    : repoReviews.length > 0 ? 'var(--info)'
    : 'var(--text-muted)'

  const healthLabel =
    critical > 0 ? 'CRITICAL'
    : warning > 0 ? 'WARNING'
    : repoReviews.length > 0 ? 'HEALTHY'
    : 'NO DATA'

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--border-active)'
        el.style.boxShadow = '0 0 20px var(--signal-glow)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--border)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Top bar — health color */}
      <div style={{ height: '2px', background: healthColor, opacity: 0.7 }} />

      <div style={{ padding: '20px' }}>
        {/* Repo name */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--text-muted)', marginBottom: '3px',
          }}>
            {repo.owner}/
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '14px',
            fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em',
          }}>
            {repo.name}
          </div>
        </div>

        {/* Health badge */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '2px 8px', borderRadius: '2px',
            background: `${healthColor}15`,
            border: `0.5px solid ${healthColor}40`,
            color: healthColor,
            fontFamily: 'var(--font-mono)', fontSize: '9px',
            fontWeight: 500, letterSpacing: '0.08em',
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: healthColor,
            }} />
            {healthLabel}
          </span>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          borderTop: '0.5px solid var(--border)', paddingTop: '14px', gap: '0',
        }}>
          {[
            { label: 'Total', value: repoReviews.length, color: 'var(--text-muted)' },
            { label: 'Critical', value: critical, color: critical > 0 ? 'var(--critical)' : 'var(--text-muted)' },
            { label: 'Clean', value: clean, color: clean > 0 ? 'var(--info)' : 'var(--text-muted)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 500, color }}>
                {value}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '0.08em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ReposPage() {
  const { data, isLoading, error } = useSWR<ListReposResponse>(
    '/api/v1/repos',
    swrFetcher,
    { refreshInterval: 30000 }
  )

  const repos = data?.repositories ?? []

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Repositories"
        subtitle="Connected GitHub repositories monitored by CodePilot"
      />

      <div style={{ padding: '32px' }}>
        {isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={160} />
            ))}
          </div>
        )}

        {error && (
          <EmptyState title="Connection error" description="Could not reach the CodePilot backend." />
        )}

        {!isLoading && repos.length === 0 && (
          <EmptyState
            title="No repositories connected"
            description="Install the CodePilot GitHub App on your repositories to start receiving automated PR reviews."
            icon={
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="4" width="32" height="32" rx="2" stroke="currentColor" strokeWidth="1"/>
                <path d="M12 14h16M12 20h16M12 26h10" stroke="currentColor" strokeWidth="1" strokeLinecap="square"/>
              </svg>
            }
          />
        )}

        {repos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
