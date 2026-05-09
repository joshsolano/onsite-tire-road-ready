import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { TIRE_POSITION_LABEL, RISK_LABEL, SERVICE_TYPE_LABEL } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createServiceClient()

  const { data: report } = await supabase
    .from('reports')
    .select(`
      *,
      job:jobs(*, service_type, tire_count, completed_at, service_city, service_state,
        customer:customers(first_name, last_name, phone),
        vehicle:vehicles(year, make, model, vin, license_plate),
        assigned_tech:users!jobs_assigned_tech_id_fkey(first_name, last_name),
        tire_records(*, photos(*)),
        checklist_items(*),
        photos(*)
      ),
      company:companies(name, phone, email, city, state, google_review_url)
    `)
    .eq('public_slug', slug)
    .single()

  if (!report) return new NextResponse('Not found', { status: 404 })

  const job        = report.job as Record<string, unknown>
  const company    = report.company as { name: string; phone: string; email: string; google_review_url: string } | null
  const cust       = job?.customer as { first_name: string; last_name: string; phone: string } | null
  const vehicle    = job?.vehicle  as { year: string; make: string; model: string; vin: string; license_plate: string } | null
  const tech       = job?.assigned_tech as { first_name: string; last_name: string } | null
  const tires      = (job?.tire_records  as Array<Record<string, unknown>>) ?? []
  const checks     = (job?.checklist_items as Array<Record<string, unknown>>) ?? []
  const riskSummary = report.risk_summary as { level: string; reasons: string[] } | null
  const badges      = (report.good_call_badges as string[]) ?? []
  const facts       = (report.tire_facts as string[]) ?? []
  const timeSaved   = report.time_saved_minutes as number | null
  const nextDate    = report.next_service_date as string | null
  const nextNotes   = report.next_service_notes as string | null

  const serviceDate = job?.completed_at ? formatDate(String(job.completed_at)) : formatDate(String(report.created_at))
  const location    = [job?.service_city, job?.service_state].filter(Boolean).join(', ')

  const riskColors: Record<string, { bg: string; border: string; text: string }> = {
    severe:   { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
    high:     { bg: '#FFF7ED', border: '#FED7AA', text: '#9A3412' },
    moderate: { bg: '#FEFCE8', border: '#FDE68A', text: '#854D0E' },
    low:      { bg: '#F0FDF4', border: '#BBF7D0', text: '#166534' },
  }
  const rc = riskColors[riskSummary?.level ?? 'low'] ?? riskColors.low

  const treadBar = (depth: number) => {
    const usable = Math.max(0, Number(depth) - 2)
    const pct    = Math.round((usable / 8) * 100)
    const color  = pct <= 15 ? '#DC2626' : pct <= 30 ? '#F97316' : '#22C55E'
    return `<div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
      </div>
      <span style="font-size:11px;color:#6B7280;white-space:nowrap">${depth}/32 · ${pct}%</span>
    </div>`
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Road Ready Report — ${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Your Vehicle'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1A1A1A; background: white; font-size: 13px; line-height: 1.6; }
  .page { max-width: 780px; margin: 0 auto; padding: 40px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 14px; font-weight: 700; color: #1A1A1A; padding-bottom: 8px; border-bottom: 2px solid #E5E5E5; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .card { border: 1px solid #E5E5E5; border-radius: 8px; padding: 14px; }
  .label { color: #6B7280; font-size: 11px; margin-bottom: 2px; }
  .check-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .check-box { width: 15px; height: 15px; background: #22C55E; border-radius: 3px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 7px 8px; background: #F9FAFB; font-weight: 600; color: #6B7280; font-size: 11px; border-bottom: 1px solid #E5E7EB; }
  td { padding: 7px 8px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  .badge-pill { display: inline-block; background: #0A0A0A; color: white; padding: 4px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; margin: 2px; }
  .fact-row { display: flex; gap: 8px; padding: 8px 10px; background: #F9FAFB; border-radius: 6px; margin-bottom: 6px; }
  .footer { margin-top: 36px; padding-top: 16px; border-top: 2px solid #E5E5E5; display: flex; justify-content: space-between; align-items: center; }
  @media print { .page { padding: 24px; } body { font-size: 12px; } }
</style>
</head>
<body>
<div class="page">

  <!-- ── HEADER ── -->
  <div style="background:#0A0A0A;color:white;padding:28px 32px;border-radius:10px;margin-bottom:28px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px">
      <div>
        <div style="color:#C41230;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:10px">Road Ready Report</div>
        <div style="font-size:24px;font-weight:800;margin-bottom:4px">${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Your Vehicle'}</div>
        <div style="color:#9CA3AF;font-size:13px">${serviceDate}${location ? ` · ${location}` : ''}${tech ? ` · ${tech.first_name} ${tech.last_name}` : ''}</div>
        <div style="color:#6B7280;font-size:12px;margin-top:2px">${SERVICE_TYPE_LABEL[String(job?.service_type) as keyof typeof SERVICE_TYPE_LABEL] ?? 'Tire Service'}${job?.tire_count ? ` · ${job.tire_count} tires` : ''}</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="background:#C41230;color:white;padding:6px 14px;border-radius:100px;font-size:12px;font-weight:700;margin-bottom:8px">Road Ready ✓</div>
        ${timeSaved ? `<div style="color:#9CA3AF;font-size:11px">${Math.floor(timeSaved / 60)}h ${timeSaved % 60}m saved</div>` : ''}
      </div>
    </div>
    ${cust || vehicle?.vin ? `
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid #2D2D2D;display:flex;gap:32px">
      ${cust ? `<div><div style="color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:1px">Customer</div><div style="color:white;font-size:13px;margin-top:2px">${cust.first_name} ${cust.last_name}${cust.phone ? ` · ${cust.phone}` : ''}</div></div>` : ''}
      ${vehicle?.license_plate ? `<div><div style="color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:1px">License Plate</div><div style="color:white;font-family:monospace;font-size:13px;margin-top:2px">${vehicle.license_plate}</div></div>` : ''}
      ${vehicle?.vin ? `<div><div style="color:#6B7280;font-size:10px;text-transform:uppercase;letter-spacing:1px">VIN</div><div style="color:#D1D5DB;font-family:monospace;font-size:12px;margin-top:2px">${vehicle.vin}</div></div>` : ''}
    </div>` : ''}
  </div>

  <!-- ── GOOD CALL BADGES ── -->
  ${badges.length ? `<div class="section">
    <div class="section-title">Good Call Getting This Done</div>
    <p style="color:#4B5563;font-size:12px;margin-bottom:10px">Your old tires were showing signs of wear that affect safety, reliability, and control.</p>
    <div>${badges.map(b => `<span class="badge-pill">✓ ${b}</span>`).join('')}</div>
  </div>` : ''}

  <!-- ── RISK SUMMARY ── -->
  ${riskSummary ? `<div class="section">
    <div class="section-title">Tire Condition Summary</div>
    <div style="background:${rc.bg};border:1px solid ${rc.border};border-radius:8px;padding:14px;margin-bottom:12px">
      <div style="font-weight:800;font-size:18px;color:${rc.text};margin-bottom:8px">${RISK_LABEL[riskSummary.level as keyof typeof RISK_LABEL]} Risk Level</div>
      ${riskSummary.reasons.map(r => `<div style="font-size:12px;color:${rc.text};margin-bottom:4px">› ${r}</div>`).join('')}
    </div>
  </div>` : ''}

  <!-- ── TIRE RECORDS ── -->
  ${tires.length ? `<div class="section">
    <div class="section-title">Tire Records</div>
    <table>
      <thead><tr>
        <th>Position</th><th>Old Tire</th><th>Tread Depth</th><th>Issues</th><th>New Tire</th><th>PSI</th><th>Verified</th>
      </tr></thead>
      <tbody>
        ${tires.map(t => `<tr>
          <td><strong>${TIRE_POSITION_LABEL[String(t.position) as keyof typeof TIRE_POSITION_LABEL] ?? String(t.position)}</strong></td>
          <td style="color:#374151">${[t.old_brand, t.old_model].filter(Boolean).join(' ') || '—'}<br><span style="color:#9CA3AF;font-size:11px">${t.old_size ?? ''}</span></td>
          <td>
            ${t.old_tread_depth != null ? treadBar(Number(t.old_tread_depth)) : '—'}
          </td>
          <td style="color:#EF4444;font-size:11px">${Array.isArray(t.old_issues) && (t.old_issues as string[]).length ? (t.old_issues as string[]).map(i => i.replace(/_/g,' ')).join(', ') : '—'}</td>
          <td style="color:#374151">${[t.new_brand, t.new_model].filter(Boolean).join(' ') || '—'}<br><span style="color:#9CA3AF;font-size:11px">${t.new_size ?? ''}</span></td>
          <td>${t.psi_after ? `<strong>${t.psi_after}</strong> psi` : '—'}</td>
          <td style="font-size:11px;color:#22C55E">
            ${t.torque_checked ? '✓ Torque<br>' : ''}${t.tpms_checked ? '✓ TPMS<br>' : ''}${t.valve_stem_replaced ? '✓ Valve<br>' : ''}${t.wheel_inspected ? '✓ Wheel' : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- ── ESTIMATED LIFE LEFT ── -->
  ${tires.some(t => t.old_tread_depth != null) ? `<div class="section">
    <div class="section-title">Estimated Tire Life at Service</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${tires.filter(t => t.old_tread_depth != null).map(t => {
        const depth  = Number(t.old_tread_depth)
        const usable = Math.max(0, depth - 2)
        const pct    = Math.round((usable / 8) * 100)
        const color  = pct <= 15 ? '#DC2626' : pct <= 30 ? '#F97316' : '#22C55E'
        return `<div class="card">
          <div style="font-weight:600;font-size:12px;margin-bottom:6px">${TIRE_POSITION_LABEL[String(t.position) as keyof typeof TIRE_POSITION_LABEL] ?? String(t.position)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
            <div style="flex:1;height:10px;background:#E5E7EB;border-radius:5px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:5px"></div>
            </div>
            <span style="font-size:12px;font-weight:700;color:${color}">${pct}%</span>
          </div>
          <div style="font-size:11px;color:#6B7280">${depth}/32" · ${t.estimated_life_left_text ?? ''}</div>
        </div>`
      }).join('')}
    </div>
    <p style="margin-top:10px;font-size:11px;color:#9CA3AF">Estimate based on tread depth at time of service. Actual life varies with driving conditions.</p>
  </div>` : ''}

  <!-- ── TIME SAVED ── -->
  ${timeSaved ? `<div class="section">
    <div class="section-title">Time Saved vs. a Tire Shop</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#EF4444;letter-spacing:1px;margin-bottom:10px">Traditional Shop Visit</div>
        ${[
          ['Drive there', '~25 min'],
          ['Check-in', '~15 min'],
          ['Wait for service', '~75 min'],
          ['Drive back', '~25 min'],
        ].map(([s, t]) => `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span style="color:#7F1D1D">${s}</span><span style="color:#DC2626;font-weight:600">${t}</span></div>`).join('')}
        <div style="border-top:1px solid #FECACA;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between">
          <span style="font-weight:700;color:#7F1D1D">Total</span>
          <span style="font-weight:800;color:#DC2626;font-size:14px">~2.3 hrs</span>
        </div>
      </div>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#16A34A;letter-spacing:1px;margin-bottom:10px">Road Ready Mobile</div>
        ${[
          ['Drive there', 'None ✓'],
          ['Check-in', 'None ✓'],
          ['Wait for service', 'At home ✓'],
          ['Drive back', 'None ✓'],
        ].map(([s, t]) => `<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span style="color:#166534">${s}</span><span style="color:#16A34A;font-weight:600">${t}</span></div>`).join('')}
        <div style="border-top:1px solid #BBF7D0;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between">
          <span style="font-weight:700;color:#166534">Total</span>
          <span style="font-weight:800;color:#16A34A;font-size:14px">Done at your door</span>
        </div>
      </div>
    </div>
    <div style="background:#0A0A0A;color:white;border-radius:8px;padding:14px;text-align:center">
      <span style="font-size:28px;font-weight:800">${Math.floor(timeSaved / 60)}h ${timeSaved % 60 > 0 ? `${timeSaved % 60}m` : ''}</span>
      <span style="color:#9CA3AF;font-size:13px;margin-left:8px">of your day saved — No drive. No waiting room. No wasted afternoon.</span>
    </div>
  </div>` : ''}

  <!-- ── WHAT BAD TIRES CAUSE ── -->
  <div class="section">
    <div class="section-title">What This Service Prevented</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${[
        ['Longer stopping distances', '🛑'],
        ['Poor traction in rain', '🌧️'],
        ['Higher hydroplaning risk', '💧'],
        ['Blowouts at highway speed', '💥'],
        ['Loss of control when braking', '⚠️'],
        ['Getting stranded roadside', '🚨'],
      ].map(([text, icon]) => `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#F9FAFB;border-radius:6px;font-size:12px"><span>${icon}</span><span style="color:#374151">${text}</span></div>`).join('')}
    </div>
  </div>

  <!-- ── SERVICE CHECKLIST ── -->
  ${checks.filter(c => c.completed).length ? `<div class="section">
    <div class="section-title">Service Checklist</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
      ${checks.filter(c => c.completed).map(c => `
        <div class="check-row">
          <div class="check-box"><span style="color:white;font-size:9px;font-weight:bold">✓</span></div>
          <span style="font-size:12px">${String(c.label)}</span>
        </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- ── TIRE FACTS ── -->
  ${facts.length ? `<div class="section">
    <div class="section-title">A Few Things Worth Knowing</div>
    ${facts.map(f => `<div class="fact-row"><span style="color:#C41230;font-weight:700;flex-shrink:0">→</span><span style="color:#374151;font-size:12px">${f}</span></div>`).join('')}
  </div>` : ''}

  <!-- ── NEXT SERVICE ── -->
  ${nextDate ? `<div class="section">
    <div class="section-title">Next Recommended Service</div>
    <div class="card" style="border-color:#C41230;border-width:2px">
      <div style="font-size:18px;font-weight:800;color:#C41230;margin-bottom:4px">${nextDate}</div>
      <div style="font-size:12px;color:#6B7280">${nextNotes ?? 'Rotation and inspection recommended within 5–6 months.'}</div>
    </div>
  </div>` : ''}

  <!-- ── WARRANTY ── -->
  <div class="section">
    <div class="section-title">Warranty & Service Record</div>
    <div style="background:#F9FAFB;border-radius:8px;padding:14px;font-size:12px;color:#374151;line-height:1.8">
      <strong>Workmanship Warranty:</strong> 90 days from date of service.<br>
      <strong>Service Date:</strong> ${serviceDate}<br>
      <strong>Technician:</strong> ${tech ? `${tech.first_name} ${tech.last_name}` : 'Road Ready Technician'}<br>
      <strong>Service Provider:</strong> ${company?.name ?? 'Road Ready Platform'}${company?.phone ? ` · ${company.phone}` : ''}<br>
      Keep this report as your service record. You may need it to support a warranty claim.
    </div>
  </div>

  <!-- ── FOOTER ── -->
  <div class="footer">
    <div>
      <div style="font-weight:700;font-size:13px">${company?.name ?? 'Road Ready Platform'}</div>
      <div style="color:#9CA3AF;font-size:11px">${company?.phone ?? ''}${company?.email ? ` · ${company.email}` : ''}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#9CA3AF">Report ID</div>
      <div style="font-family:monospace;font-size:11px;color:#6B7280">${slug.slice(0, 12)}…</div>
      ${company?.google_review_url && !company.google_review_url.includes('your-google') ? `<div style="margin-top:6px"><a href="${company.google_review_url}" style="color:#C41230;font-size:11px;font-weight:600">Leave us a Google review →</a></div>` : ''}
    </div>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="road-ready-report-${slug.slice(0,8)}.html"`,
    },
  })
}
