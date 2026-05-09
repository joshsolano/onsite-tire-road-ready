import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR, SERVICE_TYPE_LABEL } from '@/lib/types'

export default async function AdminJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id, status, service_type, tire_count, scheduled_start, report_sent_at, created_at, invoice_number,
      customer:customers(first_name, last_name, phone),
      vehicle:vehicles(year, make, model),
      assigned_tech:users!jobs_assigned_tech_id_fkey(first_name, last_name),
      report:reports(public_slug, view_count, sent_at)
    `)
    .eq('company_id', profile?.company_id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <Link href="/admin/jobs/new" className="btn-primary">+ New Job</Link>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {!jobs?.length && (
          <div className="card p-8 text-center text-gray-400 text-sm">
            No jobs yet. <Link href="/admin/jobs/new" className="text-red-600">Create one</Link>
          </div>
        )}
        {jobs?.map(job => {
          const c = job.customer as unknown as { first_name: string; last_name: string; phone: string } | null
          const v = job.vehicle as unknown as { year: string; make: string; model: string } | null
          const t = job.assigned_tech as unknown as { first_name: string; last_name: string } | null
          const r = job.report as unknown as { public_slug: string; view_count: number; sent_at: string } | null
          return (
            <Link key={job.id} href={`/admin/jobs/${job.id}`} className="card p-4 flex items-start justify-between gap-3 active:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">
                    {c ? `${c.first_name} ${c.last_name}` : 'No customer'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLOR[job.status as keyof typeof JOB_STATUS_COLOR]}`}>
                    {JOB_STATUS_LABEL[job.status as keyof typeof JOB_STATUS_LABEL]}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {v ? `${v.year} ${v.make} ${v.model}` : '—'}
                  {t ? ` · ${t.first_name} ${t.last_name}` : ''}
                </div>
                <div className="text-xs text-gray-400">
                  {SERVICE_TYPE_LABEL[job.service_type as keyof typeof SERVICE_TYPE_LABEL]} · {job.tire_count} tires
                  {job.scheduled_start ? ` · ${formatDate(job.scheduled_start, { month: 'short', day: 'numeric' })}` : ''}
                </div>
                {r && (
                  <div className={`text-xs mt-1 ${r.sent_at ? 'text-green-600' : 'text-gray-400'}`}>
                    {r.sent_at ? `✓ Report sent${r.view_count > 0 ? ` · ${r.view_count} view${r.view_count > 1 ? 's' : ''}` : ''}` : 'Report not sent'}
                  </div>
                )}
              </div>
              <span className="text-gray-300 text-lg flex-shrink-0">→</span>
            </Link>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Customer','Vehicle','Tech','Service','Status','Scheduled','Report',''].map(h => (
                <th key={h} className="text-left p-3 font-medium text-gray-500 text-xs">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!jobs?.length && (
              <tr><td colSpan={8} className="p-8 text-center text-gray-400">No jobs yet. <Link href="/admin/jobs/new" className="text-red-600">Create one</Link></td></tr>
            )}
            {jobs?.map(job => {
              const c = job.customer as unknown as { first_name: string; last_name: string; phone: string } | null
              const v = job.vehicle as unknown as { year: string; make: string; model: string } | null
              const t = job.assigned_tech as unknown as { first_name: string; last_name: string } | null
              const r = job.report as unknown as { public_slug: string; view_count: number; sent_at: string } | null
              return (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{c ? `${c.first_name} ${c.last_name}` : '—'}</div>
                    <div className="text-xs text-gray-400">{c?.phone ?? ''}</div>
                  </td>
                  <td className="p-3 text-gray-700">{v ? `${v.year} ${v.make} ${v.model}` : '—'}</td>
                  <td className="p-3 text-gray-700">{t ? `${t.first_name} ${t.last_name}` : '—'}</td>
                  <td className="p-3">
                    <div>{SERVICE_TYPE_LABEL[job.service_type as keyof typeof SERVICE_TYPE_LABEL] ?? job.service_type}</div>
                    <div className="text-xs text-gray-400">{job.tire_count} tires</div>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${JOB_STATUS_COLOR[job.status as keyof typeof JOB_STATUS_COLOR]}`}>
                      {JOB_STATUS_LABEL[job.status as keyof typeof JOB_STATUS_LABEL]}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{job.scheduled_start ? formatDate(job.scheduled_start, { month: 'short', day: 'numeric' }) : '—'}</td>
                  <td className="p-3">
                    {r ? (
                      <div className="text-xs">
                        <div className={r.sent_at ? 'text-green-600' : 'text-gray-400'}>
                          {r.sent_at ? '✓ Sent' : 'Not sent'}
                        </div>
                        {r.view_count > 0 && <div className="text-blue-500">{r.view_count} view{r.view_count > 1 ? 's' : ''}</div>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <Link href={`/admin/jobs/${job.id}`} className="text-red-600 hover:text-red-800 font-medium text-xs">
                      View →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
