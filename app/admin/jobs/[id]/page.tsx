import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatTime, vehicleLabel, customerName } from '@/lib/utils'
import { JOB_STATUS_LABEL, JOB_STATUS_COLOR, SERVICE_TYPE_LABEL, TIRE_POSITION_LABEL } from '@/lib/types'

export default async function AdminJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      vehicle:vehicles(*),
      assigned_tech:users!jobs_assigned_tech_id_fkey(id, first_name, last_name, phone, email),
      tire_records(*),
      photos(*),
      checklist_items(*),
      report:reports(*)
    `)
    .eq('id', id)
    .single()

  if (!job) notFound()

  const report = job.report as Record<string, unknown> | null
  const tires  = (job.tire_records ?? []) as Array<Record<string, unknown>>
  const photos = (job.photos ?? []) as Array<Record<string, unknown>>
  const checks = (job.checklist_items ?? []) as Array<{ label: string; completed: boolean; required: boolean }>
  const tech   = job.assigned_tech as { first_name: string; last_name: string; phone: string } | null
  const cust   = job.customer as { first_name: string; last_name: string; phone: string; email: string } | null
  const veh    = job.vehicle as { year: string; make: string; model: string; color: string; license_plate: string } | null

  const completed = checks.filter(c => c.completed).length
  const total     = checks.length

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/jobs" className="text-gray-400 hover:text-gray-700 text-sm">← Jobs</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {cust ? `${cust.first_name} ${cust.last_name}` : 'Job Detail'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {veh ? `${veh.year} ${veh.make} ${veh.model}` : ''} · {SERVICE_TYPE_LABEL[job.service_type as keyof typeof SERVICE_TYPE_LABEL]}
          </p>
        </div>
        <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${JOB_STATUS_COLOR[job.status as keyof typeof JOB_STATUS_COLOR]}`}>
          {JOB_STATUS_LABEL[job.status as keyof typeof JOB_STATUS_LABEL]}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Job info */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Job Info</h2>
          <InfoRow label="Service"   value={SERVICE_TYPE_LABEL[job.service_type as keyof typeof SERVICE_TYPE_LABEL]} />
          <InfoRow label="Tires"     value={`${job.tire_count}`} />
          <InfoRow label="Scheduled" value={job.scheduled_start ? formatDate(job.scheduled_start) : '—'} />
          <InfoRow label="Started"   value={job.started_at ? formatTime(job.started_at) : '—'} />
          <InfoRow label="Completed" value={job.completed_at ? formatTime(job.completed_at) : '—'} />
          <InfoRow label="City"      value={[job.service_city, job.service_state].filter(Boolean).join(', ') || '—'} />
          {job.invoice_number && <InfoRow label="Invoice" value={job.invoice_number} />}
          {job.internal_notes && (
            <div>
              <div className="text-xs text-gray-500 mb-0.5">Internal Notes</div>
              <div className="text-sm text-gray-700 bg-yellow-50 p-2 rounded">{job.internal_notes}</div>
            </div>
          )}
        </div>

        {/* People */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">People</h2>
          {cust && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Customer</div>
              <div className="font-medium">{cust.first_name} {cust.last_name}</div>
              <div className="text-sm text-gray-500">{cust.phone} · {cust.email}</div>
            </div>
          )}
          {tech ? (
            <div>
              <div className="text-xs text-gray-500 mb-1">Technician</div>
              <div className="font-medium">{tech.first_name} {tech.last_name}</div>
              <div className="text-sm text-gray-500">{tech.phone}</div>
            </div>
          ) : (
            <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">No technician assigned</div>
          )}
        </div>
      </div>

      {/* Report status */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Report</h2>
          {report && (
            <Link href={`/report/${report.public_slug}`} target="_blank"
              className="text-red-600 text-sm font-medium hover:text-red-800">
              View Public Report →
            </Link>
          )}
        </div>
        {!report ? (
          <div className="text-sm text-gray-500">
            No report generated yet. Checklist: {completed}/{total} complete.
            {checks.filter(c => c.required && !c.completed).length > 0 && (
              <span className="text-orange-600"> ({checks.filter(c => c.required && !c.completed).length} required items outstanding)</span>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 text-xs">Status</div>
              <div className="font-medium capitalize">{String(report.status)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Views</div>
              <div className="font-medium">{String(report.view_count ?? 0)}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">Sent</div>
              <div className="font-medium">{report.sent_at ? formatTime(String(report.sent_at)) : 'Not sent'}</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs">First Viewed</div>
              <div className="font-medium">{report.first_viewed_at ? formatTime(String(report.first_viewed_at)) : '—'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tire Records */}
      {tires.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Tire Records ({tires.length})</h2>
          <div className="space-y-3">
            {tires.map(t => (
              <div key={String(t.id)} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium text-gray-700 w-32">
                  {TIRE_POSITION_LABEL[t.position as keyof typeof TIRE_POSITION_LABEL] ?? String(t.position)}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-500">Old Tire</div>
                    <div>{[t.old_brand, t.old_model, t.old_size].filter(Boolean).join(' ') || '—'}</div>
                    <div className="text-xs text-gray-500">Tread: {t.old_tread_depth ? `${t.old_tread_depth}/32` : '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">New Tire</div>
                    <div>{[t.new_brand, t.new_model, t.new_size].filter(Boolean).join(' ') || '—'}</div>
                    <div className="text-xs text-gray-500">PSI: {String(t.psi_after ?? '—')}</div>
                  </div>
                </div>
                {t.risk_level != null && (
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                    String(t.risk_level) === 'severe'   ? 'bg-red-100 text-red-700' :
                    String(t.risk_level) === 'high'     ? 'bg-orange-100 text-orange-700' :
                    String(t.risk_level) === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {String(t.risk_level)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      {photos.filter(p => p.show_in_report).length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Photos ({photos.length})</h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {photos.filter(p => p.url).map(p => (
              <a key={String(p.id)} href={String(p.url)} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={String(p.url)} alt={String(p.photo_type)}
                  className="w-full aspect-square object-cover rounded-lg hover:opacity-90 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Checklist ({completed}/{total})</h2>
        <div className="space-y-2">
          {checks.map(item => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                item.completed ? 'bg-green-500 border-green-500' : item.required ? 'border-orange-400' : 'border-gray-300'
              }`}>
                {item.completed && <span className="text-white text-xs">✓</span>}
              </div>
              <span className={item.completed ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
              {item.required && !item.completed && <span className="text-orange-500 text-xs">(required)</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}
