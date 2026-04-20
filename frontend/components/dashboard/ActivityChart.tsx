'use client'

import useSWR from 'swr'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { swrFetcher } from '@/lib/api'
import type { Stats } from '@/lib/types'
import { Skeleton } from '@/components/ui/Card'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-active)',
          borderRadius: 'var(--radius)',
          padding: '8px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-primary)',
        }}
      >
        <div style={{ color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
        <div style={{ color: 'var(--signal)' }}>
          {payload[0].value} review{payload[0].value !== 1 ? 's' : ''}
        </div>
      </div>
    )
  }
  return null
}

export function ActivityChart() {
  const { data, isLoading } = useSWR<Stats>('/api/v1/stats', swrFetcher, {
    refreshInterval: 30000,
  })

  if (isLoading) {
    return <Skeleton height={140} />
  }

  const activity = data?.activity ?? []

  // Ensure 7 days of data, filling gaps with 0
  const chartData =
    activity.length > 0
      ? activity.map((d) => ({
          date: new Date(d.date).toLocaleDateString('en', {
            month: 'short',
            day: 'numeric',
          }),
          count: d.count,
        }))
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          return {
            date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
            count: 0,
          }
        })

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '9px',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}
      >
        Review Activity — Last 7 Days
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="date"
            tick={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              fill: 'var(--text-muted)',
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              fill: 'var(--text-muted)',
            }}
            axisLine={false}
            tickLine={false}
            width={24}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,210,255,0.04)' }} />
          <Bar
            dataKey="count"
            fill="rgba(99,210,255,0.55)"
            radius={[2, 2, 0, 0]}
            activeBar={{ fill: 'var(--signal)' }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
