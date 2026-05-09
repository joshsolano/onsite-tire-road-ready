import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'technician') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const service = await createServiceClient()

  // Fetch active technicians for this company
  const { data: techs } = await service
    .from('users')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('role', 'technician')
    .eq('is_active', true)
    .order('created_at')

  if (!techs?.length) {
    return NextResponse.json({ error: 'No active technicians found' }, { status: 400 })
  }

  // Fetch unassigned completed/sent jobs for this company
  const { data: jobs } = await service
    .from('jobs')
    .select('id')
    .eq('company_id', profile.company_id)
    .in('status', ['completed', 'report_generated', 'report_sent'])
    .is('assigned_tech_id', null)
    .order('created_at')

  if (!jobs?.length) {
    return NextResponse.json({ assigned: 0, message: 'No unassigned jobs to assign' })
  }

  // Round-robin distribute
  const updates = jobs.map((job, i) => ({
    id: job.id,
    assigned_tech_id: techs[i % techs.length].id,
  }))

  const { error } = await service
    .from('jobs')
    .upsert(updates, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ assigned: updates.length })
}
