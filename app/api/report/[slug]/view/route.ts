import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = await createServiceClient()

    const { data: report } = await supabase
      .from('reports')
      .select('id, view_count, first_viewed_at')
      .eq('public_slug', slug)
      .single()

    if (!report) return NextResponse.json({ ok: false }, { status: 404 })

    const ip       = request.headers.get('x-forwarded-for') ?? 'unknown'
    const ipHash   = createHash('sha256').update(ip).digest('hex').slice(0, 16)
    const ua       = request.headers.get('user-agent') ?? ''
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua)

    await supabase.from('report_views').insert({
      report_id:   report.id,
      ip_hash:     ipHash,
      user_agent:  ua.slice(0, 200),
      device_type: isMobile ? 'mobile' : 'desktop',
    })

    const update: Record<string, unknown> = {
      view_count:    (report.view_count ?? 0) + 1,
      last_viewed_at: new Date().toISOString(),
      status: 'viewed',
    }
    if (!report.first_viewed_at) {
      update.first_viewed_at = new Date().toISOString()
    }

    await supabase.from('reports').update(update).eq('id', report.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
