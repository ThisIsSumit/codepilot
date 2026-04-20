'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { swrFetcher } from '@/lib/api'
import type { Review, ListReviewsResponse } from '@/lib/types'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { SkeletonRow, EmptyState } from '@/components/ui/Card'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function ReviewRow({ review }: { review: Review }) {
  const [owner, repo] = review.repo_full_name.split('/')
  return (
    <Link
      href={`/reviews/${review.id}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        className="fade-in"
        style={{
          display: 'grid',
          gridTemplateColumns: '8px 1fr auto',
          gap: '0 16px',
          padding: '14px 24px',
          borderBottom: '0.5px solid var(--border)',
          alignItems: 'center',
          transition: 'background 0.12s ease-out, border-left-color 0.12s ease-out',
          borderLeft: '2px solid transparent',
          cursor: 'pointer',
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
        {/* Status dot */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span
            className={review.status === 'processing' ? 'pulse' : undefined}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background:
                review.status === 'done'
                  ? 'var(--info)'
                  : review.status === 'processing'
                  ? 'var(--signal)'
                  : review.status === 'failed'
                  ? 'var(--critical)'
                  : 'var(--text-muted)',
              flexShrink: 0,
            }}
          />
        </div>

        {/* Main content */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '3px',
              flexWrap: 'wrap',
            }}
          >
            {/* Repo */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--signal)',
                letterSpacing: '-0.01em',
              }}
            >
              {owner}/
              <span style={{ fontWeight: 500 }}>{repo}</span>
            </span>

            {/* PR number */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}
            >
              #{review.pr_number}
            </span>

            {/* PR title */}
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '340px',
              }}
            >
              {review.pr_title}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}
            >
              @{review.pr_author}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}
            >
              ·
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
              }}
            >
              {timeAgo(review.created_at)}
            </span>
            {review.issues_count > 0 && (
              <>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                  }}
                >
                  ·
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--warning)',
                  }}
                >
                  {review.issues_count} issue{review.issues_count !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <SeverityBadge severity={review.severity} small />
          <StatusBadge status={review.status} small />
        </div>
      </div>
    </Link>
  )
}

export function ReviewFeed() {
  const { data, isLoading, error } = useSWR<ListReviewsResponse>(
    '/api/v1/reviews?limit=50',
    swrFetcher,
    { refreshInterval: 5000 }
  )

  if (isLoading) {
    return (
      <div>
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load reviews"
        description="Could not connect to the CodePilot backend. Make sure the Go server is running."
      />
    )
  }

  const reviews = data?.reviews ?? []

  if (reviews.length === 0) {
    return (
      <EmptyState
        title="No reviews yet"
        description="Connect a GitHub repository and open a pull request to trigger your first AI review."
        icon={
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1"/>
            <path d="M13 20l5 5 10-10" stroke="currentColor" strokeWidth="1" strokeLinecap="square"/>
          </svg>
        }
      />
    )
  }

  return (
    <div>
      {reviews.map((review) => (
        <ReviewRow key={review.id} review={review} />
      ))}
    </div>
  )
}
