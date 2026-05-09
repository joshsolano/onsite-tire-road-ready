import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }     = await params
  const { status, note } = await request.json()
  const supabase   = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const update: Record<string, string> = { status }
  if (status === 'en_route')   update.started_at   = new Date().toISOString()
  if (status === 'arrived')    update.arrived_at    = new Date().toISOString()
  if (status === 'in_progress')update.started_at    = update.started_at ?? new Date().toISOString()
  if (status === 'completed')  update.completed_at  = new Date().toISOString()

  const { error } = await supabase.from('jobs').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('job_status_history').insert({
    job_id: id, status, changed_by: user.id, note: note ?? null
  })

  return NextResponse.json({ ok: true })
}
