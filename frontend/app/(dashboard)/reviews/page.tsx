'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { swrFetcher } from '@/lib/api'
import type { ListReviewsResponse, ProfileResponse } from '@/lib/types'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { PageHeader, SkeletonRow, EmptyState } from '@/components/ui/Card'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function ReviewsPage() {
  const { data: profile } = useSWR<ProfileResponse>('/api/v1/me', swrFetcher)
  const { data, isLoading, error } = useSWR<ListReviewsResponse>(
    profile?.user?.id ? `/api/v1/reviews?limit=100&scope=${profile.user.id}` : null,
    swrFetcher,
    { refreshInterval: 6000 }
  )

  const reviews = data?.reviews ?? []

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="All Reviews"
        subtitle={`${data?.count ?? 0} total PR reviews`}
      />

      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '8px 1fr 80px 100px 90px 70px',
          gap: '0 16px',
          padding: '10px 24px',
          borderBottom: '0.5px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        {['', 'PULL REQUEST', 'REPO', 'AUTHOR', 'SEVERITY', 'STATUS'].map((h) => (
          <span
            key={h}
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {isLoading && Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} />)}

      {error && (
        <EmptyState
          title="Connection error"
          description="Could not reach the CodePilot backend."
        />
      )}

      {!isLoading && reviews.length === 0 && (
        <EmptyState
          title="No reviews yet"
          description="Open a pull request on a connected repository to trigger an AI review."
        />
      )}

      {reviews.map((review) => {
        const [owner, repo] = review.repo_full_name.split('/')
        return (
          <Link
            key={review.id}
            href={`/reviews/${review.id}`}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '8px 1fr 80px 100px 90px 70px',
                gap: '0 16px',
                padding: '12px 24px',
                borderBottom: '0.5px solid var(--border)',
                alignItems: 'center',
                borderLeft: '2px solid transparent',
                transition: 'background 0.12s, border-left-color 0.12s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'var(--surface-2)'
                el.style.borderLeftColor = 'var(--signal)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.background = 'transparent'
                el.style.borderLeftColor = 'transparent'
              }}
            >
              {/* Dot */}
              <span
                className={review.status === 'processing' ? 'pulse' : undefined}
                style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: review.status === 'done' ? 'var(--info)'
                    : review.status === 'processing' ? 'var(--signal)'
                    : review.status === 'failed' ? 'var(--critical)'
                    : 'var(--text-muted)',
                  display: 'inline-block',
                }}
              />

              {/* PR info */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    #{review.pr_number}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '12px',
                    color: 'var(--text-primary)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {review.pr_title}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {timeAgo(review.created_at)}
                  {review.issues_count > 0 && ` · ${review.issues_count} issues`}
                </span>
              </div>

              {/* Repo */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--signal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {owner}/<strong>{repo}</strong>
              </span>

              {/* Author */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                @{review.pr_author}
              </span>

              {/* Severity */}
              <SeverityBadge severity={review.severity} small />

              {/* Status */}
              <StatusBadge status={review.status} small />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
