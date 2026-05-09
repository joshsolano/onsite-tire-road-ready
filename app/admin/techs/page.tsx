import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function TechsListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!profile) return null

  const { data: techs } = await supabase
    .from('users')
    .select('id, first_name, last_name, phone, email, role, is_active, created_at')
    .eq('company_id', profile.company_id)
    .in('role', ['technician', 'dispatcher'])
    .order('first_name')

  const techIds = (techs ?? []).map(t => t.id)

  // Pull job stats for all techs in one query
  const { data: jobStats } = techIds.length > 0
    ? await supabase
        .from('jobs')
        .select('assigned_tech_id, status, tire_count, report_sent_at, scheduled_start')
        .eq('company_id', profile.company_id)
        .in('assigned_tech_id', techIds)
    : { data: [] }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const statsFor = (techId: string) => {
    const jobs = (jobStats ?? []).filter(j => j.assigned_tech_id === techId)
    const completed = jobs.filter(j => ['completed', 'report_generated', 'report_sent'].includes(j.status))
    const thisMonth = jobs.filter(j => j.scheduled_start && j.scheduled_start >= monthStart && ['completed', 'report_generated', 'report_sent'].includes(j.status))
    const tires = completed.reduce((s, j) => s + (j.tire_count ?? 0), 0)
    const sent = jobs.filter(j => j.report_sent_at).length
    return { total: completed.length, tires, sent, thisMonth: thisMonth.length }
  }

  const techList = (techs ?? []).map(t => ({ ...t, stats: statsFor(t.id) }))
  const sorted = [...techList].sort((a, b) => b.stats.total - a.stats.total)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sorted.length} team members</p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Performance — All Time</h2>
        </div>
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No team members yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sorted.map((tech, idx) => {
              const initials = `${tech.first_name[0]}${tech.last_name[0]}`
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
              return (
                <Link key={tech.id} href={`/admin/techs/${tech.id}`}
                  className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors">

                  <div className="w-7 text-center text-lg flex-shrink-0">
                    {medal ?? <span className="text-sm text-gray-400 font-semibold">{idx + 1}</span>}
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      {tech.first_name} {tech.last_name}
                      {!tech.is_active && (
                        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">{tech.role.replace('_', ' ')}</div>
                  </div>

                  <div className="hidden sm:grid grid-cols-3 gap-4 text-center flex-shrink-0">
                    <div>
                      <div className="text-lg font-black text-gray-900">{tech.stats.total}</div>
                      <div className="text-xs text-gray-400">jobs</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-red-600">{tech.stats.tires}</div>
                      <div className="text-xs text-gray-400">tires</div>
                    </div>
                    <div>
                      <div className="text-lg font-black text-purple-600">{tech.stats.sent}</div>
                      <div className="text-xs text-gray-400">reports</div>
                    </div>
                  </div>

                  {/* Mobile: just the job count */}
                  <div className="sm:hidden text-right flex-shrink-0">
                    <div className="text-lg font-black text-gray-900">{tech.stats.total}</div>
                    <div className="text-xs text-gray-400">jobs</div>
                  </div>

                  <div className="text-gray-300 flex-shrink-0">→</div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Team stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Team Members',    value: sorted.length,                                        color: 'text-gray-900' },
          { label: 'Total Jobs Done', value: sorted.reduce((s, t) => s + t.stats.total, 0),        color: 'text-gray-900' },
          { label: 'Tires Installed', value: sorted.reduce((s, t) => s + t.stats.tires, 0),        color: 'text-red-600' },
          { label: 'Reports Sent',    value: sorted.reduce((s, t) => s + t.stats.sent, 0),         color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
