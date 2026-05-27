'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'

const NAV: Array<{ href: Route; label: string; icon: JSX.Element }> = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="1" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="10" y="1" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="1" y="10" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="10" y="10" width="7" height="7" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    href: '/repos',
    label: 'Repos',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 1h12v16H3V1z" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M6 5h6M6 8h6M6 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square"/>
      </svg>
    ),
  },
  {
    href: '/reviews',
    label: 'Reviews',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square"/>
      </svg>
    ),
  },
]

const BOTTOM_NAV: Array<{ href: Route; label: string; icon: JSX.Element }> = [
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square"/>
      </svg>
    ),
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleSignOut() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await signOut()
      router.replace('/signin')
      // refresh server-rendered state so layout/auth checks run again
      router.refresh()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '64px',
        height: '100vh',
        background: 'var(--surface)',
        borderRight: '0.5px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 100,
        paddingTop: '0',
      }}
    >
      {/* Logo */}
      <div
        style={{
          width: '100%',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '0.5px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path
            d="M2 11L11 2L20 11L11 20L2 11Z"
            stroke="var(--signal)"
            strokeWidth="1.2"
          />
          <path
            d="M11 6V16M6 11H16"
            stroke="var(--signal)"
            strokeWidth="1.2"
            strokeLinecap="square"
          />
        </svg>
      </div>

      {/* Nav items */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '12px 8px',
          width: '100%',
        }}
      >
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '40px',
                borderRadius: 'var(--radius)',
                border: active
                  ? '0.5px solid var(--border-active)'
                  : '0.5px solid transparent',
                background: active ? 'var(--signal-dim)' : 'transparent',
                color: active ? 'var(--signal)' : 'var(--text-muted)',
                transition: 'all 0.15s ease-out',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-secondary)'
                  el.style.background = 'var(--surface-2)'
                  el.style.borderColor = 'var(--border)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-muted)'
                  el.style.background = 'transparent'
                  el.style.borderColor = 'transparent'
                }
              }}
            >
              {icon}
            </Link>
          )
        })}
      </div>

      {/* Bottom: profile + version */}
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          padding: '12px 8px',
          borderTop: '0.5px solid var(--border)',
        }}
      >
        {BOTTOM_NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '40px',
                borderRadius: 'var(--radius)',
                border: active
                  ? '0.5px solid var(--border-active)'
                  : '0.5px solid transparent',
                background: active ? 'var(--signal-dim)' : 'transparent',
                color: active ? 'var(--signal)' : 'var(--text-muted)',
                transition: 'all 0.15s ease-out',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-secondary)'
                  el.style.background = 'var(--surface-2)'
                  el.style.borderColor = 'var(--border)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  const el = e.currentTarget as HTMLElement
                  el.style.color = 'var(--text-muted)'
                  el.style.background = 'transparent'
                  el.style.borderColor = 'transparent'
                }
              }}
            >
              {icon}
            </Link>
          )
        })}
        <button
          type="button"
          title="Sign out"
          onClick={handleSignOut}
          disabled={loggingOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '40px',
            borderRadius: 'var(--radius)',
            border: '0.5px solid transparent',
            background: 'transparent',
            color: 'var(--text-muted)',
            transition: 'all 0.15s ease-out',
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            opacity: loggingOut ? 0.6 : 1,
            padding: 0,
          }}
          onMouseEnter={(e) => {
            if (!loggingOut) {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--critical)'
              el.style.background = 'rgba(255,95,87,0.08)'
              el.style.borderColor = 'rgba(255,95,87,0.25)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loggingOut) {
              const el = e.currentTarget as HTMLElement
              el.style.color = 'var(--text-muted)'
              el.style.background = 'transparent'
              el.style.borderColor = 'transparent'
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M7 3H3v12h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            <path d="M10 5l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
            <path d="M5 9h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
          </svg>
        </button>
        <div
          style={{
            paddingTop: '8px',
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            letterSpacing: '0.05em',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          v0.1.0
        </div>
      </div>
    </nav>
  )
}
