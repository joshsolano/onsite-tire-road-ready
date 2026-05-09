'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TIRE_POSITION_LABEL, ISSUE_LABEL, DEFAULT_CHECKLIST_ITEMS, JOB_STATUS_LABEL, SERVICE_TYPE_LABEL } from '@/lib/types'
import type { TireIssue, TirePosition, JobStatus } from '@/lib/types'
import { formatTime, missingItems, reportCompletenessPercent } from '@/lib/utils'
import Link from 'next/link'

type Tab = 'overview' | 'photos' | 'tires' | 'checklist' | 'report'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'photos',    label: 'Photos' },
  { id: 'tires',     label: 'Tires' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'report',    label: 'Report' },
]

const STATUS_ACTIONS: Partial<Record<JobStatus, { label: string; next: JobStatus }>> = {
  scheduled:   { label: '🚗 Start Driving',  next: 'en_route' },
  en_route:    { label: '📍 Mark Arrived',   next: 'arrived' },
  arrived:     { label: '🔧 Start Service',  next: 'in_progress' },
  in_progress: { label: '✅ Mark Complete',  next: 'completed' },
  completed:   { label: '✅ Completed',      next: 'completed' },
}

const REQUIRED_GENERAL_PHOTOS = [
  { type: 'vehicle_front',          label: 'Vehicle Front',     before_or_after: 'before' as const },
  { type: 'vehicle_rear',           label: 'Vehicle Rear',      before_or_after: 'before' as const },
  { type: 'vehicle_driver_side',    label: 'Driver Side',       before_or_after: 'before' as const },
  { type: 'vehicle_passenger_side', label: 'Passenger Side',    before_or_after: 'before' as const },
  { type: 'final_vehicle',          label: 'Final Vehicle',     before_or_after: 'after' as const },
  { type: 'final_wheel',            label: 'Final Wheel',       before_or_after: 'after' as const },
]

export default function TechJobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab]       = useState<Tab>('overview')
  const [job, setJob]       = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId]   = useState('')
  const [companyId, setCompanyId] = useState('')

  // Report state
  const [generating, setGenerating] = useState(false)
  const [sending,    setSending]    = useState(false)
  const [phone,      setPhone]      = useState('')
  const [reportMsg,  setReportMsg]  = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadSlot, setUploadSlot] = useState<{ type: string; before_or_after: string; position?: string; tireId?: string } | null>(null)

  const loadJob = useCallback(async () => {
    const { data } = await supabase.from('jobs')
      .select(`*, customer:customers(*), vehicle:vehicles(*), assigned_tech:users!jobs_assigned_tech_id_fkey(first_name,last_name,phone), tire_records(*), photos(*), checklist_items(*), report:reports(*)`)
      .eq('id', id).single()
    setJob(data)
    if (data?.customer) {
      const c = data.customer as { phone: string }
      setPhone(c.phone ?? '')
    }
  }, [id, supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
      setCompanyId(profile?.company_id ?? '')
      await loadJob()
      setLoading(false)
    }
    init()
  }, [loadJob, router, supabase])

  async function advanceStatus() {
    if (!job) return
    const current = job.status as JobStatus
    const action = STATUS_ACTIONS[current]
    if (!action || action.next === current) return

    const update: Record<string, unknown> = { status: action.next }
    if (action.next === 'en_route')    update.started_at  = new Date().toISOString()
    if (action.next === 'arrived')     update.arrived_at  = new Date().toISOString()
    if (action.next === 'completed')   update.completed_at = new Date().toISOString()

    await supabase.from('jobs').update(update).eq('id', id)
    await supabase.from('job_status_history').insert({
      job_id: id, status: action.next, changed_by: userId
    })
    await loadJob()
  }

  async function handlePhotoSlotClick(slotType: string, beforeAfter: string, position?: string, tireId?: string) {
    setUploadSlot({ type: slotType, before_or_after: beforeAfter, position, tireId })
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadSlot) return

    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${companyId}/${id}/${uploadSlot.type}_${uploadSlot.position ?? 'general'}_${Date.now()}.${ext}`

    const { error: upErr } = await supabase.storage.from('job-photos').upload(path, file, { upsert: true })
    if (upErr) { alert('Upload failed: ' + upErr.message); return }

    const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(path)

    await supabase.from('photos').insert({
      job_id:         id,
      vehicle_id:     (job?.vehicle as Record<string, string>)?.id ?? null,
      tire_record_id: uploadSlot.tireId ?? null,
      position:       uploadSlot.position ?? null,
      photo_type:     uploadSlot.type,
      before_or_after:uploadSlot.before_or_after,
      storage_path:   path,
      url:            urlData.publicUrl,
      uploaded_by:    userId,
      upload_state:   'complete',
    })

    e.target.value = ''
    setUploadSlot(null)
    await loadJob()
  }

  async function saveTireRecord(position: string, data: Record<string, unknown>) {
    const existing = (job?.tire_records as Array<{ id: string; position: string }>)?.find(t => t.position === position)
    if (existing) {
      await supabase.from('tire_records').update({ ...data, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('tire_records').insert({ job_id: id, vehicle_id: (job?.vehicle as Record<string,string>)?.id ?? null, position, ...data })
    }
    await loadJob()
  }

  async function toggleChecklist(itemId: string, completed: boolean) {
    await supabase.from('checklist_items').update({
      completed, completed_by: userId, completed_at: completed ? new Date().toISOString() : null
    }).eq('id', itemId)
    await loadJob()
  }

  async function generateReport() {
    setGenerating(true)
    setReportMsg('')
    const res = await fetch(`/api/jobs/${id}/generate`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setReportMsg(data.error ?? 'Generation failed'); setGenerating(false); return }
    setReportMsg('✓ Report generated successfully')
    await loadJob()
    setGenerating(false)
  }

  async function sendReport() {
    setSending(true)
    setReportMsg('')
    const res = await fetch(`/api/jobs/${id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })
    const data = await res.json()
    if (!res.ok) { setReportMsg(data.error ?? 'Send failed'); setSending(false); return }
    setReportMsg(`✓ Report sent to ${phone}`)
    await loadJob()
    setSending(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner" /></div>
  }
  if (!job) {
    return <div className="p-8 text-center text-gray-500">Job not found</div>
  }

  const c      = job.customer as { first_name: string; last_name: string; phone: string; address: string; city: string } | null
  const v      = job.vehicle  as { year: string; make: string; model: string; color: string; license_plate: string } | null
  const tires  = (job.tire_records as Array<Record<string, unknown>>) ?? []
  const photos = (job.photos       as Array<Record<string, unknown>>) ?? []
  const checks = (job.checklist_items as Array<Record<string, unknown>>) ?? []
  const report = job.report as Record<string, unknown> | null

  const completeness = reportCompletenessPercent({ ...job, tire_records: tires, photos, checklist_items: checks } as never)
  const missing      = missingItems({ ...job, tire_records: tires, photos, checklist_items: checks } as never)
  const action       = STATUS_ACTIONS[job.status as JobStatus]

  const photoBySlot = (type: string, beforeAfter: string, position?: string) =>
    photos.find(p => p.photo_type === type && p.before_or_after === beforeAfter && (!position || p.position === position))

  return (
    <div>
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFileChange} />

      {/* Job header */}
      <div className="mb-4">
        <Link href="/tech" className="text-gray-400 text-sm">← Jobs</Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {c ? `${c.first_name} ${c.last_name}` : 'Job'}
            </h1>
            <p className="text-gray-600 text-sm">{v ? `${v.year} ${v.make} ${v.model}` : ''}</p>
            {c?.address && <p className="text-gray-400 text-sm">{c.address}{c.city ? `, ${c.city}` : ''}</p>}
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-medium">
            {JOB_STATUS_LABEL[job.status as JobStatus]}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Report Completeness</span>
          <span className="text-sm font-bold text-gray-900">{completeness}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${completeness}%`, background: completeness >= 100 ? '#16a34a' : '#C41230' }} />
        </div>
        {missing.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {missing.slice(0, 3).map(m => (
              <div key={m} className="text-xs text-orange-600">• {m}</div>
            ))}
          </div>
        )}
      </div>

      {/* Status action button */}
      {action && job.status !== 'completed' && (
        <button onClick={advanceStatus} className="btn-primary w-full justify-center mb-4">
          {action.label}
        </button>
      )}

      {/* Tabs */}
      <div className="card mb-4">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Service</span><br /><strong>{SERVICE_TYPE_LABEL[job.service_type as keyof typeof SERVICE_TYPE_LABEL]}</strong></div>
              <div><span className="text-gray-500">Tires</span><br /><strong>{String(job.tire_count)}</strong></div>
              {job.scheduled_start != null && (
                <div><span className="text-gray-500">Scheduled</span><br /><strong>{formatTime(String(job.scheduled_start))}</strong></div>
              )}
              {v?.license_plate != null && (
                <div><span className="text-gray-500">Plate</span><br /><strong>{v.license_plate}</strong></div>
              )}
            </div>
            {job.internal_notes != null && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                <span className="font-medium text-yellow-800">Notes: </span>
                <span className="text-yellow-700">{String(job.internal_notes)}</span>
              </div>
            )}
            {c?.phone && (
              <a href={`tel:${c.phone}`} className="flex items-center gap-2 text-red-600 font-medium text-sm">
                📞 Call {c.first_name} · {c.phone}
              </a>
            )}
            {c?.address && (
              <a href={`https://maps.apple.com/?q=${encodeURIComponent(c.address)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 font-medium text-sm">
                🗺️ Navigate to {c.address}
              </a>
            )}
          </div>
        )}

        {/* ── PHOTOS TAB ── */}
        {tab === 'photos' && (
          <div className="p-4 space-y-5">
            <div>
              <h3 className="font-medium text-gray-900 mb-3 text-sm">General Photos</h3>
              <div className="grid grid-cols-3 gap-3">
                {REQUIRED_GENERAL_PHOTOS.map(slot => {
                  const existing = photoBySlot(slot.type, slot.before_or_after)
                  return (
                    <button key={slot.type}
                      onClick={() => handlePhotoSlotClick(slot.type, slot.before_or_after)}
                      className={`photo-slot ${existing ? 'filled' : 'required-empty'}`}>
                      {existing?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={String(existing.url)} alt={slot.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-2">
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-xs text-gray-500">{slot.label}</div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {tires.map(tire => (
              <div key={String(tire.id)}>
                <h3 className="font-medium text-gray-900 mb-2 text-sm">
                  {TIRE_POSITION_LABEL[String(tire.position) as TirePosition] ?? String(tire.position)}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: 'tire_before',       label: 'Before', ba: 'before' },
                    { type: 'tire_tread',         label: 'Tread',  ba: 'before' },
                    { type: 'tire_after',         label: 'After',  ba: 'after' },
                    { type: 'new_tire_installed', label: 'New Tire',ba: 'after' },
                  ].map(s => {
                    const ex = photoBySlot(s.type, s.ba, String(tire.position))
                    return (
                      <button key={s.type}
                        onClick={() => handlePhotoSlotClick(s.type, s.ba, String(tire.position), String(tire.id))}
                        className={`photo-slot ${ex ? 'filled' : s.ba === 'before' ? 'required-empty' : ''}`}>
                        {ex?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={String(ex.url)} alt={s.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-1">
                            <div className="text-xl mb-0.5">📷</div>
                            <div className="text-xs text-gray-500">{s.label}</div>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {tires.length === 0 && (
              <p className="text-gray-400 text-sm">Add tire records first to see per-tire photo slots.</p>
            )}
          </div>
        )}

        {/* ── TIRES TAB ── */}
        {tab === 'tires' && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-500">Add a record for each tire position serviced.</p>
            {Array.from({ length: job.tire_count as number }).map((_, i) => {
              const positions: TirePosition[] = ['front_driver','front_passenger','rear_driver','rear_passenger','rear_inner_driver','rear_outer_driver','rear_inner_passenger','rear_outer_passenger']
              const pos = positions[i] ?? positions[0]
              const existing = tires.find(t => t.position === pos)
              return <TireForm key={pos} position={pos} existing={existing ?? null} onSave={(data) => saveTireRecord(pos, data)} />
            })}
          </div>
        )}

        {/* ── CHECKLIST TAB ── */}
        {tab === 'checklist' && (
          <div className="p-4 space-y-2">
            {checks.length === 0 && <p className="text-gray-400 text-sm">No checklist items. This job may need to be recreated.</p>}
            {checks.map(item => (
              <button key={String(item.id)}
                onClick={() => toggleChecklist(String(item.id), !item.completed)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  item.completed ? 'bg-green-500 border-green-500 animate-stamp' : item.required ? 'border-orange-400' : 'border-gray-300'
                }`}>
                  {!!item.completed && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className={`text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {String(item.label)}
                </span>
                {!!item.required && !item.completed && (
                  <span className="ml-auto text-xs text-orange-500">required</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── REPORT TAB ── */}
        {tab === 'report' && (
          <div className="p-4 space-y-4">
            {/* Completeness */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-1">Completeness: {completeness}%</div>
              {missing.length > 0 ? (
                <div className="space-y-1">
                  {missing.map(m => <div key={m} className="text-xs text-orange-600">• {m}</div>)}
                </div>
              ) : (
                <div className="text-xs text-green-600">✓ All required items complete</div>
              )}
            </div>

            {/* Generate */}
            <button onClick={generateReport} disabled={generating}
              className="btn-primary w-full justify-center">
              {generating ? <><span className="spinner" /> Generating…</> : '⚡ Generate Report'}
            </button>

            {/* Send */}
            {report && (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  ✓ Report generated. View: <a href={`/report/${report.public_slug}`} target="_blank" className="underline font-medium">
                    /report/{String(report.public_slug).slice(0,8)}…
                  </a>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Send to phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="(210) 555-0100" type="tel" className="input-field" />
                </div>

                <button onClick={sendReport} disabled={sending || !phone}
                  className="btn-primary w-full justify-center">
                  {sending ? <><span className="spinner" /> Sending…</> : `📱 Send Report by SMS`}
                </button>

                <div className="text-center">
                  <a href={`/report/${report.public_slug}`} target="_blank"
                    className="text-blue-600 text-sm hover:underline">
                    Preview report →
                  </a>
                </div>
              </div>
            )}

            {reportMsg && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                reportMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {reportMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Inline TireForm component ─────────────────────────────────────────────────

function TireForm({ position, existing, onSave }: {
  position: TirePosition
  existing: Record<string, unknown> | null
  onSave: (data: Record<string, unknown>) => void
}) {
  const [open, setOpen] = useState(!!existing)
  const [form, setForm] = useState(() => ({
    old_brand: String(existing?.old_brand ?? ''),
    old_model: String(existing?.old_model ?? ''),
    old_size:  String(existing?.old_size  ?? ''),
    old_dot:   String(existing?.old_dot   ?? ''),
    old_tread_depth: existing?.old_tread_depth?.toString() ?? '',
    old_issues: (existing?.old_issues as TireIssue[]) ?? [],
    new_brand: String(existing?.new_brand ?? ''),
    new_model: String(existing?.new_model ?? ''),
    new_size:  String(existing?.new_size  ?? ''),
    new_dot:   String(existing?.new_dot   ?? ''),
    psi_after: existing?.psi_after?.toString() ?? '',
    torque_checked:      Boolean(existing?.torque_checked),
    tpms_checked:        Boolean(existing?.tpms_checked),
    valve_stem_replaced: Boolean(existing?.valve_stem_replaced),
    wheel_inspected:     Boolean(existing?.wheel_inspected),
    tech_note: String(existing?.tech_note ?? ''),
  }))
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const toggleIssue = (issue: TireIssue) => {
    setForm(f => ({
      ...f,
      old_issues: f.old_issues.includes(issue)
        ? f.old_issues.filter(i => i !== issue)
        : [...f.old_issues, issue],
    }))
  }

  async function handleSave() {
    setSaving(true)
    const { calculateRiskLevel, calculateLifeLeft } = await import('@/lib/calculations')
    const payload = {
      ...form,
      old_tread_depth: form.old_tread_depth ? parseFloat(form.old_tread_depth) : null,
      psi_after:       form.psi_after ? parseFloat(form.psi_after) : null,
      torque_checked:  form.torque_checked,
      tpms_checked:    form.tpms_checked,
      valve_stem_replaced: form.valve_stem_replaced,
      wheel_inspected: form.wheel_inspected,
    }
    const riskLevel = calculateRiskLevel(payload)
    const lifeLeft  = calculateLifeLeft(payload)
    onSave({
      ...payload,
      risk_level:               riskLevel,
      estimated_life_left_pct:  lifeLeft.pct,
      estimated_life_left_text: lifeLeft.text,
      estimated_miles_remaining: lifeLeft.miles_high,
    })
    setSaving(false)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900">
            {TIRE_POSITION_LABEL[position]}
          </span>
          {existing && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ Recorded</span>}
          {existing?.risk_level != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
              existing.risk_level === 'severe' ? 'bg-red-100 text-red-700' :
              existing.risk_level === 'high'   ? 'bg-orange-100 text-orange-700' :
              existing.risk_level === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {String(existing.risk_level)}
            </span>
          )}
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Old Tire</h4>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Brand (e.g. Goodyear)" value={form.old_brand} onChange={e => set('old_brand', e.target.value)} className="input-field text-sm" />
              <input placeholder="Model" value={form.old_model} onChange={e => set('old_model', e.target.value)} className="input-field text-sm" />
              <input placeholder="Size (e.g. 235/65R17)" value={form.old_size} onChange={e => set('old_size', e.target.value)} className="input-field text-sm" />
              <input placeholder="DOT (e.g. 2319)" value={form.old_dot} onChange={e => set('old_dot', e.target.value)} className="input-field text-sm" maxLength={6} />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Tread Depth (in 32nds)</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('old_tread_depth', Math.max(0, parseFloat(form.old_tread_depth||'0') - 1).toString())}
                  className="w-10 h-10 rounded-lg border border-gray-300 text-xl font-bold text-gray-600 flex items-center justify-center">−</button>
                <div className="text-center">
                  <span className="text-2xl font-bold text-gray-900">{form.old_tread_depth || '0'}</span>
                  <span className="text-gray-500">/32</span>
                </div>
                <button type="button" onClick={() => set('old_tread_depth', (parseFloat(form.old_tread_depth||'0') + 1).toString())}
                  className="w-10 h-10 rounded-lg border border-gray-300 text-xl font-bold text-gray-600 flex items-center justify-center">+</button>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-2">Issues Found</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(ISSUE_LABEL) as [TireIssue, string][]).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => toggleIssue(k)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      form.old_issues.includes(k)
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-gray-500'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">New Tire</h4>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Brand (e.g. Michelin)" value={form.new_brand} onChange={e => set('new_brand', e.target.value)} className="input-field text-sm" />
              <input placeholder="Model" value={form.new_model} onChange={e => set('new_model', e.target.value)} className="input-field text-sm" />
              <input placeholder="Size" value={form.new_size} onChange={e => set('new_size', e.target.value)} className="input-field text-sm" />
              <input placeholder="DOT" value={form.new_dot} onChange={e => set('new_dot', e.target.value)} className="input-field text-sm" maxLength={6} />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PSI After Install</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => set('psi_after', Math.max(0, parseFloat(form.psi_after||'0') - 1).toString())}
                    className="w-8 h-8 rounded border border-gray-300 text-sm font-bold">−</button>
                  <span className="text-lg font-bold w-8 text-center">{form.psi_after || '—'}</span>
                  <button type="button" onClick={() => set('psi_after', (parseFloat(form.psi_after||'0') + 1).toString())}
                    className="w-8 h-8 rounded border border-gray-300 text-sm font-bold">+</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              {[
                { key: 'torque_checked',    label: '✅ Torque Checked' },
                { key: 'tpms_checked',      label: '📡 TPMS Checked' },
                { key: 'valve_stem_replaced',label: '🔩 Valve Stem' },
                { key: 'wheel_inspected',   label: '🔍 Wheel Inspected' },
              ].map(({ key, label }) => (
                <button key={key} type="button"
                  onClick={() => set(key, !form[key as keyof typeof form])}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                    form[key as keyof typeof form]
                      ? 'bg-green-50 border-green-400 text-green-700'
                      : 'border-gray-200 text-gray-500'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tech Note (shown in report)</label>
            <textarea value={form.tech_note} onChange={e => set('tech_note', e.target.value)}
              className="input-field text-sm" rows={2} placeholder="Any notes for the customer…" />
          </div>

          <button type="button" onClick={handleSave} disabled={saving}
            className="btn-primary w-full justify-center text-sm">
            {saving ? <span className="spinner" /> : 'Save Tire Record'}
          </button>
        </div>
      )}
    </div>
  )
}
