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

  // Get active technicians
  const { data: techs, error: techErr } = await service
    .from('users')
    .select('id')
    .eq('company_id', profile.company_id)
    .eq('role', 'technician')
    .eq('is_active', true)
    .order('created_at')

  if (techErr) return NextResponse.json({ error: techErr.message }, { status: 500 })
  if (!techs?.length) return NextResponse.json({ error: 'No active technicians found' }, { status: 400 })

  // Get ALL non-cancelled jobs — force-assign regardless of current assigned_tech_id
  const { data: jobs, error: jobErr } = await service
    .from('jobs')
    .select('id')
    .eq('company_id', profile.company_id)
    .not('status', 'eq', 'cancelled')
    .order('created_at')

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 })
  if (!jobs?.length) return NextResponse.json({ assigned: 0, message: 'No jobs found' })

  // Round-robin: update each job individually (reliable; no upsert partial-object issues)
  const results = await Promise.all(
    jobs.map((job, i) =>
      service
        .from('jobs')
        .update({ assigned_tech_id: techs[i % techs.length].id })
        .eq('id', job.id)
    )
  )

  const failed = results.filter(r => r.error)
  if (failed.length) {
    return NextResponse.json({ error: failed[0].error!.message }, { status: 500 })
  }

  return NextResponse.json({ assigned: jobs.length })
}
