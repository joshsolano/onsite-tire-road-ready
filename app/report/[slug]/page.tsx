import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { TIRE_POSITION_LABEL, RISK_LABEL, SERVICE_TYPE_LABEL } from '@/lib/types'
import type { Metadata } from 'next'
import Link from 'next/link'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServiceClient()
  const { data: report } = await supabase.from('reports').select('*, job:jobs(*, vehicle:vehicles(*), customer:customers(*))').eq('public_slug', slug).single()
  if (!report) return { title: 'Road Ready Report' }
  const v = (report.job as Record<string, unknown>)?.vehicle as { year: string; make: string; model: string } | null
  return {
    title: `Road Ready Report${v ? ` · ${v.year} ${v.make} ${v.model}` : ''}`,
    description: 'Your vehicle is road ready. View your tire service report.',
    openGraph: { title: 'Road Ready Report', description: 'Your tire service report is ready.', type: 'website' },
  }
}

export default async function PublicReportPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServiceClient()

  const { data: report } = await supabase
    .from('reports')
    .select(`
      *,
      job:jobs(
        *, service_type, tire_count, completed_at, service_city, service_state,
        customer:customers(first_name, last_name),
        vehicle:vehicles(year, make, model, color, vin),
        assigned_tech:users!jobs_assigned_tech_id_fkey(first_name, last_name),
        tire_records(*, photos(*)),
        checklist_items(*),
        photos(*)
      ),
      company:companies(name, logo_url, phone, google_review_url, primary_color)
    `)
    .eq('public_slug', slug)
    .single()

  if (!report) notFound()

  const job      = report.job as Record<string, unknown>
  const company  = report.company as { name: string; logo_url: string; phone: string; google_review_url: string; primary_color: string } | null
  const customer = job?.customer as { first_name: string; last_name: string } | null
  const vehicle  = job?.vehicle  as { year: string; make: string; model: string; color: string; vin: string } | null
  const tech     = job?.assigned_tech as { first_name: string; last_name: string } | null
  const tires    = (job?.tire_records as Array<Record<string, unknown>>) ?? []
  const allPhotos = (job?.photos as Array<Record<string, unknown>>) ?? []
  const checks   = (job?.checklist_items as Array<Record<string, unknown>>) ?? []

  const riskSummary = report.risk_summary as { level: string; reasons: string[] } | null
  const timeSaved   = report.time_saved_minutes as number | null
  const badges      = (report.good_call_badges as string[]) ?? []
  const facts       = (report.tire_facts as string[]) ?? []
  const nextDate    = report.next_service_date as string | null

  const serviceDate = job?.completed_at ? formatDate(String(job.completed_at)) : formatDate(String(report.created_at))
  const location    = [job?.service_city, job?.service_state].filter(Boolean).join(', ')
  const timeSavedHours = timeSaved ? (timeSaved / 60).toFixed(1) : null

  // Track view (fire-and-forget)
  fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/report/${slug}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  }).catch(() => {})

  const riskColor = {
    severe: { bg: '#FEF2F2', text: '#B91C1C', bar: '#DC2626' },
    high:   { bg: '#FFF7ED', text: '#C2410C', bar: '#F97316' },
    moderate:{ bg: '#FEFCE8',text: '#854D0E', bar: '#EAB308' },
    low:    { bg: '#F0FDF4', text: '#15803D', bar: '#22C55E' },
  }[riskSummary?.level ?? 'low'] ?? { bg: '#F0FDF4', text: '#15803D', bar: '#22C55E' }

  return (
    <div className="min-h-screen" style={{ background: '#F2F2F2' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#0A0A0A', color: 'white' }}>
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            {/* Logo */}
            <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8 flex-shrink-0">
                <circle cx="16" cy="16" r="14" stroke="#444" strokeWidth="1.5"/>
                <circle cx="16" cy="16" r="9" stroke="#555" strokeWidth="1.5"/>
                <path d="M16 8c-3.3 0-6 2.7-6 6 0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6z" fill="#C41230"/>
                <circle cx="16" cy="14" r="2" fill="white"/>
              </svg>
              <div>
                <div className="font-bold text-sm leading-none">{company?.name ?? 'Road Ready'}</div>
                <div className="text-gray-400 text-xs">Mobile Tire Service</div>
              </div>
            </Link>
            <div className="flex items-center gap-1.5 bg-green-800 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-green-200 text-xs font-medium">Road Ready</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">Road Ready Report</div>
            <h1 className="text-2xl font-bold mb-1">
              {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Your Vehicle'}
            </h1>
            <p className="text-gray-300 text-sm">
              {serviceDate}{location ? ` · ${location}` : ''}{tech ? ` · ${tech.first_name} ${tech.last_name}` : ''}
            </p>
            <p className="text-gray-400 text-sm mt-0.5">
              {SERVICE_TYPE_LABEL[String(job?.service_type) as keyof typeof SERVICE_TYPE_LABEL] ?? 'Tire Service'}
              {job?.tire_count ? ` · ${job.tire_count} tires` : ''}
            </p>
          </div>

          {/* Hero stat row */}
          <div className="grid grid-cols-3 gap-3">
            {timeSavedHours && (
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-xl font-bold text-white">{timeSavedHours}h</div>
                <div className="text-gray-400 text-xs">Time Saved</div>
              </div>
            )}
            {tires.length > 0 && (
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-xl font-bold text-white">{tires.length}</div>
                <div className="text-gray-400 text-xs">Tires {job?.service_type === 'tire_repair' ? 'Repaired' : 'Replaced'}</div>
              </div>
            )}
            {riskSummary && (
              <div className="text-center p-3 bg-white/5 rounded-xl">
                <div className="text-xl font-bold" style={{ color: riskColor.bar }}>{RISK_LABEL[riskSummary.level as keyof typeof RISK_LABEL]}</div>
                <div className="text-gray-400 text-xs">Risk Level</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tire track divider */}
      <div className="tire-track-divider" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* ── GOOD CALL SUMMARY ────────────────────────────────────────────── */}
        {badges.length > 0 && (
          <Section title="Good Call Getting This Done">
            <p className="text-gray-700 text-sm mb-4">
              Your old tires were showing signs of wear that can affect safety, reliability, and control.
              Replacing them now helps you avoid a bigger problem down the road.
            </p>
            <div className="flex flex-wrap gap-2">
              {badges.map(badge => (
                <span key={badge} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                  style={{ background: '#0A0A0A', color: 'white' }}>
                  <span style={{ color: '#C41230' }}>✓</span> {badge}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* ── BEFORE AND AFTER PHOTOS ──────────────────────────────────────── */}
        {tires.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Before &amp; After</h2>
              <div className="flex-1 tire-track-divider" />
            </div>
            <div className="space-y-4">
              {tires.map(tire => {
                const pos    = String(tire.position)
                const tirePhotos = (tire.photos as Array<Record<string, unknown>>) ?? []
                const beforePhoto = tirePhotos.find(p => p.before_or_after === 'before' && p.photo_type === 'tire_before')
                  || allPhotos.find(p => p.before_or_after === 'before' && p.position === pos)
                const afterPhoto = tirePhotos.find(p => p.before_or_after === 'after' && p.photo_type === 'tire_after')
                  || allPhotos.find(p => p.before_or_after === 'after' && p.position === pos)

                return (
                  <div key={String(tire.id)} className="card overflow-hidden">
                    <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                      <div className="font-semibold text-sm text-gray-900">
                        {TIRE_POSITION_LABEL[pos as keyof typeof TIRE_POSITION_LABEL] ?? pos}
                      </div>
                      {tire.risk_level != null && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{ background: riskColor.bg, color: riskColor.text }}>
                          {String(tire.risk_level)} risk
                        </span>
                      )}
                    </div>

                    {/* Photos */}
                    {(beforePhoto || afterPhoto) && (
                      <div className="grid grid-cols-2 gap-1 px-4 pb-4">
                        <div>
                          <div className="text-xs text-gray-400 mb-1 text-center">Before</div>
                          {beforePhoto?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={String(beforePhoto.url)} alt="Before" className="w-full aspect-square object-cover rounded-lg" />
                          ) : (
                            <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No photo</div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1 text-center">After</div>
                          {afterPhoto?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={String(afterPhoto.url)} alt="After" className="w-full aspect-square object-cover rounded-lg" />
                          ) : (
                            <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs">No photo</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tire data */}
                    <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Old Tire</div>
                        <div className="font-medium text-gray-800">{[tire.old_brand, tire.old_model].filter(Boolean).join(' ') || '—'}</div>
                        <div className="text-xs text-gray-500">{String(tire.old_size ?? '—')}</div>
                        <div className="text-xs text-gray-500">Tread: {tire.old_tread_depth ? `${tire.old_tread_depth}/32` : '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400 mb-1">New Tire</div>
                        <div className="font-medium text-gray-800">{[tire.new_brand, tire.new_model].filter(Boolean).join(' ') || '—'}</div>
                        <div className="text-xs text-gray-500">{String(tire.new_size ?? '—')}</div>
                        {tire.psi_after != null && <div className="text-xs text-gray-500">PSI: {String(tire.psi_after)}</div>}
                      </div>
                    </div>

                    {/* Tread gauge */}
                    {tire.old_tread_depth != null && (
                      <div className="px-4 pb-3">
                        <TreadBar depth={Number(tire.old_tread_depth)} label="Tread at service" />
                      </div>
                    )}

                    {tire.tech_note != null && (
                      <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600 italic">
                        &ldquo;{String(tire.tech_note)}&rdquo;
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── TIRE DANGER SNAPSHOT ────────────────────────────────────────── */}
        {riskSummary && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Tire Condition Summary</h2>
              <div className="flex-1 tire-track-divider" />
            </div>
            <div className="card p-5" style={{ background: riskColor.bg, border: `1px solid ${riskColor.bar}30` }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold capitalize" style={{ color: riskColor.text }}>
                  {RISK_LABEL[riskSummary.level as keyof typeof RISK_LABEL]} Risk
                </span>
              </div>
              {riskSummary.reasons.length > 0 && (
                <div className="space-y-1 mb-4">
                  {riskSummary.reasons.map(r => (
                    <div key={r} className="flex items-center gap-2 text-sm" style={{ color: riskColor.text }}>
                      <span>›</span> {r}
                    </div>
                  ))}
                </div>
              )}
              <div className="p-3 bg-white/60 rounded-lg text-sm text-gray-700">
                Worn or damaged tires can affect stopping distance, wet traction, and handling — especially during hard braking
                or sudden maneuvers. You avoided pushing these tires further than they needed to go.
              </div>
            </div>
          </section>
        )}

        {/* ── ESTIMATED LIFE LEFT ─────────────────────────────────────────── */}
        {tires.some(t => t.old_tread_depth != null) && (
          <Section title="Estimated Life Left">
            <div className="space-y-3">
              {tires.filter(t => t.old_tread_depth != null).map(tire => {
                const depth = Number(tire.old_tread_depth)
                const usable = Math.max(0, depth - 2)
                const pct = Math.round((usable / 8) * 100)
                const safety = tire.estimated_life_left_text

                return (
                  <div key={String(tire.id)} className="flex items-center gap-3">
                    <div className="text-sm text-gray-600 w-36 flex-shrink-0">
                      {TIRE_POSITION_LABEL[String(tire.position) as keyof typeof TIRE_POSITION_LABEL] ?? String(tire.position)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct <= 15 ? '#DC2626' : pct <= 30 ? '#F97316' : '#22C55E' }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 w-10 text-right">{pct}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {tires[0]?.estimated_life_left_text != null && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {String(tires[0].estimated_life_left_text)}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              This is an estimate based on tread depth, tire age, and visible condition.
              Damage, heat, and punctures can make a tire unsafe even when tread remains.
            </p>
          </Section>
        )}

        {/* ── WHAT COULD HAVE HAPPENED ─────────────────────────────────────── */}
        <Section title="What Bad Tires Can Lead To">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🛑', text: 'Longer stopping distance' },
              { icon: '🌧️', text: 'Poor traction in rain' },
              { icon: '💧', text: 'Higher hydroplaning risk' },
              { icon: '💥', text: 'Blowouts at highway speed' },
              { icon: '⚠️', text: 'Loss of control when braking' },
              { icon: '🚨', text: 'Getting stranded roadside' },
              { icon: '↔️', text: 'Uneven handling and pull' },
              { icon: '⏱️', text: 'Unexpected downtime' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-lg">{icon}</span>
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg text-sm font-medium text-center"
            style={{ background: '#0A0A0A', color: 'white' }}>
            You took care of it before it became a roadside problem. ✓
          </div>
        </Section>

        {/* ── TIME SAVED ──────────────────────────────────────────────────── */}
        {timeSaved && (
          <Section title="Time Saved vs. a Tire Shop">

            {/* Hero */}
            <div className="rounded-2xl p-5 mb-4 text-center" style={{ background: '#0A0A0A' }}>
              <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">You got back</div>
              <div className="text-5xl font-bold text-white mb-1">
                {timeSaved >= 60
                  ? <>{Math.floor(timeSaved / 60)}<span className="text-3xl font-semibold">h </span>{timeSaved % 60 > 0 ? <>{timeSaved % 60}<span className="text-3xl font-semibold">m</span></> : null}</>
                  : <>{timeSaved}<span className="text-3xl font-semibold">m</span></>
                }
              </div>
              <div className="text-gray-400 text-sm">of your day — for free</div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Traditional shop column */}
              <div className="rounded-xl p-4 border-2 border-red-100 bg-red-50">
                <div className="text-xs font-bold uppercase tracking-wide text-red-400 mb-3">Traditional Shop</div>
                <div className="space-y-2.5">
                  {[
                    { step: 'Drive there',      min: 25 },
                    { step: 'Check in',         min: 15 },
                    { step: 'Wait for service', min: 75 },
                    { step: 'Drive back',       min: 25 },
                  ].map(({ step, min }) => (
                    <div key={step} className="flex items-center justify-between">
                      <span className="text-xs text-red-700">{step}</span>
                      <span className="text-xs font-semibold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">~{min}m</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-red-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-red-800">Total</span>
                    <span className="text-sm font-bold text-red-700">~{Math.round((25+15+75+25)/60 * 10) / 10}hrs</span>
                  </div>
                </div>
              </div>

              {/* Mobile service column */}
              <div className="rounded-xl p-4 border-2 border-green-200 bg-green-50">
                <div className="text-xs font-bold uppercase tracking-wide text-green-600 mb-3">Road Ready Mobile</div>
                <div className="space-y-2.5">
                  {[
                    { step: 'Drive there',      val: 'None' },
                    { step: 'Check in',         val: 'None' },
                    { step: 'Wait for service', val: 'At home' },
                    { step: 'Drive back',       val: 'None' },
                  ].map(({ step, val }) => (
                    <div key={step} className="flex items-center justify-between">
                      <span className="text-xs text-green-700">{step}</span>
                      <span className="text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">✓ {val}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-green-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-green-800">Total</span>
                    <span className="text-sm font-bold text-green-700">Done at your door</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual bar comparison */}
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Traditional shop visit</span>
                  <span>~{Math.round((25+15+75+25)/60 * 10) / 10} hrs</span>
                </div>
                <div className="h-3 bg-red-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Mobile service (what you paid for)</span>
                  <span>~{timeSaved < 60 ? `${timeSaved}m` : `${(timeSaved / 60).toFixed(1)}h`} saved</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: '8%', background: '#22C55E' }} />
                </div>
              </div>
            </div>

            <div className="text-center p-3 rounded-xl text-sm font-medium" style={{ background: '#0A0A0A', color: 'white' }}>
              No drive. No waiting room. No wasted afternoon. ✓
            </div>
          </Section>
        )}

        {/* ── SERVICE CHECKLIST ───────────────────────────────────────────── */}
        {checks.length > 0 && (
          <Section title="Service Completed">
            <div className="space-y-2">
              {checks.filter(c => c.completed).map(item => (
                <div key={String(item.id)} className="flex items-center gap-3 p-2">
                  <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">✓</span>
                  </div>
                  <span className="text-sm text-gray-700">{String(item.label)}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── TIRE FACTS ──────────────────────────────────────────────────── */}
        {facts.length > 0 && (
          <Section title="A Few Things Worth Knowing">
            <div className="space-y-3">
              {facts.map((fact, i) => (
                <div key={i} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-300 font-mono text-sm flex-shrink-0 mt-0.5">→</span>
                  <p className="text-sm text-gray-700">{fact}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── WARRANTY ────────────────────────────────────────────────────── */}
        {tires.some(t => t.new_brand) && (
          <Section title="Warranty Information">
            <div className="text-sm text-gray-600 space-y-3">
              {tires.filter(t => t.new_brand).map(tire => (
                <div key={String(tire.id)} className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-gray-900 mb-2">
                    {TIRE_POSITION_LABEL[String(tire.position) as keyof typeof TIRE_POSITION_LABEL]}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-gray-500">Tire</span>
                    <span>{[tire.new_brand, tire.new_model, tire.new_size].filter(Boolean).join(' ')}</span>
                    {tire.new_dot != null && (<><span className="text-gray-500">DOT</span><span>{String(tire.new_dot)}</span></>)}
                    {tire.torque_checked != null && (<><span className="text-gray-500">Torque</span><span className="text-green-600">✓ Verified</span></>)}
                    {tire.tpms_checked != null   && (<><span className="text-gray-500">TPMS</span><span className="text-green-600">✓ Checked</span></>)}
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500 p-3 bg-blue-50 rounded-lg">
                Save this report as your service record — you may need it for warranty support.
                Standard workmanship warranty: 90 days.
              </p>
            </div>
          </Section>
        )}

        {/* ── NEXT SERVICE ────────────────────────────────────────────────── */}
        {nextDate && (
          <Section title="What's Next">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Recommended rotation</span>
                <span className="font-medium text-gray-900">{formatDate(nextDate, { month: 'long', year: 'numeric' })}</span>
              </div>
              {company?.phone && (
                <a href={`tel:${company.phone}`}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm"
                  style={{ background: '#C41230', color: 'white' }}>
                  📅 Book Your Next Service
                </a>
              )}
            </div>
          </Section>
        )}

        {/* ── REVIEW REQUEST ──────────────────────────────────────────────── */}
        <section className="card p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Glad We Could Save You the Trip</h2>
          <p className="text-gray-600 text-sm mb-5">
            Mind leaving us a quick review? It helps others find us and only takes 30 seconds.
          </p>
          <div className="space-y-3">
            {company?.google_review_url && (
              <a href={company.google_review_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm"
                style={{ background: '#C41230', color: 'white' }}>
                ⭐ Leave a Google Review
              </a>
            )}
            {company?.phone && (
              <a href={`tel:${company.phone}`}
                className="flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700">
                📅 Book Another Service
              </a>
            )}
          </div>
        </section>

        {/* PDF download */}
        <div className="text-center pb-6">
          <a href={`/report/${slug}/pdf`} download
            className="text-gray-400 text-sm hover:text-gray-700 underline">
            Download PDF
          </a>
        </div>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900 whitespace-nowrap">{title}</h2>
        <div className="flex-1 tire-track-divider" />
      </div>
      <div className="card p-5">{children}</div>
    </section>
  )
}

function TreadBar({ depth, label }: { depth: number; label: string }) {
  const segments = [
    depth >= 10 ? '#22C55E' : '#E5E7EB',
    depth >= 7  ? depth >= 9 ? '#22C55E' : '#EAB308' : '#E5E7EB',
    depth >= 5  ? depth >= 7 ? '#EAB308' : '#F97316' : '#E5E7EB',
    depth >= 3  ? '#F97316' : '#E5E7EB',
    depth >= 2  ? depth <= 3 ? '#DC2626' : '#F97316' : '#E5E7EB',
  ]
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span>{label}</span>
      <div className="flex gap-0.5">
        {segments.map((c, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
        ))}
      </div>
      <span className="text-gray-600 font-medium">{depth}/32</span>
    </div>
  )
}
