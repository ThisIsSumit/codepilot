'use client'

import useSWR from 'swr'
import { swrFetcher } from '@/lib/api'
import type { Stats } from '@/lib/types'
import { Skeleton } from '@/components/ui/Card'

interface KpiTileProps {
  label: string
  value: number | string
  accent?: string
  mono?: boolean
}

function KpiTile({ label, value, accent, mono }: KpiTileProps) {
  return (
    <div
      style={{
        flex: 1,
        padding: '20px 24px',
        borderRight: '0.5px solid var(--border)',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        ...(accent
          ? {
              borderBottom: `1px solid ${accent}40`,
              background: `linear-gradient(180deg, ${accent}06 0%, transparent 100%)`,
            }
          : {}),
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: accent ?? 'var(--text-muted)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono !== false ? 'var(--font-mono)' : 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 500,
          color: accent ?? 'var(--text-primary)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function StatsBar() {
  const { data, isLoading } = useSWR<Stats>('/api/v1/stats', swrFetcher, {
    refreshInterval: 8000,
  })

  const { data: qData } = useSWR<{ depth: number }>(
    '/api/v1/queue/depth',
    swrFetcher,
    { refreshInterval: 5000 }
  )

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          borderBottom: '0.5px solid var(--border)',
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, padding: '20px 24px' }}>
            <Skeleton width={60} height={10} style={{ marginBottom: '10px' }} />
            <Skeleton width={40} height={28} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex' }}>
      <KpiTile label="Total Reviews" value={data?.total_reviews ?? 0} />
      <KpiTile
        label="Completed"
        value={data?.completed ?? 0}
        accent="var(--info)"
      />
      <KpiTile
        label="Critical PRs"
        value={data?.critical_prs ?? 0}
        accent={data?.critical_prs ? 'var(--critical)' : undefined}
      />
      <KpiTile
        label="In Queue"
        value={qData?.depth ?? 0}
        accent={qData?.depth ? 'var(--signal)' : undefined}
      />
    </div>
  )
}
