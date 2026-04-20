import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/Sidebar'
import { hasAuthCookie } from '@/lib/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const isAuthenticated = hasAuthCookie(cookieStore)

  if (!isAuthenticated) {
    redirect('/signin')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          marginLeft: '64px',
          minHeight: '100vh',
          background: 'var(--void)',
        }}
      >
        {children}
      </main>
    </div>
  )
}
