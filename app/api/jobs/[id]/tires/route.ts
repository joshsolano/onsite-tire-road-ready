import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateRiskLevel, calculateLifeLeft } from '@/lib/calculations'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }   = await params
  const body     = await request.json()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const riskLevel = calculateRiskLevel(body)
  const lifeLeft  = calculateLifeLeft(body)

  const payload = {
    ...body,
    job_id:                   id,
    risk_level:               riskLevel,
    estimated_life_left_pct:  lifeLeft.pct,
    estimated_life_left_text: lifeLeft.text,
    estimated_miles_remaining: lifeLeft.miles_high,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('tire_records')
    .select('id')
    .eq('job_id', id)
    .eq('position', body.position)
    .single()

  let result
  if (existing) {
    result = await supabase.from('tire_records').update(payload).eq('id', existing.id).select().single()
  } else {
    result = await supabase.from('tire_records').insert(payload).select().single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json({ ok: true, tire_record: result.data })
}
