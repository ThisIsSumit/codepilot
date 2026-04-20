'use client'

import type { AgentLogEntry } from '@/lib/types'

const ACTION_COLORS: Record<string, string> = {
  agent_start:      'var(--text-secondary)',
  agent_done:       'var(--info)',
  tool_call:        'var(--signal)',
  diff_fetched:     'var(--text-secondary)',
  issues_reported:  'var(--warning)',
  comment_posted:   'var(--info)',
  comment_failed:   'var(--critical)',
}

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString('en', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return ts
  }
}

interface AgentLogProps {
  entries: AgentLogEntry[]
}

export function AgentLog({ entries }: AgentLogProps) {
  if (!entries || entries.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        No agent log entries
      </div>
    )
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {entries.map((entry, i) => {
        const color = ACTION_COLORS[entry.action] ?? 'var(--text-secondary)'
        const isLast = i === entries.length - 1

        return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '72px 12px 1fr',
              gap: '0 12px',
              padding: '6px 24px',
              alignItems: 'flex-start',
            }}
          >
            {/* Timestamp */}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                paddingTop: '1px',
                letterSpacing: '-0.01em',
              }}
            >
              {formatTime(entry.ts)}
            </span>

            {/* Timeline connector */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: '4px',
              }}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  boxShadow: `0 0 6px ${color}80`,
                }}
              />
              {!isLast && (
                <div
                  style={{
                    width: '0.5px',
                    height: '20px',
                    background: 'var(--border)',
                    marginTop: '3px',
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color,
                  fontWeight: 500,
                }}
              >
                {entry.action}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  marginLeft: '12px',
                }}
              >
                {entry.detail}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
