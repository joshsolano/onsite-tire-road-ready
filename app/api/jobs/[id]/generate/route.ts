import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  calculateRiskLevel, calculateLifeLeft, calculateTimeSaved,
  selectGoodCallBadges, selectTireFacts, calculateNextServiceDate,
  worstRisk, getRiskReasons
} from '@/lib/calculations'
import type { TireRecord } from '@/lib/types'

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const service  = await createServiceClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: job } = await service
      .from('jobs')
      .select('*, tire_records(*), photos(*), checklist_items(*), company:companies(*), customer:customers(*), vehicle:vehicles(*)')
      .eq('id', id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const tires   = (job.tire_records ?? []) as TireRecord[]
    const company = job.company as { google_review_url: string } | null

    // Calculate per-tire values
    const enrichedTires = tires.map(tire => ({
      ...tire,
      risk_level:               calculateRiskLevel(tire),
      ...calculateLifeLeft(tire),
    }))

    // Update tire records with calculated values
    for (const t of enrichedTires) {
      await service.from('tire_records').update({
        risk_level:               t.risk_level,
        estimated_life_left_pct:  t.pct,
        estimated_life_left_text: t.text,
        estimated_miles_remaining: t.miles_high,
      }).eq('id', t.id)
    }

    // Report-level calculations
    const risks     = enrichedTires.map(t => t.risk_level)
    const topRisk   = worstRisk(risks)
    const reasons   = getRiskReasons(enrichedTires)
    const badges    = selectGoodCallBadges(enrichedTires)
    const facts     = selectTireFacts(enrichedTires)
    const timeSaved = calculateTimeSaved(job.service_type, job.tire_count)
    const nextSvc   = calculateNextServiceDate(job.completed_at ?? new Date().toISOString())

    const reportPayload = {
      job_id:               id,
      company_id:           job.company_id,
      customer_id:          job.customer_id,
      vehicle_id:           job.vehicle_id,
      tone:                 job.report_tone ?? 'friendly',
      status:               'generated',
      good_call_badges:     badges,
      risk_summary:         { level: topRisk, reasons, worst_position: enrichedTires[0]?.position ?? null },
      time_saved_minutes:   timeSaved.total_minutes,
      time_saved_breakdown: Object.fromEntries(timeSaved.breakdown.map(b => [b.label, b.minutes])),
      tire_facts:           facts,
      next_service_date:    nextSvc.rotation_date,
      next_service_notes:   `Recommended rotation around ${nextSvc.rotation_date}. Inspection around ${nextSvc.inspection_date}.`,
      generated_by:         user.id,
    }

    const { data: existing } = await service.from('reports').select('id').eq('job_id', id).single()

    let reportId: string
    if (existing) {
      await service.from('reports').update(reportPayload).eq('id', existing.id)
      reportId = existing.id
    } else {
      const { data: newReport, error } = await service.from('reports').insert(reportPayload).select('id, public_slug').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      reportId = newReport.id
    }

    // Update job status
    await service.from('jobs').update({
      status: 'report_generated',
      report_generated_at: new Date().toISOString(),
    }).eq('id', id)

    await service.from('job_status_history').insert({
      job_id: id, status: 'report_generated', changed_by: user.id, note: 'Report auto-generated'
    })

    const { data: finalReport } = await service.from('reports').select('*').eq('id', reportId).single()
    return NextResponse.json({ ok: true, report: finalReport })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
