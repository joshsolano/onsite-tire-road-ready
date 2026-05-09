import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR } from '@/lib/types'
import AssignJobsButton from '@/components/admin/AssignJobsButton'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = profile?.company_id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()
  const tomorrowISO = new Date(today.getTime() + 86400000).toISOString()

  const [
    { data: todayJobs },
    { data: recentJobs },
    { data: techs },
  ] = await Promise.all([
    supabase.from('jobs')
      .select('id, status, report_generated_at, report_sent_at')
      .eq('company_id', companyId)
      .gte('scheduled_start', todayISO)
      .lt('scheduled_start', tomorrowISO),
    supabase.from('jobs')
      .select('id, status, service_type, created_at, customer:customers(first_name,last_name), vehicle:vehicles(year,make,model), assigned_tech:users!jobs_assigned_tech_id_fkey(first_name,last_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('users')
      .select('id, first_name, last_name, role')
      .eq('company_id', companyId)
      .eq('role', 'technician')
      .eq('is_active', true),
  ])

  const total     = todayJobs?.length ?? 0
  const completed = todayJobs?.filter(j => ['completed','report_generated','report_sent'].includes(j.status)).length ?? 0
  const sent      = todayJobs?.filter(j => j.report_sent_at).length ?? 0
  const inProg    = todayJobs?.filter(j => j.status === 'in_progress').length ?? 0

  const stats = [
    { label: "Today's Jobs",       value: total,     color: 'bg-blue-50 text-blue-700' },
    { label: 'Completed',          value: completed, color: 'bg-green-50 text-green-700' },
    { label: 'Reports Sent',       value: sent,      color: 'bg-purple-50 text-purple-700' },
    { label: 'In Progress',        value: inProg,    color: 'bg-orange-50 text-orange-700' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">{formatDate(new Date().toISOString())}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AssignJobsButton />
          <Link href="/admin/jobs/new" className="btn-primary">
            + New Job
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card p-5">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${s.color}`}>
              <span className="text-xl font-bold">{s.value}</span>
            </div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Recent Jobs */}
        <div className="md:col-span-2 card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Jobs</h2>
            <Link href="/admin/jobs" className="text-sm text-red-600 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!recentJobs?.length && (
              <div className="p-6 text-center text-gray-400 text-sm">No jobs yet. <Link href="/admin/jobs/new" className="text-red-600">Create the first one</Link></div>
            )}
            {recentJobs?.map(job => {
              const c = job.customer as unknown as { first_name: string; last_name: string } | null
              const v = job.vehicle as unknown as { year: string; make: string; model: string } | null
              const t = job.assigned_tech as unknown as { first_name: string; last_name: string } | null
              return (
                <Link key={job.id} href={`/admin/jobs/${job.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
                      {c ? `${c.first_name} ${c.last_name}` : 'No customer'}
                    </div>
                    <div className="text-gray-500 text-xs truncate">
                      {v ? `${v.year} ${v.make} ${v.model}` : 'No vehicle'} · {t ? `${t.first_name} ${t.last_name}` : 'Unassigned'}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${JOB_STATUS_COLOR[job.status as keyof typeof JOB_STATUS_COLOR]}`}>
                    {JOB_STATUS_LABEL[job.status as keyof typeof JOB_STATUS_LABEL]}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Technicians */}
        <div className="card">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Technicians</h2>
            <Link href="/admin/techs" className="text-sm text-red-600 font-medium">View all →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {!techs?.length && (
              <div className="p-6 text-center text-gray-400 text-sm">No technicians added yet.</div>
            )}
            {techs?.map(t => (
              <Link key={t.id} href={`/admin/techs/${t.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {t.first_name[0]}{t.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{t.first_name} {t.last_name}</div>
                  <div className="text-xs text-gray-500 capitalize">{t.role}</div>
                </div>
                <div className="text-gray-300 text-sm">→</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
