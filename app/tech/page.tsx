import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime } from '@/lib/utils'
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR, SERVICE_TYPE_LABEL } from '@/lib/types'

export default async function TechHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()

  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today.getTime() + 86400000)

  // Techs see assigned jobs; admins/dispatchers see all
  let query = supabase.from('jobs')
    .select(`
      id, status, service_type, tire_count, scheduled_start, internal_notes,
      customer:customers(first_name, last_name, phone, address, city),
      vehicle:vehicles(year, make, model, color, license_plate),
      report:reports(public_slug, sent_at)
    `)
    .eq('company_id', profile?.company_id)
    .not('status', 'in', '("cancelled")')
    .order('scheduled_start', { ascending: true })

  if (profile?.role === 'technician') {
    query = query.eq('assigned_tech_id', user.id)
  }

  const { data: jobs } = await query

  const isToday = (d: string | null) => !!d && new Date(d) >= today && new Date(d) < tomorrow
  const todayJobs      = jobs?.filter(j => isToday(j.scheduled_start)) ?? []
  const inProgressJobs = jobs?.filter(j => j.status === 'in_progress') ?? []
  const completedJobs  = jobs?.filter(j => ['completed','report_generated','report_sent'].includes(j.status) && isToday(j.scheduled_start)) ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-gray-500 text-sm">{formatDate(new Date().toISOString(), { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {inProgressJobs.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">In Progress</h2>
          </div>
          <div className="space-y-3">
            {inProgressJobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      )}

      {todayJobs.filter(j => j.status === 'scheduled' || j.status === 'en_route' || j.status === 'arrived').length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-3">Today&apos;s Jobs</h2>
          <div className="space-y-3">
            {todayJobs
              .filter(j => j.status === 'scheduled' || j.status === 'en_route' || j.status === 'arrived')
              .map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      )}

      {completedJobs.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide mb-3">Completed Today</h2>
          <div className="space-y-3">
            {completedJobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </section>
      )}

      {!jobs?.length && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <div className="font-semibold text-gray-900 mb-1">No jobs assigned</div>
          <div className="text-gray-500 text-sm">Check back soon or contact your dispatcher.</div>
        </div>
      )}
    </div>
  )
}

function JobCard({ job }: { job: Record<string, unknown> }) {
  const c = job.customer as { first_name: string; last_name: string; phone: string; address: string; city: string } | null
  const v = job.vehicle  as { year: string; make: string; model: string; color: string; license_plate: string } | null
  const r = job.report   as { public_slug: string; sent_at: string } | null
  const status = String(job.status)

  return (
    <Link href={`/tech/jobs/${job.id}`}>
      <div className="card p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900">
                {c ? `${c.first_name} ${c.last_name}` : 'No customer'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOB_STATUS_COLOR[status as keyof typeof JOB_STATUS_COLOR]}`}>
                {JOB_STATUS_LABEL[status as keyof typeof JOB_STATUS_LABEL]}
              </span>
            </div>
            {v && (
              <div className="text-sm text-gray-600">{v.year} {v.make} {v.model} {v.color ? `· ${v.color}` : ''}</div>
            )}
            {c?.address && (
              <div className="text-sm text-gray-500 truncate mt-0.5">{c.address}{c.city ? `, ${c.city}` : ''}</div>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>{SERVICE_TYPE_LABEL[String(job.service_type) as keyof typeof SERVICE_TYPE_LABEL]}</span>
              <span>·</span>
              <span>{String(job.tire_count)} tires</span>
              {job.scheduled_start != null && (
                <>
                  <span>·</span>
                  <span>{formatTime(String(job.scheduled_start))}</span>
                </>
              )}
            </div>
          </div>
          <div className="text-gray-300">→</div>
        </div>

        {r?.sent_at && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-green-600">
            <span>✓ Report sent</span>
            <Link href={`/report/${r.public_slug}`} target="_blank"
              onClick={e => e.stopPropagation()}
              className="text-blue-500 hover:underline">
              View report
            </Link>
          </div>
        )}
      </div>
    </Link>
  )
}
