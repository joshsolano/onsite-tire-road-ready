import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR, SERVICE_TYPE_LABEL } from '@/lib/types'
import { formatDate, formatTime } from '@/lib/utils'

export default async function TechProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!profile) return null

  const [techResult, authResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, phone, email, role, is_active, created_at')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single(),
    createServiceClient().then(s => s.auth.admin.getUserById(id)),
  ])

  const tech = techResult.data
  if (!tech) notFound()

  const lastSignIn = authResult.data?.user?.last_sign_in_at ?? null

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id, status, service_type, tire_count, scheduled_start, completed_at,
      report_sent_at, report_generated_at, created_at,
      customer:customers(first_name, last_name),
      vehicle:vehicles(year, make, model)
    `)
    .eq('assigned_tech_id', id)
    .eq('company_id', profile.company_id)
    .order('scheduled_start', { ascending: false })

  const allJobs = jobs ?? []
  const completed = allJobs.filter(j => ['completed', 'report_generated', 'report_sent'].includes(j.status))
  const reportsSent = allJobs.filter(j => j.report_sent_at)
  const totalTires = allJobs.reduce((sum, j) => sum + (j.tire_count ?? 0), 0)
  const completedTires = completed.reduce((sum, j) => sum + (j.tire_count ?? 0), 0)

  // This month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthJobs = allJobs.filter(j => j.scheduled_start && j.scheduled_start >= monthStart)
  const thisMonthCompleted = thisMonthJobs.filter(j => ['completed', 'report_generated', 'report_sent'].includes(j.status))

  // Last 8 weeks activity
  const weeks: { label: string; count: number }[] = []
  for (let w = 7; w >= 0; w--) {
    const start = new Date(now)
    start.setDate(start.getDate() - (w + 1) * 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const count = completed.filter(j => {
      if (!j.scheduled_start) return false
      const d = new Date(j.scheduled_start)
      return d >= start && d < end
    }).length
    weeks.push({ label: `W${8 - w}`, count })
  }
  const maxWeek = Math.max(...weeks.map(w => w.count), 1)

  const initials = `${tech.first_name[0]}${tech.last_name[0]}`
  const memberSince = formatDate(tech.created_at, { month: 'short', year: 'numeric' })

  return (
    <div className="space-y-6">

      {/* Back */}
      <Link href="/admin/jobs" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
        ← Back
      </Link>

      {/* Profile header */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{tech.first_name} {tech.last_name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tech.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {tech.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-1 capitalize">{tech.role.replace('_', ' ')}</div>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 flex-wrap">
              {tech.phone && <span>📞 {tech.phone}</span>}
              {tech.email && <span>✉ {tech.email}</span>}
              <span>📅 Member since {memberSince}</span>
              {lastSignIn && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Last login {formatDate(lastSignIn, { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' '}at {formatTime(lastSignIn)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Jobs Completed',   value: completed.length,      sub: `${allJobs.length} total`,           color: 'text-gray-900' },
          { label: 'Tires Installed',  value: completedTires,        sub: `${totalTires} total assigned`,       color: 'text-red-600'  },
          { label: 'Reports Sent',     value: reportsSent.length,    sub: `${Math.round(reportsSent.length / Math.max(completed.length, 1) * 100)}% send rate`, color: 'text-purple-600' },
          { label: 'This Month',       value: thisMonthCompleted.length, sub: `${thisMonthJobs.length} assigned`, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`text-3xl font-black mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm font-semibold text-gray-700">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Completed Jobs — Last 8 Weeks</h2>
        <div className="flex items-end gap-2 h-24">
          {weeks.map((w, i) => {
            const pct = (w.count / maxWeek) * 100
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-gray-500 font-medium">{w.count > 0 ? w.count : ''}</div>
                <div className="w-full rounded-t-md bg-red-600 transition-all"
                  style={{ height: `${Math.max(pct, w.count > 0 ? 8 : 2)}%`, minHeight: w.count > 0 ? '6px' : '2px', opacity: w.count > 0 ? 1 : 0.15 }} />
                <div className="text-xs text-gray-400">{w.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Performance summary */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Completion Rate</div>
          <div className="text-2xl font-black text-gray-900 mb-1">
            {allJobs.length > 0 ? Math.round((completed.length / allJobs.length) * 100) : 0}%
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${allJobs.length > 0 ? Math.round((completed.length / allJobs.length) * 100) : 0}%` }} />
          </div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Avg Tires / Job</div>
          <div className="text-2xl font-black text-gray-900">
            {completed.length > 0 ? (completedTires / completed.length).toFixed(1) : '—'}
          </div>
          <div className="text-xs text-gray-400 mt-1">across {completed.length} completed jobs</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Report Send Rate</div>
          <div className="text-2xl font-black text-gray-900">
            {completed.length > 0 ? Math.round((reportsSent.length / completed.length) * 100) : 0}%
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
            <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${completed.length > 0 ? Math.round((reportsSent.length / completed.length) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Job history */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Job History</h2>
          <span className="text-xs text-gray-400">{allJobs.length} total</span>
        </div>
        {allJobs.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No jobs assigned yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {allJobs.map(job => {
              const c = job.customer as unknown as { first_name: string; last_name: string } | null
              const v = job.vehicle as unknown as { year: string; make: string; model: string } | null
              return (
                <Link key={job.id} href={`/admin/jobs/${job.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {c ? `${c.first_name} ${c.last_name}` : 'No customer'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{v ? `${v.year} ${v.make} ${v.model}` : '—'}</span>
                      <span>·</span>
                      <span>{SERVICE_TYPE_LABEL[job.service_type as keyof typeof SERVICE_TYPE_LABEL]}</span>
                      <span>·</span>
                      <span>{job.tire_count} tires</span>
                      {job.scheduled_start && (
                        <>
                          <span>·</span>
                          <span>{formatDate(job.scheduled_start, { month: 'short', day: 'numeric' })} {formatTime(job.scheduled_start)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${JOB_STATUS_COLOR[job.status as keyof typeof JOB_STATUS_COLOR]}`}>
                    {JOB_STATUS_LABEL[job.status as keyof typeof JOB_STATUS_LABEL]}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
