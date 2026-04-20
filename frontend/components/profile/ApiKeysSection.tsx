import { useState } from 'react'
import { api } from '@/lib/api'
import type { ProfileResponse } from '@/lib/types'
import { Section } from '@/components/profile/ProfileSectionComponents'

interface ApiKeysSectionProps {
  readonly user: ProfileResponse['user'] | undefined
  readonly isLoading: boolean
  readonly onMutate: () => Promise<any>
  readonly onStatus: (msg: string) => void
}

export function ApiKeysSection({ user, isLoading, onMutate, onStatus }: Readonly<ApiKeysSectionProps>) {
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [rotating, setRotating] = useState(false)

  const maskedApiKey = !user?.api_key
    ? 'cp_live_' + '•'.repeat(24)
    : apiKeyVisible
      ? user.api_key
      : `${user.api_key.slice(0, 11)}${'•'.repeat(Math.max(user.api_key.length - 11, 8))}`

  async function handleRotateKey() {
    setRotating(true)
    onStatus('')
    try {
      await api.rotateApiKey()
      await onMutate()
      setApiKeyVisible(true)
      onStatus('API key rotated')
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Could not rotate API key')
    } finally {
      setRotating(false)
    }
  }

  async function handleCopyApiKey() {
    if (!user?.api_key) return
    await navigator.clipboard?.writeText(user.api_key)
    onStatus('API key copied to clipboard')
  }

  return (
    <Section id="api-keys" title="API Keys">
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
        Use this key to authenticate requests to the CodePilot API. Keep it secret.
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', flex: 1, letterSpacing: '0.02em' }}>
          {maskedApiKey}
        </span>
        <button
          onClick={() => setApiKeyVisible((current) => !current)}
          type="button"
          style={{
            padding: '4px 10px',
            background: 'transparent',
            border: '0.5px solid var(--border-hover)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          {apiKeyVisible ? 'Hide' : 'Reveal'}
        </button>
        <button
          onClick={handleCopyApiKey}
          type="button"
          style={{
            padding: '4px 10px',
            background: 'transparent',
            border: '0.5px solid var(--border-hover)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            cursor: 'pointer',
          }}
        >
          Copy
        </button>
      </div>
      <button
        onClick={handleRotateKey}
        type="button"
        disabled={rotating || isLoading}
        style={{
          marginTop: '12px',
          padding: '6px 14px',
          background: 'transparent',
          border: '0.5px solid rgba(255,95,87,0.3)',
          borderRadius: 'var(--radius)',
          color: 'var(--critical)',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          cursor: rotating ? 'not-allowed' : 'pointer',
          opacity: rotating ? 0.6 : 1,
        }}
      >
        {rotating ? 'Rotating...' : 'Regenerate key'}
      </button>
    </Section>
  )
}
