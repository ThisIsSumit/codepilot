import { CSSProperties } from 'react'

interface CardProps {
  children: React.ReactNode
  style?: CSSProperties
  className?: string
  onClick?: () => void
  hoverable?: boolean
}

export function Card({ children, style, className, onClick, hoverable }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        transition: hoverable ? 'border-color 0.15s ease-out, box-shadow 0.15s ease-out' : undefined,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
      onMouseEnter={
        hoverable
          ? (e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-active)'
              el.style.boxShadow = '0 0 20px var(--signal-glow)'
            }
          : undefined
      }
      onMouseLeave={
        hoverable
          ? (e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border)'
              el.style.boxShadow = 'none'
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

interface SkeletonProps {
  width?: string | number
  height?: string | number
  style?: CSSProperties
}

export function Skeleton({ width = '100%', height = '16px', style }: SkeletonProps) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 'var(--radius)', ...style }}
    />
  )
}

export function SkeletonRow() {
  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <Skeleton width={8} height={8} style={{ borderRadius: '50%', flexShrink: 0 }} />
      <Skeleton width={140} height={12} />
      <Skeleton width={60} height={12} />
      <div style={{ flex: 1 }} />
      <Skeleton width={80} height={12} />
      <Skeleton width={50} height={20} style={{ borderRadius: '2px' }} />
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        gap: '12px',
        color: 'var(--text-muted)',
      }}
    >
      {icon && (
        <div style={{ marginBottom: '8px', opacity: 0.4 }}>{icon}</div>
      )}
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          maxWidth: '320px',
          lineHeight: 1.6,
        }}
      >
        {description}
      </div>
    </div>
  )
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        padding: '24px 32px 20px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
    </div>
  )
}
