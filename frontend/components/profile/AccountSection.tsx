'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { ProfileResponse } from '@/lib/types'
import { Section, ProfileField } from '@/components/profile/ProfileSectionComponents'

interface AccountSectionProps {
  readonly user: ProfileResponse['user'] | undefined
  readonly isLoading: boolean
  readonly onMutate: () => Promise<any>
  readonly onStatus: (msg: string) => void
}

export function AccountSection({ user, isLoading, onMutate, onStatus }: Readonly<AccountSectionProps>) {
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    githubUsername: user?.github_username ?? '',
    avatarUrl: user?.avatar_url ?? '',
  })
  const [saving, setSaving] = useState(false)

  function setField(field: keyof typeof profileForm) {
    return (value: string) => setProfileForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    onStatus('')
    try {
      await api.updateProfile({
        name: profileForm.name,
        email: profileForm.email,
        github_username: profileForm.githubUsername,
        avatar_url: profileForm.avatarUrl,
      })
      await onMutate()
      onStatus('Profile updated')
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section id="account" title="Account Details">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <ProfileField label="Full name" value={profileForm.name} onChange={setField('name')} />
        <ProfileField label="Email" value={profileForm.email} onChange={setField('email')} type="email" />
        <ProfileField label="GitHub username" value={profileForm.githubUsername} onChange={setField('githubUsername')} />
        <ProfileField label="Avatar URL" value={profileForm.avatarUrl} onChange={setField('avatarUrl')} placeholder="https://avatars.githubusercontent.com/..." />

        <button
          onClick={handleSave}
          disabled={saving || isLoading}
          style={{
            alignSelf: 'flex-start',
            padding: '8px 20px',
            background: 'var(--signal)',
            border: 'none',
            borderRadius: 'var(--radius)',
            color: 'var(--void)',
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </Section>
  )
}
