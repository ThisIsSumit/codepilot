'use client'

import Link from 'next/link'
import type { Route } from 'next'

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--void)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: '56px',
          borderBottom: '0.5px solid var(--border)',
          background: 'rgba(8,11,15,0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M2 10L10 2L18 10L10 18L2 10Z" stroke="var(--signal)" strokeWidth="1.2" />
            <path d="M10 5V15M5 10H15" stroke="var(--signal)" strokeWidth="1.2" strokeLinecap="square" />
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            CodePilot
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {['Features', 'How it works', 'Pricing'].map((label) => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/signin"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              padding: '6px 14px',
            }}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              color: 'var(--void)',
              textDecoration: 'none',
              padding: '6px 16px',
              background: 'var(--signal)',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              letterSpacing: '0.01em',
            }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: '160px',
          paddingBottom: '120px',
          paddingLeft: '40px',
          paddingRight: '40px',
          maxWidth: '900px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            border: '0.5px solid var(--border-active)',
            borderRadius: '2px',
            background: 'var(--signal-dim)',
            marginBottom: '32px',
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--signal)',
              animation: 'pulse-dot 1.4s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--signal)',
              letterSpacing: '0.08em',
              fontWeight: 500,
            }}
          >
            POWERED BY CLAUDE AI TOOL-USE
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '64px',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            color: 'var(--text-primary)',
            marginBottom: '24px',
          }}
        >
          Your PRs reviewed
          <br />
          <span style={{ color: 'var(--signal)' }}>before you blink.</span>
        </h1>

        {/* Subhead */}
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            maxWidth: '560px',
            margin: '0 auto 48px',
          }}
        >
          CodePilot autonomously reviews GitHub pull requests — detecting bugs,
          security issues, and logic errors — then posts structured comments
          directly to your PRs.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <Link
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              background: 'var(--signal)',
              color: 'var(--void)',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: 'var(--radius)',
              letterSpacing: '0.01em',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.88')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
          >
            Start free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
            </svg>
          </Link>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              border: '0.5px solid var(--border-hover)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-display)',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              borderRadius: 'var(--radius)',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-active)'
              el.style.color = 'var(--signal)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-hover)'
              el.style.color = 'var(--text-secondary)'
            }}
          >
            View demo dashboard
          </Link>
        </div>

        {/* Social proof */}
        <p
          style={{
            marginTop: '32px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-muted)',
            letterSpacing: '0.04em',
          }}
        >
          No credit card required · Free for public repos · Self-hostable
        </p>
      </section>

      {/* ── Terminal mockup ───────────────────────────────────────────────── */}
      <section
        style={{
          padding: '0 40px 120px',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            background: 'var(--surface)',
            border: '0.5px solid var(--border)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          {/* Terminal chrome */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--surface-2)',
            }}
          >
            {['#ff5f57', '#ffbd2e', '#1afa9b'].map((c) => (
              <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.8 }} />
            ))}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginLeft: '8px',
              }}
            >
              codepilot — agent log — PR #142 · Fix auth middleware
            </span>
          </div>

          {/* Log lines */}
          <div style={{ padding: '20px 24px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 2 }}>
            {[
              { time: '12:34:05', action: 'agent_start',      color: 'var(--text-secondary)', text: 'Starting review for codepilot/backend PR#142' },
              { time: '12:34:06', action: 'tool_call',         color: 'var(--signal)',          text: '→ read_pr_diff' },
              { time: '12:34:08', action: 'diff_fetched',      color: 'var(--text-secondary)', text: 'Fetched 24,891 bytes across 6 files' },
              { time: '12:34:12', action: 'tool_call',         color: 'var(--signal)',          text: '→ report_issues' },
              { time: '12:34:13', action: 'issues_reported',   color: 'var(--warning)',         text: 'Severity=critical · 3 issues found (1 security, 2 bug)' },
              { time: '12:34:14', action: 'tool_call',         color: 'var(--signal)',          text: '→ post_github_comment' },
              { time: '12:34:15', action: 'comment_posted',    color: 'var(--info)',            text: 'Posted REQUEST_CHANGES review to GitHub' },
              { time: '12:34:15', action: 'agent_done',        color: 'var(--info)',            text: 'Completed · severity=critical · 3 issues' },
            ].map((line, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px' }}>
                <span style={{ color: 'var(--text-muted)', minWidth: '60px' }}>{line.time}</span>
                <span style={{ color: line.color, minWidth: '140px' }}>{line.action}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section
        id="features"
        style={{ padding: '80px 40px', borderTop: '0.5px solid var(--border)' }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '64px', textAlign: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--signal)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Features
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '36px',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginTop: '12px',
              }}
            >
              Everything your team needs
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'var(--border)',
              border: '0.5px solid var(--border)',
            }}
          >
            {[
              {
                icon: '⬡',
                title: 'Agentic AI loop',
                desc: 'Claude autonomously decides which tools to call — no fixed prompts, real reasoning over your code.',
              },
              {
                icon: '◈',
                title: 'Security scanning',
                desc: 'Detects SQL injection, hardcoded secrets, XSS, path traversal, and 40+ other vulnerability patterns.',
              },
              {
                icon: '◎',
                title: 'GitHub native',
                desc: 'Posts directly to your PR as a review with REQUEST_CHANGES or APPROVE — no new tools to check.',
              },
              {
                icon: '⊞',
                title: 'Live dashboard',
                desc: 'Real-time feed of all reviews, agent decision logs, severity trends, and per-repo health scores.',
              },
              {
                icon: '⊕',
                title: 'Structured issues',
                desc: 'Every issue includes file path, line numbers, category, severity, description, and a fix suggestion.',
              },
              {
                icon: '◫',
                title: 'Zero config',
                desc: 'Install the GitHub App, set three env vars, open a PR. The agent handles everything else.',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: 'var(--surface)',
                  padding: '32px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface-2)')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--surface)')}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '20px',
                    color: 'var(--signal)',
                    marginBottom: '16px',
                  }}
                >
                  {icon}
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: '8px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{
          padding: '80px 40px',
          borderTop: '0.5px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '64px', textAlign: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--signal)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              How it works
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '36px',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginTop: '12px',
              }}
            >
              Four steps. Zero effort.
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              {
                n: '01',
                title: 'Install the GitHub App',
                desc: 'One-click install on any repository. CodePilot requests only the permissions it needs — PR read/write, nothing else.',
              },
              {
                n: '02',
                title: 'Open a pull request',
                desc: 'GitHub sends a webhook to CodePilot. The PR is queued for review within milliseconds.',
              },
              {
                n: '03',
                title: 'Agent reads and reasons',
                desc: 'Claude fetches the diff, analyzes changed files for bugs, security issues, and logic errors, then structures its findings.',
              },
              {
                n: '04',
                title: 'Review posted to GitHub',
                desc: 'A structured review comment appears on your PR — with file locations, severity levels, and fix suggestions.',
              },
            ].map(({ n, title, desc }, i) => (
              <div
                key={n}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr',
                  gap: '0 32px',
                  padding: '32px 0',
                  borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '32px',
                    fontWeight: 500,
                    color: 'var(--border-active)',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    paddingTop: '4px',
                  }}
                >
                  {n}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '8px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {title}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.65,
                      margin: 0,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section
        id="pricing"
        style={{
          padding: '80px 40px',
          borderTop: '0.5px solid var(--border)',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '64px', textAlign: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--signal)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Pricing
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '36px',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text-primary)',
                marginTop: '12px',
              }}
            >
              Simple, transparent pricing
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            {[
              {
                name: 'Hobby',
                price: '$0',
                period: 'forever',
                desc: 'For individual developers and open source projects.',
                features: ['5 repos', '100 reviews/month', 'Community support', 'Dashboard access'],
                cta: 'Start free',
                href: '/signup',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '$29',
                period: '/month',
                desc: 'For teams shipping fast and caring about code quality.',
                features: ['Unlimited repos', '2,000 reviews/month', 'Priority support', 'Custom severity rules', 'Slack notifications'],
                cta: 'Start trial',
                href: '/signup',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: '',
                desc: 'For large teams with compliance and security requirements.',
                features: ['Unlimited everything', 'SSO / SAML', 'Self-hosted option', 'SLA guarantee', 'Dedicated support'],
                cta: 'Contact us',
                href: 'mailto:hello@codepilot.dev',
                highlight: false,
              },
            ].map(({ name, price, period, desc, features, cta, href, highlight }) => {
              const isExternalCta = href.startsWith('mailto:')
              const ctaStyle = {
                display: 'block',
                textAlign: 'center' as const,
                padding: '10px',
                background: highlight ? 'var(--signal)' : 'transparent',
                border: highlight ? 'none' : '0.5px solid var(--border-hover)',
                color: highlight ? 'var(--void)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: (highlight ? 700 : 500) as 700 | 500,
                textDecoration: 'none',
                borderRadius: 'var(--radius)',
                transition: 'opacity 0.15s, border-color 0.15s, color 0.15s',
              }

              return (
              <div
                key={name}
                style={{
                  background: highlight ? 'var(--surface-2)' : 'var(--surface)',
                  border: highlight ? '0.5px solid var(--border-active)' : '0.5px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px',
                  boxShadow: highlight ? '0 0 32px var(--signal-glow)' : 'none',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      color: highlight ? 'var(--signal)' : 'var(--text-muted)',
                      textTransform: 'uppercase',
                      marginBottom: '12px',
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '36px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {price}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {period}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      margin: '10px 0 0',
                    }}
                  >
                    {desc}
                  </p>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="var(--info)" strokeWidth="1.4" strokeLinecap="square" />
                      </svg>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {isExternalCta ? (
                  <a
                    href={href}
                    style={ctaStyle}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  >
                    {cta}
                  </a>
                ) : (
                  <Link
                    href={href as Route}
                    style={ctaStyle}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                  >
                    {cta}
                  </Link>
                )}
              </div>
            )})}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '0.5px solid var(--border)',
          padding: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M2 10L10 2L18 10L10 18L2 10Z" stroke="var(--signal)" strokeWidth="1.2" />
          </svg>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            CodePilot © 2025
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {['Privacy', 'Terms', 'GitHub'].map((l) => (
            <a
              key={l}
              href="#"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                textDecoration: 'none',
              }}
            >
              {l}
            </a>
          ))}
        </div>
      </footer>
    </div>
  )
}
