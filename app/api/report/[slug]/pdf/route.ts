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
      company:companies(name, phone, email, city, state)
    `)
    .eq('public_slug', slug)
    .single()

  if (!report) return new NextResponse('Not found', { status: 404 })

  const job     = report.job as Record<string, unknown>
  const company = report.company as { name: string; phone: string; email: string } | null
  const cust    = job?.customer as { first_name: string; last_name: string; phone: string } | null
  const vehicle = job?.vehicle  as { year: string; make: string; model: string; vin: string; license_plate: string } | null
  const tech    = job?.assigned_tech as { first_name: string; last_name: string } | null
  const tires   = (job?.tire_records  as Array<Record<string, unknown>>) ?? []
  const checks  = (job?.checklist_items as Array<Record<string, unknown>>) ?? []
  const riskSummary = report.risk_summary as { level: string; reasons: string[] } | null

  const serviceDate = job?.completed_at ? formatDate(String(job.completed_at)) : formatDate(String(report.created_at))
  const location    = [job?.service_city, job?.service_state].filter(Boolean).join(', ')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Road Ready Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1A1A1A; background: white; font-size: 13px; line-height: 1.6; }
  .page { max-width: 750px; margin: 0 auto; padding: 40px; }
  .header { background: #0A0A0A; color: white; padding: 30px; border-radius: 8px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .header .sub { color: #9CA3AF; font-size: 13px; }
  .badge { display: inline-block; background: #C41230; color: white; padding: 3px 10px; border-radius: 100px; font-size: 11px; font-weight: 600; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 15px; font-weight: 700; color: #1A1A1A; padding-bottom: 8px; border-bottom: 2px solid #E5E5E5; margin-bottom: 12px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .tire-card { border: 1px solid #E5E5E5; border-radius: 8px; padding: 12px; }
  .tire-card h3 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
  .label { color: #6B7280; font-size: 11px; }
  .check-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .check-box { width: 16px; height: 16px; background: #22C55E; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .check-box span { color: white; font-size: 10px; font-weight: bold; }
  .risk-box { border-radius: 8px; padding: 12px; margin-bottom: 16px; }
  .risk-severe { background: #FEF2F2; border: 1px solid #FECACA; }
  .risk-high   { background: #FFF7ED; border: 1px solid #FED7AA; }
  .risk-moderate { background: #FEFCE8; border: 1px solid #FDE68A; }
  .risk-low    { background: #F0FDF4; border: 1px solid #BBF7D0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 6px 8px; background: #F9FAFB; font-weight: 600; color: #6B7280; font-size: 11px; }
  td { padding: 6px 8px; border-bottom: 1px solid #F3F4F6; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E5E5E5; color: #9CA3AF; font-size: 11px; display: flex; justify-content: space-between; }
  @media print { .page { padding: 20px; } }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <div style="color:#C41230;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Road Ready Report</div>
        <h1>${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Your Vehicle'}</h1>
        <div class="sub">${serviceDate}${location ? ` · ${location}` : ''}${tech ? ` · ${tech.first_name} ${tech.last_name}` : ''}</div>
        <div class="sub">${SERVICE_TYPE_LABEL[String(job?.service_type) as keyof typeof SERVICE_TYPE_LABEL] ?? 'Tire Service'}${job?.tire_count ? ` · ${job.tire_count} tires` : ''}</div>
      </div>
      <span class="badge">Road Ready ✓</span>
    </div>
    ${cust ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid #333">
      <div style="color:#9CA3AF;font-size:11px">Customer</div>
      <div style="color:white">${cust.first_name} ${cust.last_name}${cust.phone ? ` · ${cust.phone}` : ''}</div>
    </div>` : ''}
    ${vehicle?.vin ? `<div style="margin-top:4px"><span style="color:#9CA3AF;font-size:11px">VIN: </span><span style="color:#D1D5DB;font-family:monospace">${vehicle.vin}</span></div>` : ''}
  </div>

  ${riskSummary ? `<div class="section">
    <div class="section-title">Tire Condition Summary</div>
    <div class="risk-box risk-${riskSummary.level}">
      <div style="font-weight:700;font-size:16px;margin-bottom:8px">
        ${RISK_LABEL[riskSummary.level as keyof typeof RISK_LABEL]} Risk Level
      </div>
      ${riskSummary.reasons.map(r => `<div style="font-size:12px;margin-bottom:4px">› ${r}</div>`).join('')}
    </div>
  </div>` : ''}

  ${tires.length ? `<div class="section">
    <div class="section-title">Tire Records</div>
    <table>
      <thead><tr>
        <th>Position</th><th>Old Tire</th><th>Tread</th><th>Issue</th><th>New Tire</th><th>PSI</th>
      </tr></thead>
      <tbody>
        ${tires.map(t => `<tr>
          <td><strong>${TIRE_POSITION_LABEL[String(t.position) as keyof typeof TIRE_POSITION_LABEL] ?? String(t.position)}</strong></td>
          <td>${[t.old_brand, t.old_model, t.old_size].filter(Boolean).join(' ') || '—'}</td>
          <td>${t.old_tread_depth ? `${t.old_tread_depth}/32` : '—'}</td>
          <td>${Array.isArray(t.old_issues) ? (t.old_issues as string[]).join(', ').replace(/_/g, ' ') : '—'}</td>
          <td>${[t.new_brand, t.new_model, t.new_size].filter(Boolean).join(' ') || '—'}</td>
          <td>${t.psi_after ? `${t.psi_after} psi` : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  ${checks.filter(c => c.completed).length ? `<div class="section">
    <div class="section-title">Service Checklist</div>
    ${checks.filter(c => c.completed).map(c => `
      <div class="check-row">
        <div class="check-box"><span>✓</span></div>
        <span>${String(c.label)}</span>
      </div>`).join('')}
  </div>` : ''}

  <div class="section">
    <div class="section-title">What This Service Prevented</div>
    <p style="font-size:12px;color:#4B5563;line-height:1.7">
      Worn or damaged tires can lead to longer stopping distances, poor wet traction, hydroplaning,
      blowouts at highway speed, and loss of control during hard braking. This service was completed
      to prevent these outcomes and return your vehicle to full road readiness.
    </p>
    <div style="margin-top:12px;background:#F9FAFB;border-radius:6px;padding:10px;font-size:12px;color:#374151">
      Save this report as your service record. You may need it for warranty support.
      Standard workmanship warranty: 90 days.
    </div>
  </div>

  <div class="footer">
    <div>${company?.name ?? 'Road Ready Platform'}${company?.phone ? ` · ${company.phone}` : ''}</div>
    <div>Report: /report/${slug.slice(0,8)}…</div>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="road-ready-report.html"`,
    },
  })
}
