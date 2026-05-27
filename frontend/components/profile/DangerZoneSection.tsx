'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/components/providers/AuthProvider'
import { Section } from '@/components/profile/ProfileSectionComponents'

interface DangerZoneSectionProps {
  readonly isLoading: boolean
  readonly onStatus: (msg: string) => void
}

export function DangerZoneSection({ isLoading, onStatus }: Readonly<DangerZoneSectionProps>) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDeleteAccount() {
    if (deleteConfirm.trim() !== 'delete my account') {
      onStatus('Type the confirmation phrase exactly to delete your account')
      return
    }
    setDeleting(true)
    onStatus('')
    try {
      await api.deleteAccount(deleteConfirm.trim())
      await signOut()
      await router.replace('/signin')
      // ensure server components re-run and show signed-out state
      router.refresh()
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Could not delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Section id="danger-zone" title="Danger Zone" danger>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
        Permanently delete your account and all associated data. This cannot be undone.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            Type <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--critical)' }}>delete my account</span> to confirm
          </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="delete my account"
              aria-label="Confirmation phrase for account deletion"
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--surface-2)',
              border: '0.5px solid rgba(255,95,87,0.3)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deleting || isLoading}
            type="button"
            style={{
              padding: '8px 16px',
              background: deleteConfirm.trim() === 'delete my account' ? 'var(--critical)' : 'transparent',
              border: '0.5px solid rgba(255,95,87,0.4)',
              borderRadius: 'var(--radius)',
              color: deleteConfirm.trim() === 'delete my account' ? '#fff' : 'var(--critical)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: deleteConfirm.trim() === 'delete my account' && !deleting ? 'pointer' : 'not-allowed',
              opacity: deleting ? 0.7 : deleteConfirm.trim() === 'delete my account' ? 1 : 0.5,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {deleting ? 'Deleting...' : 'Delete account'}
          </button>
        </div>
      </div>
    </Section>
  )
}
