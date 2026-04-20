import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { hasAuthCookie } from '@/lib/auth'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  if (hasAuthCookie(cookieStore)) {
    redirect('/dashboard')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--void)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          height: '56px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/landing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M2 10L10 2L18 10L10 18L2 10Z" stroke="var(--signal)" strokeWidth="1.2" />
            <path d="M10 5V15M5 10H15" stroke="var(--signal)" strokeWidth="1.2" strokeLinecap="square" />
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            CodePilot
          </span>
        </Link>

        <Link
          href="/landing"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          ← Back to home
        </Link>
      </nav>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        {children}
      </div>

      {/* Grid background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          backgroundImage: `
            linear-gradient(var(--border) 0.5px, transparent 0.5px),
            linear-gradient(90deg, var(--border) 0.5px, transparent 0.5px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.4,
        }}
      />
    </div>
  )
}
