import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }    = await params
  const { items } = await request.json()
  const supabase  = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  for (const item of items) {
    await supabase.from('checklist_items').update({
      completed:    item.completed,
      completed_by: item.completed ? user.id : null,
      completed_at: item.completed ? new Date().toISOString() : null,
    }).eq('id', item.id)
  }

  return NextResponse.json({ ok: true })
}
