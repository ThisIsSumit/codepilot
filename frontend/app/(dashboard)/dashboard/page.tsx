import { StatsBar } from '@/components/dashboard/StatsBar'
import { ReviewFeed } from '@/components/dashboard/ReviewFeed'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { PageHeader } from '@/components/ui/Card'

export default function DashboardPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Dashboard"
        subtitle="Live PR review feed — refreshes every 5 seconds"
      />

      {/* KPI strip */}
      <StatsBar />

      {/* Main content: feed + sidebar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          borderTop: '0.5px solid var(--border)',
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        {/* Review feed */}
        <div style={{ borderRight: '0.5px solid var(--border)' }}>
          <div
            style={{
              padding: '12px 24px',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
              Recent Reviews
            </span>
          </div>
          <ReviewFeed />
        </div>

        {/* Right sidebar — activity chart */}
        <div>
          <div
            style={{
              padding: '12px 24px',
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
              Analytics
            </span>
          </div>
          <div style={{ padding: '24px' }}>
            <ActivityChart />
          </div>

          {/* Severity breakdown */}
          <SeverityBreakdown />
        </div>
      </div>
    </div>
  )
}

// Inline small component — server-rendered placeholder
// The real data is fetched by StatsBar via SWR
function SeverityBreakdown() {
  return (
    <div
      style={{
        padding: '0 24px 24px',
        borderTop: '0.5px solid var(--border)',
        marginTop: '0',
      }}
    >
      <div
        style={{
          paddingTop: '20px',
          fontFamily: 'var(--font-display)',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}
      >
        Severity Breakdown
      </div>

      {[
        { label: 'Critical', color: 'var(--critical)', key: 'critical' },
        { label: 'Warning',  color: 'var(--warning)',  key: 'warning' },
        { label: 'Info',     color: 'var(--info)',     key: 'info' },
        { label: 'Clean',    color: 'var(--none)',     key: 'none' },
      ].map(({ label, color }) => (
        <div
          key={label}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '1px',
                background: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}
            >
              {label}
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            —
          </span>
        </div>
      ))}
    </div>
  )
}
