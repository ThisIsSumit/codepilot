'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { ProfileResponse } from '@/lib/types'
import { Section, ToggleRow } from '@/components/profile/ProfileSectionComponents'

interface NotificationsSectionProps {
  readonly user: ProfileResponse['user'] | undefined
  readonly isLoading: boolean
  readonly onMutate: () => Promise<any>
  readonly onStatus: (msg: string) => void
}

export function NotificationsSection({ user, isLoading, onMutate, onStatus }: Readonly<NotificationsSectionProps>) {
  const [notificationForm, setNotificationForm] = useState({
    emailEnabled: user?.notification_email ?? true,
    slackEnabled: user?.notification_slack ?? false,
    digestEnabled: user?.notification_weekly_digest ?? true,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    onStatus('')
    try {
      await api.updateNotificationPreferences({
        email_enabled: notificationForm.emailEnabled,
        slack_enabled: notificationForm.slackEnabled,
        digest_enabled: notificationForm.digestEnabled,
      })
      await onMutate()
      onStatus('Notification preferences saved')
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Could not update notifications')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section id="notifications" title="Notifications">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <ToggleRow
          label="Email alerts"
          description="Receive review status and critical issue emails."
          checked={notificationForm.emailEnabled}
          onChange={(checked) => setNotificationForm((current) => ({ ...current, emailEnabled: checked }))}
        />
        <ToggleRow
          label="Slack notifications"
          description="Push review updates to your connected Slack workspace."
          checked={notificationForm.slackEnabled}
          onChange={(checked) => setNotificationForm((current) => ({ ...current, slackEnabled: checked }))}
        />
        <ToggleRow
          label="Weekly digest"
          description="Get a weekly summary of all reviews and unresolved issues."
          checked={notificationForm.digestEnabled}
          onChange={(checked) => setNotificationForm((current) => ({ ...current, digestEnabled: checked }))}
        />

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
          }}
        >
          {saving ? 'Saving...' : 'Save notifications'}
        </button>
      </div>
    </Section>
  )
}
