import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/ThemeToggle'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, first_name, last_name, company_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'technician') redirect('/tech')

  const { data: company } = await supabase
    .from('companies')
    .select('name')
    .eq('id', profile.company_id)
    .single()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Top nav */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Brand */}
          <Link href="/admin" className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'radial-gradient(circle at 50% 50%, #c41230 0 30%, transparent 31%), repeating-conic-gradient(from 0deg, #252525 0 12deg, #0d0d0d 12deg 24deg)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-white" style={{ marginTop: '-3px' }} />
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm tracking-tight leading-none" style={{ color: '#ffffff' }}>{company?.name ?? 'Onsite Tire Co'}</div>
              <div className="text-xs font-semibold tracking-widest uppercase leading-none mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>Road Ready</div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {[
              { href: '/admin',           label: 'Dashboard'  },
              { href: '/admin/jobs',      label: 'Jobs'       },
              { href: '/admin/customers', label: 'Customers'  },
              { href: '/admin/techs',     label: 'Team'       },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 text-sm rounded-md transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.62)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.62)')}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-sm hidden md:block" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {profile.first_name} {profile.last_name}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button className="text-sm transition-colors px-2 py-1 rounded hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'var(--card)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
        <div className="flex">
          {[
            { href: '/admin',           label: 'Dashboard', icon: '⊞' },
            { href: '/admin/jobs',      label: 'Jobs',      icon: '🔧' },
            { href: '/admin/customers', label: 'Customers', icon: '👤' },
            { href: '/admin/techs',     label: 'Team',      icon: '👥' },
          ].map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center py-3 text-xs gap-1 active:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}>
              <span className="text-xl">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
    </div>
  )
}
