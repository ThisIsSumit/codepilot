import type { Severity, ReviewStatus } from '@/lib/types'

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; color: string; bg: string }
> = {
  critical: { label: 'CRIT',    color: '#ff5f57', bg: 'rgba(255,95,87,0.12)' },
  warning:  { label: 'WARN',    color: '#ffbd2e', bg: 'rgba(255,189,46,0.12)' },
  info:     { label: 'INFO',    color: '#1afa9b', bg: 'rgba(26,250,155,0.10)' },
  none:     { label: 'CLEAN',   color: '#4a5568', bg: 'rgba(74,85,104,0.15)' },
}

const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; color: string; bg: string }
> = {
  done:       { label: 'DONE',       color: '#1afa9b', bg: 'rgba(26,250,155,0.10)' },
  processing: { label: 'RUNNING',    color: '#63d2ff', bg: 'rgba(99,210,255,0.12)' },
  pending:    { label: 'PENDING',    color: '#4a5568', bg: 'rgba(74,85,104,0.15)' },
  failed:     { label: 'FAILED',     color: '#ff5f57', bg: 'rgba(255,95,87,0.12)' },
}

interface SeverityBadgeProps {
  severity: Severity
  small?: boolean
}

export function SeverityBadge({ severity, small }: SeverityBadgeProps) {
  const cfg = SEVERITY_CONFIG[severity]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: small ? '1px 5px' : '2px 7px',
        borderRadius: '2px',
        background: cfg.bg,
        border: `0.5px solid ${cfg.color}33`,
        color: cfg.color,
        fontFamily: 'var(--font-mono)',
        fontSize: small ? '9px' : '10px',
        fontWeight: 500,
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  )
}

interface StatusBadgeProps {
  status: ReviewStatus
  small?: boolean
}

export function StatusBadge({ status, small }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status]
  const isProcessing = status === 'processing'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: small ? '1px 5px' : '2px 7px',
        borderRadius: '2px',
        background: cfg.bg,
        border: `0.5px solid ${cfg.color}33`,
        color: cfg.color,
        fontFamily: 'var(--font-mono)',
        fontSize: small ? '9px' : '10px',
        fontWeight: 500,
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}
    >
      {isProcessing && (
        <span
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: cfg.color,
          }}
          className="pulse"
        />
      )}
      {cfg.label}
    </span>
  )
}

interface CategoryBadgeProps {
  category: string
}

const CATEGORY_COLORS: Record<string, string> = {
  bug:         '#ff5f57',
  security:    '#ff7f50',
  performance: '#ffbd2e',
  logic:       '#63d2ff',
  style:       '#8b949e',
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[category] ?? '#8b949e'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 5px',
        borderRadius: '2px',
        background: `${color}18`,
        border: `0.5px solid ${color}30`,
        color,
        fontFamily: 'var(--font-mono)',
        fontSize: '9px',
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap',
      }}
    >
      {category}
    </span>
  )
}
