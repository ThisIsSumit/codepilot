"use client"
import useSWR from 'swr'
import Link from 'next/link'
import { swrFetcher } from '@/lib/api'
import type { Review, ListIssuesResponse } from '@/lib/types'
import { SeverityBadge, StatusBadge } from '@/components/ui/Badge'
import { AgentLog } from '@/components/reviews/AgentLog'
import { IssueCard } from '@/components/reviews/IssueCard'
import { Skeleton, EmptyState } from '@/components/ui/Card'

interface Props {
  params: { id: string }
}

export default function ReviewDetailPage({ params }: Props) {
  const { id } = params

  const { data: review, isLoading: reviewLoading } = useSWR<Review>(
    `/api/v1/reviews/${id}`,
    swrFetcher,
    { refreshInterval: 3000 }
  )

  const { data: issuesData, isLoading: issuesLoading } =
    useSWR<ListIssuesResponse>(
      review?.status === 'done' ? `/api/v1/reviews/${id}/issues` : null,
      swrFetcher
    )

  if (reviewLoading) {
    return (
      <div style={{ padding: '32px' }}>
        <Skeleton width={200} height={16} style={{ marginBottom: '16px' }} />
        <Skeleton width="100%" height={80} />
      </div>
    )
  }

  if (!review) {
    return (
      <EmptyState
        title="Review not found"
        description="This review may have been deleted or never existed."
      />
    )
  }

  const issues = issuesData?.issues ?? []

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <div
        style={{
          padding: '24px 32px',
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
          }}
        >
          <Link
            href="/reviews"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
            }}
          >
            reviews
          </Link>
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>/</span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--signal)',
            }}
          >
            review #{review.id}
          </span>
        </div>

        {/* PR info */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--signal)',
                }}
              >
                {review.repo_full_name}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                PR #{review.pr_number}
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '8px',
              }}
            >
              {review.pr_title}
            </h1>
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
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                @{review.pr_author}
              </span>
              {review.pr_url && (
                <a
                  href={review.pr_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--signal)',
                    textDecoration: 'none',
                    opacity: 0.7,
                  }}
                >
                  ↗ View on GitHub
                </a>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SeverityBadge severity={review.severity} />
            <StatusBadge status={review.status} />
          </div>
        </div>

        {/* Summary */}
        {review.summary && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'var(--surface-2)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
            }}
          >
            {review.summary}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        {/* Issues */}
        <div style={{ borderRight: '0.5px solid var(--border)', padding: '24px 32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Issues Found
            </span>
            {!issuesLoading && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                }}
              >
                {issues.length} total
              </span>
            )}
          </div>

          {issuesLoading && review.status === 'done' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={100} />
              ))}
            </div>
          ) : issues.length === 0 ? (
            <EmptyState
              title={review.status === 'done' ? 'No issues found' : 'Analysis in progress'}
              description={
                review.status === 'done'
                  ? 'This PR looks clean — no bugs, security issues, or code quality problems were detected.'
                  : 'The AI agent is currently reviewing this PR. Check back in a moment.'
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>

        {/* Agent log */}
        <div>
          <div
            style={{
              padding: '16px 24px',
              borderBottom: '0.5px solid var(--border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Agent Decision Log
            </span>
          </div>
          <AgentLog entries={review.agent_log ?? []} />
        </div>
      </div>
    </div>
  )
}
