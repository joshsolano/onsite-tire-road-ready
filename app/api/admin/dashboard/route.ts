import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = profile?.company_id

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [jobsRes, reportsRes] = await Promise.all([
    supabase.from('jobs').select('id, status, report_sent_at, report_generated_at').eq('company_id', companyId),
    supabase.from('reports').select('id, view_count, sent_at').eq('company_id', companyId),
  ])

  const jobs    = jobsRes.data ?? []
  const reports = reportsRes.data ?? []

  return NextResponse.json({
    total_jobs:      jobs.length,
    completed_jobs:  jobs.filter(j => ['completed','report_generated','report_sent'].includes(j.status)).length,
    reports_sent:    reports.filter(r => r.sent_at).length,
    reports_viewed:  reports.filter(r => r.view_count > 0).length,
    in_progress:     jobs.filter(j => j.status === 'in_progress').length,
  })
}
