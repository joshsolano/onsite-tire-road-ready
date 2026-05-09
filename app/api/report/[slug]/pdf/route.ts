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

  const riskMeta: Record<string, { bg: string; border: string; text: string; label: string }> = {
    severe:   { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', label: '🔴 Severe' },
    high:     { bg: '#FFF7ED', border: '#FDBA74', text: '#9A3412', label: '🟠 High' },
    moderate: { bg: '#FEFCE8', border: '#FDE047', text: '#854D0E', label: '🟡 Moderate' },
    low:      { bg: '#F0FDF4', border: '#86EFAC', text: '#166534', label: '🟢 Low' },
  }
  const rm = riskMeta[riskSummary?.level ?? 'low'] ?? riskMeta.low

  const treadBar = (depth: number) => {
    const usable = Math.max(0, Number(depth) - 2)
    const pct    = Math.round((usable / 8) * 100)
    const color  = pct <= 15 ? '#DC2626' : pct <= 30 ? '#F97316' : '#22C55E'
    const label  = pct <= 15 ? 'Replace Soon' : pct <= 30 ? 'Worn' : 'Good'
    return `
      <div style="display:flex;align-items:center;gap:8px;min-width:140px">
        <div style="flex:1;height:8px;background:#E5E7EB;border-radius:4px;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact"></div>
        </div>
        <span style="font-size:10px;color:${color};font-weight:700;white-space:nowrap">${depth}/32&quot; · ${label}</span>
      </div>`
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Road Ready Report — ${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Your Vehicle'}</title>
<style>
  * {
    margin: 0; padding: 0; box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  @page {
    size: letter;
    margin: 0.45in 0.5in;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    color: #111827;
    background: #F3F4F6;
    font-size: 12px;
    line-height: 1.5;
  }
  .page {
    max-width: 760px;
    margin: 0 auto;
    background: #F3F4F6;
    padding: 28px 24px;
  }

  /* ── HEADER ── */
  .header {
    background: #0A0A0A;
    border-radius: 14px;
    padding: 28px 32px;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
  }
  .header-accent {
    position: absolute;
    top: 0; right: 0;
    width: 180px; height: 100%;
    background: linear-gradient(135deg, transparent 40%, rgba(196,18,48,0.15) 100%);
  }
  .header-eyebrow {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: #C41230;
    margin-bottom: 10px;
  }
  .header-vehicle {
    font-size: 26px;
    font-weight: 900;
    color: #FFFFFF;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .header-meta {
    font-size: 12px;
    color: #9CA3AF;
    margin-bottom: 18px;
  }
  .header-pill {
    display: inline-block;
    background: #C41230;
    color: white;
    padding: 5px 14px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .header-divider {
    border: none;
    border-top: 1px solid #1F1F1F;
    margin: 18px 0;
  }
  .header-fields {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
  }
  .header-field-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #4B5563;
    margin-bottom: 3px;
  }
  .header-field-value {
    font-size: 13px;
    color: #E5E7EB;
    font-weight: 500;
  }
  .header-field-mono {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    color: #D1D5DB;
  }

  /* ── SECTION ── */
  .section {
    background: white;
    border-radius: 12px;
    margin-bottom: 14px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
  }
  .section-header {
    padding: 12px 18px;
    background: #F9FAFB;
    border-bottom: 1px solid #E5E7EB;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-body {
    padding: 16px 18px;
  }

  /* ── STAT ROW ── */
  .stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }
  .stat-card {
    background: white;
    border-radius: 10px;
    padding: 14px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.07);
  }
  .stat-value {
    font-size: 22px;
    font-weight: 900;
    color: #0A0A0A;
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #9CA3AF;
  }

  /* ── BADGES ── */
  .badge-pill {
    display: inline-block;
    background: #0A0A0A;
    color: white;
    padding: 5px 12px;
    border-radius: 100px;
    font-size: 10px;
    font-weight: 700;
    margin: 3px 3px 3px 0;
    letter-spacing: 0.3px;
  }

  /* ── RISK BOX ── */
  .risk-box {
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 0;
  }
  .risk-level {
    font-size: 20px;
    font-weight: 900;
    margin-bottom: 8px;
  }
  .risk-reason {
    font-size: 12px;
    margin-bottom: 4px;
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  /* ── TABLE ── */
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    padding: 8px 10px;
    background: #F9FAFB;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #6B7280;
    border-bottom: 1px solid #E5E7EB;
  }
  td {
    padding: 9px 10px;
    border-bottom: 1px solid #F3F4F6;
    vertical-align: middle;
    font-size: 11px;
  }
  tr:last-child td { border-bottom: none; }

  /* ── LIFE GRID ── */
  .life-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
  .life-card {
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    padding: 12px 14px;
  }

  /* ── TIME SAVED ── */
  .time-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }
  .time-col {
    border-radius: 10px;
    padding: 14px;
  }
  .time-col-label {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
  }
  .time-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    margin-bottom: 5px;
  }
  .time-total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    margin-top: 8px;
  }
  .time-hero {
    background: #0A0A0A;
    color: white;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .time-hero-num {
    font-size: 36px;
    font-weight: 900;
    color: #C41230;
    line-height: 1;
    flex-shrink: 0;
  }
  .time-hero-text {
    font-size: 13px;
    color: #9CA3AF;
    line-height: 1.5;
  }

  /* ── PREVENTED GRID ── */
  .prev-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .prev-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #F9FAFB;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 500;
    color: #374151;
  }
  .prev-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  /* ── CHECKLIST ── */
  .check-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .check-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #374151;
  }
  .check-dot {
    width: 16px;
    height: 16px;
    background: #DCFCE7;
    border: 1.5px solid #86EFAC;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: #16A34A;
    font-weight: 900;
  }

  /* ── FACTS ── */
  .fact-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 9px 12px;
    background: #F9FAFB;
    border-radius: 8px;
    margin-bottom: 6px;
    font-size: 11px;
    color: #374151;
    line-height: 1.5;
  }
  .fact-arrow {
    color: #C41230;
    font-weight: 900;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ── NEXT SERVICE ── */
  .next-card {
    background: #FFF1F2;
    border: 2px solid #FECDD3;
    border-radius: 10px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .next-date {
    font-size: 22px;
    font-weight: 900;
    color: #C41230;
    flex-shrink: 0;
  }
  .next-note {
    font-size: 11px;
    color: #6B7280;
    line-height: 1.5;
  }

  /* ── WARRANTY ── */
  .warranty-box {
    background: #F9FAFB;
    border-radius: 10px;
    padding: 14px;
    font-size: 11px;
    color: #374151;
    line-height: 1.9;
  }

  /* ── FOOTER ── */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 2px solid #E5E7EB;
  }
  .footer-company {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 3px;
  }
  .footer-meta {
    font-size: 10px;
    color: #9CA3AF;
  }
  .footer-review {
    background: #C41230;
    color: white;
    padding: 7px 14px;
    border-radius: 100px;
    font-size: 10px;
    font-weight: 700;
    text-decoration: none;
    display: inline-block;
  }

  /* print: auto-trigger */
  @media print {
    body { background: #F3F4F6; }
    .no-print { display: none !important; }
  }
</style>
<script>window.onload = () => setTimeout(() => window.print(), 400)</script>
</head>
<body>
<div class="page">

  <!-- ═══════════════════════════════ HEADER ═══════════════════════════════ -->
  <div class="header">
    <div class="header-accent"></div>
    <div class="header-eyebrow">Road Ready — Mobile Tire Service Report</div>
    <div class="header-vehicle">${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Vehicle Service Report'}</div>
    <div class="header-meta">
      ${serviceDate}${location ? ` &nbsp;·&nbsp; ${location}` : ''}${tech ? ` &nbsp;·&nbsp; Tech: ${tech.first_name} ${tech.last_name}` : ''}
      &nbsp;·&nbsp; ${SERVICE_TYPE_LABEL[String(job?.service_type) as keyof typeof SERVICE_TYPE_LABEL] ?? 'Tire Service'}${job?.tire_count ? `, ${job.tire_count} tires` : ''}
    </div>
    <div class="header-pill">Road Ready ✓</div>
    ${timeSaved ? `<span style="display:inline-block;margin-left:10px;background:#1A1A1A;color:#9CA3AF;padding:5px 12px;border-radius:100px;font-size:11px;font-weight:600;">${Math.floor(timeSaved / 60)}h ${timeSaved % 60 > 0 ? `${timeSaved % 60}m` : ''} saved vs. tire shop</span>` : ''}

    ${cust || vehicle?.vin || vehicle?.license_plate ? `<hr class="header-divider">
    <div class="header-fields">
      ${cust ? `<div>
        <div class="header-field-label">Customer</div>
        <div class="header-field-value">${cust.first_name} ${cust.last_name}${cust.phone ? `<span style="color:#4B5563"> &nbsp;·&nbsp; ${cust.phone}</span>` : ''}</div>
      </div>` : ''}
      ${vehicle?.license_plate ? `<div>
        <div class="header-field-label">License Plate</div>
        <div class="header-field-mono">${vehicle.license_plate}</div>
      </div>` : ''}
      ${vehicle?.vin ? `<div>
        <div class="header-field-label">VIN</div>
        <div class="header-field-mono" style="font-size:11px">${vehicle.vin}</div>
      </div>` : ''}
    </div>` : ''}
  </div>

  <!-- ═══════════════════════════════ QUICK STATS ═══════════════════════════ -->
  <div class="stat-row">
    <div class="stat-card">
      <div class="stat-value">${tires.length || job?.tire_count || '—'}</div>
      <div class="stat-label">Tires Serviced</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:${riskMeta[riskSummary?.level ?? 'low']?.text ?? '#166534'}">${(riskSummary?.level ?? 'Low').charAt(0).toUpperCase() + (riskSummary?.level ?? 'low').slice(1)}</div>
      <div class="stat-label">Risk Level</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#22C55E">${checks.filter(c => c.completed).length}</div>
      <div class="stat-label">Checks Passed</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:#C41230">${timeSaved ? `${Math.floor(timeSaved / 60)}h${timeSaved % 60 > 0 ? `${timeSaved % 60}m` : ''}` : '—'}</div>
      <div class="stat-label">Time Saved</div>
    </div>
  </div>

  <!-- ═══════════════════════════════ GOOD CALL ════════════════════════════ -->
  ${badges.length ? `<div class="section">
    <div class="section-header">✦ &nbsp;Good Call Getting This Done</div>
    <div class="section-body">
      <p style="color:#4B5563;font-size:11px;margin-bottom:10px">Your old tires were showing signs of wear that affect safety, reliability, and control — you made the right call.</p>
      <div>${badges.map(b => `<span class="badge-pill">✓ ${b}</span>`).join('')}</div>
    </div>
  </div>` : ''}

  <!-- ═══════════════════════════════ RISK SUMMARY ══════════════════════════ -->
  ${riskSummary ? `<div class="section">
    <div class="section-header">⚠ &nbsp;Tire Condition Summary</div>
    <div class="section-body">
      <div class="risk-box" style="background:${rm.bg};border:1.5px solid ${rm.border}">
        <div class="risk-level" style="color:${rm.text}">${rm.label} Risk Level</div>
        ${riskSummary.reasons.map(r => `<div class="risk-reason" style="color:${rm.text}"><span>›</span><span>${r}</span></div>`).join('')}
      </div>
    </div>
  </div>` : ''}

  <!-- ═══════════════════════════════ TIRE RECORDS ══════════════════════════ -->
  ${tires.length ? `<div class="section">
    <div class="section-header">◉ &nbsp;Tire Records</div>
    <table>
      <thead><tr>
        <th style="width:80px">Position</th>
        <th>Old Tire</th>
        <th style="width:160px">Tread at Service</th>
        <th>Issues Found</th>
        <th>New Tire</th>
        <th style="width:50px">PSI</th>
        <th style="width:80px">Verified</th>
      </tr></thead>
      <tbody>
        ${tires.map((t, i) => `<tr style="${i % 2 === 1 ? 'background:#FAFAFA' : ''}">
          <td><strong style="color:#111827">${TIRE_POSITION_LABEL[String(t.position) as keyof typeof TIRE_POSITION_LABEL] ?? String(t.position)}</strong></td>
          <td>
            <div style="font-weight:600;color:#111827">${[t.old_brand, t.old_model].filter(Boolean).join(' ') || '—'}</div>
            ${t.old_size ? `<div style="color:#9CA3AF;font-size:10px;margin-top:1px">${t.old_size}</div>` : ''}
            ${t.old_dot ? `<div style="color:#9CA3AF;font-size:10px">DOT ${t.old_dot}</div>` : ''}
          </td>
          <td>${t.old_tread_depth != null ? treadBar(Number(t.old_tread_depth)) : '<span style="color:#9CA3AF">—</span>'}</td>
          <td style="color:#EF4444;font-size:10px">${Array.isArray(t.old_issues) && (t.old_issues as string[]).length ? (t.old_issues as string[]).map((i: string) => `<span style="display:inline-block;background:#FEF2F2;border:1px solid #FECACA;color:#DC2626;padding:1px 6px;border-radius:4px;margin:1px;font-size:10px">${i.replace(/_/g,' ')}</span>`).join('') : '<span style="color:#9CA3AF">None</span>'}</td>
          <td>
            <div style="font-weight:600;color:#111827">${[t.new_brand, t.new_model].filter(Boolean).join(' ') || '—'}</div>
            ${t.new_size ? `<div style="color:#9CA3AF;font-size:10px;margin-top:1px">${t.new_size}</div>` : ''}
            ${t.new_dot ? `<div style="color:#9CA3AF;font-size:10px">DOT ${t.new_dot}</div>` : ''}
          </td>
          <td>${t.psi_after != null ? `<strong style="color:#111827">${t.psi_after}</strong><span style="color:#9CA3AF;font-size:10px"> psi</span>` : '<span style="color:#9CA3AF">—</span>'}</td>
          <td style="font-size:10px;line-height:1.7">
            ${t.torque_checked ? '<span style="color:#22C55E;font-weight:700">✓</span> <span style="color:#374151">Torque</span><br>' : ''}
            ${t.tpms_checked ? '<span style="color:#22C55E;font-weight:700">✓</span> <span style="color:#374151">TPMS</span><br>' : ''}
            ${t.valve_stem_replaced ? '<span style="color:#22C55E;font-weight:700">✓</span> <span style="color:#374151">Valve</span><br>' : ''}
            ${t.wheel_inspected ? '<span style="color:#22C55E;font-weight:700">✓</span> <span style="color:#374151">Wheel</span>' : ''}
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- ═══════════════════════════════ LIFE LEFT ═════════════════════════════ -->
  ${tires.some(t => t.old_tread_depth != null) ? `<div class="section">
    <div class="section-header">📊 &nbsp;Estimated Tread Life at Service</div>
    <div class="section-body">
      <div class="life-grid">
        ${tires.filter(t => t.old_tread_depth != null).map(t => {
          const depth  = Number(t.old_tread_depth)
          const usable = Math.max(0, depth - 2)
          const pct    = Math.round((usable / 8) * 100)
          const color  = pct <= 15 ? '#DC2626' : pct <= 30 ? '#F97316' : '#22C55E'
          const bg     = pct <= 15 ? '#FEF2F2' : pct <= 30 ? '#FFF7ED' : '#F0FDF4'
          const border = pct <= 15 ? '#FECACA' : pct <= 30 ? '#FDBA74' : '#86EFAC'
          return `<div class="life-card" style="background:${bg};border-color:${border}">
            <div style="font-weight:700;font-size:11px;color:#111827;margin-bottom:6px">${TIRE_POSITION_LABEL[String(t.position) as keyof typeof TIRE_POSITION_LABEL] ?? String(t.position)}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <div style="flex:1;height:10px;background:rgba(0,0,0,0.08);border-radius:5px;overflow:hidden">
                <div style="width:${pct}%;height:100%;background:${color};border-radius:5px"></div>
              </div>
              <span style="font-size:13px;font-weight:900;color:${color}">${pct}%</span>
            </div>
            <div style="font-size:10px;color:#6B7280">${depth}/32&quot; remaining ${t.estimated_life_left_text ? `· ${t.estimated_life_left_text}` : ''}</div>
          </div>`
        }).join('')}
      </div>
      <p style="margin-top:10px;font-size:10px;color:#9CA3AF">Estimate based on tread depth at time of service. Actual life varies with driving conditions and style.</p>
    </div>
  </div>` : ''}

  <!-- ═══════════════════════════════ TIME SAVED ════════════════════════════ -->
  ${timeSaved ? `<div class="section">
    <div class="section-header">⏱ &nbsp;Time Saved vs. a Traditional Tire Shop</div>
    <div class="section-body">
      <div class="time-grid">
        <div class="time-col" style="background:#FEF2F2;border:1.5px solid #FECACA">
          <div class="time-col-label" style="color:#DC2626">Traditional Tire Shop</div>
          ${[
            ['Drive to shop', '~25 min'],
            ['Wait at counter', '~15 min'],
            ['Service wait time', '~75 min'],
            ['Drive back home', '~25 min'],
          ].map(([step, time]) => `<div class="time-row"><span style="color:#7F1D1D">${step}</span><span style="color:#DC2626;font-weight:700">${time}</span></div>`).join('')}
          <div class="time-total-row" style="border-top:1px solid #FECACA">
            <span style="font-weight:800;color:#7F1D1D">Total wasted</span>
            <span style="font-size:16px;font-weight:900;color:#DC2626">~2.3 hrs</span>
          </div>
        </div>
        <div class="time-col" style="background:#F0FDF4;border:1.5px solid #86EFAC">
          <div class="time-col-label" style="color:#16A34A">Road Ready Mobile</div>
          ${[
            ['Drive to shop', 'None ✓'],
            ['Wait at counter', 'None ✓'],
            ['Service wait time', 'Done at home ✓'],
            ['Drive back home', 'None ✓'],
          ].map(([step, val]) => `<div class="time-row"><span style="color:#166534">${step}</span><span style="color:#16A34A;font-weight:700">${val}</span></div>`).join('')}
          <div class="time-total-row" style="border-top:1px solid #86EFAC">
            <span style="font-weight:800;color:#166534">Total wasted</span>
            <span style="font-size:14px;font-weight:900;color:#16A34A">0 minutes</span>
          </div>
        </div>
      </div>
      <div class="time-hero">
        <div class="time-hero-num">${Math.floor(timeSaved / 60)}h${timeSaved % 60 > 0 ? `&nbsp;${timeSaved % 60}m` : ''}</div>
        <div class="time-hero-text">of your day back — for free.<br>No drive. No waiting room. No wasted afternoon.</div>
      </div>
    </div>
  </div>` : ''}

  <!-- ═══════════════════════════════ PREVENTED ═════════════════════════════ -->
  <div class="section">
    <div class="section-header">🛡 &nbsp;What This Service Helped Prevent</div>
    <div class="section-body">
      <div class="prev-grid">
        ${[
          ['🛑', 'Longer stopping distances'],
          ['🌧️', 'Poor traction in wet conditions'],
          ['💧', 'Hydroplaning risk at highway speed'],
          ['💥', 'Sudden blowout while driving'],
          ['⚠️', 'Loss of control when braking'],
          ['🚨', 'Getting stranded on the roadside'],
        ].map(([icon, text]) => `<div class="prev-item"><span class="prev-icon">${icon}</span><span>${text}</span></div>`).join('')}
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════ CHECKLIST ═════════════════════════════ -->
  ${checks.filter(c => c.completed).length ? `<div class="section">
    <div class="section-header">✓ &nbsp;Service Checklist Completed</div>
    <div class="section-body">
      <div class="check-grid">
        ${checks.filter(c => c.completed).map(c => `
          <div class="check-item">
            <div class="check-dot">✓</div>
            <span>${String(c.label)}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>` : ''}

  <!-- ═══════════════════════════════ TIRE FACTS ════════════════════════════ -->
  ${facts.length ? `<div class="section">
    <div class="section-header">💡 &nbsp;A Few Things Worth Knowing</div>
    <div class="section-body">
      ${facts.map(f => `<div class="fact-row"><span class="fact-arrow">→</span><span>${f}</span></div>`).join('')}
    </div>
  </div>` : ''}

  <!-- ═══════════════════════════════ NEXT SERVICE ══════════════════════════ -->
  ${nextDate ? `<div class="section">
    <div class="section-header">📅 &nbsp;Next Recommended Service</div>
    <div class="section-body">
      <div class="next-card">
        <div class="next-date">${nextDate}</div>
        <div class="next-note">${nextNotes ?? 'Rotation and inspection recommended within 5–6 months. Keeping up with regular service extends tire life and maintains safety.'}</div>
      </div>
    </div>
  </div>` : ''}

  <!-- ═══════════════════════════════ WARRANTY ══════════════════════════════ -->
  <div class="section">
    <div class="section-header">📋 &nbsp;Warranty &amp; Service Record</div>
    <div class="section-body">
      <div class="warranty-box">
        <strong>Workmanship Warranty:</strong> 90 days from date of service<br>
        <strong>Service Date:</strong> ${serviceDate}<br>
        <strong>Technician:</strong> ${tech ? `${tech.first_name} ${tech.last_name}` : 'Road Ready Technician'}<br>
        <strong>Service Provider:</strong> ${company?.name ?? 'Road Ready Platform'}${company?.phone ? ` &nbsp;·&nbsp; ${company.phone}` : ''}${company?.email ? ` &nbsp;·&nbsp; ${company.email}` : ''}<br>
        <span style="color:#9CA3AF">Keep this report as your official service record. You may need it to support a tire or workmanship warranty claim.</span>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════ FOOTER ════════════════════════════════ -->
  <div class="footer">
    <div>
      <div class="footer-company">${company?.name ?? 'Road Ready Platform'}</div>
      <div class="footer-meta">${[company?.phone, company?.email].filter(Boolean).join(' · ')}</div>
      <div class="footer-meta" style="margin-top:2px">Report ID: <span style="font-family:monospace">${slug.slice(0, 12)}…</span></div>
    </div>
    <div style="text-align:right">
      ${company?.google_review_url && !company.google_review_url.includes('your-google')
        ? `<a href="${company.google_review_url}" class="footer-review">⭐ Leave us a Google Review</a>`
        : '<div class="footer-review" style="background:#1A1A1A">Road Ready ✓</div>'}
    </div>
  </div>

</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="road-ready-report-${slug.slice(0,8)}.html"`,
    },
  })
}
