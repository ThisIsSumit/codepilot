import type { ReviewIssue } from '@/lib/types'
import { SeverityBadge, CategoryBadge } from '@/components/ui/Badge'

interface IssueCardProps {
  issue: ReviewIssue
}

export function IssueCard({ issue }: IssueCardProps) {
  const hasSuggestion = issue.suggestion && issue.suggestion.trim().length > 0
  const hasLines = issue.line_start > 0

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease-out',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--border-hover)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'var(--border)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* File path + lines */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--signal)',
                letterSpacing: '-0.01em',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {issue.file_path}
            </span>
            {hasLines && (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                :{issue.line_start}
                {issue.line_end > issue.line_start ? `–${issue.line_end}` : ''}
              </span>
            )}
          </div>

          {/* Title */}
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            {issue.title}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <CategoryBadge category={issue.category} />
          <SeverityBadge severity={issue.severity} small />
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '12px 16px' }}>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {issue.description}
        </p>
      </div>

      {/* Suggestion */}
      {hasSuggestion && (
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--surface-2)',
            borderTop: '0.5px solid var(--border)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '9px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--info)',
                textTransform: 'uppercase',
              }}
            >
              Suggestion
            </span>
            <div
              style={{
                flex: 1,
                height: '0.5px',
                background: 'var(--border)',
              }}
            />
          </div>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            {issue.suggestion}
          </p>
        </div>
      )}
    </div>
  )
}
