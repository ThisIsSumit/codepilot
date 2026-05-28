import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { hasAuthCookie } from '@/lib/auth'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'CodePilot — AI Code Review',
  description: 'Autonomous AI-powered GitHub PR intelligence platform',
}

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode
}) 
{
  const cookieStore = cookies()
  const initialAuthenticated = hasAuthCookie(cookieStore)

  return (
    <html lang="en">
      <body style={{ background: 'var(--void)', color: 'var(--text-primary)' }}>
        <AuthProvider initialAuthenticated={initialAuthenticated}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
