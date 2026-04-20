'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader, EmptyState } from '@/components/ui/Card'
import { swrFetcher } from '@/lib/api'
import type { ProfileResponse } from '@/lib/types'
import { AccountSection } from '@/components/profile/AccountSection'
import { ApiKeysSection } from '@/components/profile/ApiKeysSection'
import { NotificationsSection } from '@/components/profile/NotificationsSection'
import { DangerZoneSection } from '@/components/profile/DangerZoneSection'

const NAV_ITEMS = [
  { id: 'account', label: 'Account' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'danger-zone', label: 'Danger Zone' },
]

export default function ProfilePage() {
  const { data, error, isLoading, mutate } = useSWR<ProfileResponse>('/api/v1/me', swrFetcher)
  const [status, setStatus] = useState('')
  const [activeSection, setActiveSection] = useState<(typeof NAV_ITEMS)[number]['id']>('account')

  if (error) {
    return (
      <div style={{ minHeight: '100vh' }}>
        <PageHeader title="Profile" subtitle="Account settings and preferences" />
        <EmptyState
          title="Profile unavailable"
          description="The backend could not load your profile information."
        />
      </div>
    )
  }

  const user = data?.user
  const activeSectionLabel = NAV_ITEMS.find((item) => item.id === activeSection)?.label ?? 'Account'

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageHeader
        title="Profile"
        subtitle="Account settings, API access, notification preferences, and account deletion"
      />

      {status && (
        <div
          style={{
            margin: '20px 32px 0',
            padding: '12px 14px',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
          }}
        >
          {status}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          minHeight: 'calc(100vh - 65px)',
        }}
      >
        <div style={{ borderRight: '0.5px solid var(--border)', padding: '24px 20px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeSection
            return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-display)',
                fontSize: '12px',
                color: isActive ? 'var(--signal)' : 'var(--text-secondary)',
                background: isActive ? 'var(--signal-dim)' : 'transparent',
                border: isActive ? '0.5px solid var(--border-active)' : '0.5px solid transparent',
                cursor: 'pointer',
                marginBottom: '4px',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {item.label}
            </button>
            )
          })}
        </div>

        <div style={{ padding: '32px', maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '24px',
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--signal-dim)',
                border: '0.5px solid var(--border-active)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: '18px',
                fontWeight: 500,
                color: 'var(--signal)',
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name ?? 'User')}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                {user?.name ?? (isLoading ? 'Loading profile...' : 'Unknown user')}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                @{user?.github_username || 'github'} · Joined {user?.joined_at || '—'}
              </div>
            </div>

            <div
              style={{
                padding: '4px 10px',
                borderRadius: '2px',
                background: 'var(--signal-dim)',
                border: '0.5px solid var(--border-active)',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 500,
                color: 'var(--signal)',
                letterSpacing: '0.08em',
              }}
            >
              {(user?.plan ?? 'PRO').toUpperCase()}
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              overflow: 'hidden',
            }}
          >
            {[
              { label: 'Reviews run', value: data?.stats?.reviews_total ?? 0 },
              { label: 'Repos connected', value: data?.stats?.repos_connected ?? 0 },
              { label: 'Critical PRs', value: data?.stats?.critical_prs ?? 0 },
            ].map((item, index) => (
              <div
                key={item.label}
                style={{
                  padding: '20px',
                  borderRight: index < 2 ? '0.5px solid var(--border)' : 'none',
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {item.value}
                </div>
              </div>
            ))}
          </section>

          <section
            style={{
              background: 'var(--surface)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px 20px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
              }}
            >
              {activeSectionLabel}
            </span>
          </section>

          {activeSection === 'account' && (
            <AccountSection user={user} isLoading={isLoading} onMutate={() => mutate().then(() => undefined)} onStatus={setStatus} />
          )}
          {activeSection === 'api-keys' && (
            <ApiKeysSection user={user} isLoading={isLoading} onMutate={() => mutate().then(() => undefined)} onStatus={setStatus} />
          )}
          {activeSection === 'notifications' && (
            <NotificationsSection user={user} isLoading={isLoading} onMutate={() => mutate().then(() => undefined)} onStatus={setStatus} />
          )}
          {activeSection === 'danger-zone' && (
            <DangerZoneSection isLoading={isLoading} onStatus={setStatus} />
          )}
        </div>
      </div>
    </div>
  )
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
