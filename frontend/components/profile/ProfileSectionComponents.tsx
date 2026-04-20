import React from 'react'

export function Section({
  id,
  title,
  children,
  danger,
}: Readonly<{
  id: string
  title: string
  children: React.ReactNode
  danger?: boolean
}>) {
  return (
    <section
      id={id}
      style={{
        background: 'var(--surface)',
        border: `0.5px solid ${danger ? 'rgba(255,95,87,0.25)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          borderBottom: `0.5px solid ${danger ? 'rgba(255,95,87,0.15)' : 'var(--border)'}`,
          background: danger ? 'rgba(255,95,87,0.04)' : 'var(--surface-2)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: danger ? 'var(--critical)' : 'var(--text-secondary)',
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </section>
  )
}

export function ProfileField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: Readonly<{
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}>) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '9px 12px',
          background: 'var(--surface-2)',
          border: '0.5px solid var(--border-hover)',
          borderRadius: 'var(--radius)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--border-active)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-hover)')}
      />
    </div>
  )
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: Readonly<{
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}>) {
  return (
    <label
      htmlFor={`toggle-${label}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '14px 16px',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface-2)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {description}
        </span>
      </div>
      <input
        id={`toggle-${label}`}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: '16px', height: '16px', accentColor: 'var(--signal)', flexShrink: 0 }}
      />
    </label>
  )
}
