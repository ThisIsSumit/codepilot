'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiBaseUrl } from '@/lib/api'
import { useAuth } from '@/components/providers/AuthProvider'

export default function SignUpPage() {
  const router = useRouter()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setField(k: keyof typeof form) {
    return (v: string) => setForm((f) => ({ ...f, [k]: v }))
  }

  function getMessage(err: unknown): string {
    if (err instanceof Error) {
      const parts = err.message.split(':')
      return parts.length > 1 ? parts.slice(1).join(':').trim() : err.message
    }
    return 'Unable to create account right now.'
  }

  function handleGitHubOAuth() {
    const oauthUrl =
      process.env.NEXT_PUBLIC_GITHUB_OAUTH_URL ??
      `${apiBaseUrl}/api/v1/auth/github`
    window.location.href = oauthUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      await signUp({ name: form.name, email: form.email, password: form.password })
      router.push('/dashboard')
    } catch (err) {
      setError(getMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const passwordStrength = (() => {
    const p = form.password
    if (!p) return null
    if (p.length < 6) return { label: 'Weak', color: 'var(--critical)', w: '30%' }
    if (p.length < 10) return { label: 'Fair', color: 'var(--warning)', w: '60%' }
    return { label: 'Strong', color: 'var(--info)', w: '100%' }
  })()

  return (
    <div style={{ width: '100%', maxWidth: '420px' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '40px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            Create your account
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            Start reviewing PRs with AI in minutes
          </p>
        </div>

        {/* GitHub OAuth */}
        <button
          onClick={handleGitHubOAuth}
          type="button"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '10px',
            background: 'var(--surface-2)',
            border: '0.5px solid var(--border-hover)',
            borderRadius: 'var(--radius)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '24px',
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-active)'
            e.currentTarget.style.background = 'var(--surface-3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-hover)'
            e.currentTarget.style.background = 'var(--surface-2)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Sign up with GitHub
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>OR</span>
          <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(255,95,87,0.08)',
              border: '0.5px solid rgba(255,95,87,0.3)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--critical)',
            }}>
              {error}
            </div>
          )}

          <Field label="Full name" type="text" value={form.name} onChange={setField('name')} placeholder="Sumit Kumar" />
          <Field label="Email" type="email" value={form.email} onChange={setField('email')} placeholder="you@company.com" />
          <Field label="Password" type="password" value={form.password} onChange={setField('password')} placeholder="Min. 8 characters" />

          {/* Password strength */}
          {passwordStrength && (
            <div style={{ marginTop: '-6px' }}>
              <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: passwordStrength.w,
                  background: passwordStrength.color,
                  transition: 'width 0.3s ease-out',
                }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: passwordStrength.color, marginTop: '4px', display: 'block' }}>
                {passwordStrength.label}
              </span>
            </div>
          )}

          <Field label="Confirm password" type="password" value={form.confirm} onChange={setField('confirm')} placeholder="••••••••" />

          {/* Terms */}
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6, margin: '4px 0' }}>
            By signing up you agree to our{' '}
            <Link href="#" style={{ color: 'var(--signal)', textDecoration: 'none' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="#" style={{ color: 'var(--signal)', textDecoration: 'none' }}>Privacy Policy</Link>.
          </p>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '10px',
              background: 'var(--signal)', border: 'none',
              borderRadius: 'var(--radius)', color: 'var(--void)',
              fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s', marginTop: '4px',
            }}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '24px' }}>
          Already have an account?{' '}
          <Link href="/signin" style={{ color: 'var(--signal)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required
        style={{
          width: '100%', padding: '9px 12px',
          background: 'var(--surface-2)', border: '0.5px solid var(--border-hover)',
          borderRadius: 'var(--radius)', color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)', fontSize: '12px', outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-active)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      />
    </div>
  )
}
