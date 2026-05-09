import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/ThemeToggle'

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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(8,8,8,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="px-4 h-14 flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'radial-gradient(circle at 50% 50%, #c41230 0 30%, transparent 31%), repeating-conic-gradient(from 0deg, #252525 0 12deg, #0d0d0d 12deg 24deg)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-2 h-2 rounded-full bg-white" style={{ marginTop: '-2px' }} />
            </div>
            <div>
              <div className="text-white font-black text-sm tracking-tight leading-none">Road Ready</div>
              <div className="text-gray-500 text-xs font-semibold tracking-widest uppercase leading-none mt-0.5">Tech View</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-gray-400 text-sm">{profile.first_name}</span>
            <form action="/api/auth/signout" method="POST">
              <button className="text-gray-500 hover:text-white text-sm transition-colors">Sign out</button>
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
