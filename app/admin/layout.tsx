import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

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
    <div className="min-h-screen flex flex-col" style={{ background: '#F2F2F2' }}>
      {/* Top nav */}
      <header style={{ background: '#0A0A0A' }} className="sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
              <circle cx="16" cy="16" r="14" stroke="#444" strokeWidth="2"/>
              <circle cx="16" cy="16" r="9" stroke="#555" strokeWidth="1.5"/>
              <path d="M16 8c-3.3 0-6 2.7-6 6 0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6z" fill="#C41230"/>
              <circle cx="16" cy="14" r="2.5" fill="white"/>
            </svg>
            <span className="text-white font-bold text-sm">{company?.name ?? 'Road Ready'}</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: '/admin', label: 'Dashboard' },
              { href: '/admin/jobs', label: 'Jobs' },
              { href: '/admin/customers', label: 'Customers' },
            ].map(({ href, label }) => (
              <Link key={href} href={href}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm hidden md:block">
              {profile.first_name} {profile.last_name}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button className="text-gray-500 hover:text-white text-sm transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="flex">
          {[
            { href: '/admin', label: 'Dashboard', icon: '⊞' },
            { href: '/admin/jobs', label: 'Jobs', icon: '🔧' },
            { href: '/admin/customers', label: 'Customers', icon: '👤' },
          ].map(({ href, label, icon }) => (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center py-2 text-gray-500 hover:text-red-600 text-xs gap-1">
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 pb-20 md:pb-6">
        {children}
      </main>
    </div>
  )
}
