import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role !== 'technician' && profile.role !== 'company_admin' && profile.role !== 'dispatcher') {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F2F2F2', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Header */}
      <header style={{ background: '#0A0A0A' }} className="sticky top-0 z-50">
        <div className="px-4 h-14 flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
              <circle cx="16" cy="16" r="14" stroke="#444" strokeWidth="2"/>
              <circle cx="16" cy="16" r="9" stroke="#555" strokeWidth="1.5"/>
              <path d="M16 8c-3.3 0-6 2.7-6 6 0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6z" fill="#C41230"/>
              <circle cx="16" cy="14" r="2.5" fill="white"/>
            </svg>
            <span className="text-white font-bold text-sm">Road Ready</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">{profile.first_name}</span>
            <form action="/api/auth/signout" method="POST">
              <button className="text-gray-500 hover:text-white text-sm">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 pb-6">
        {children}
      </main>
    </div>
  )
}
