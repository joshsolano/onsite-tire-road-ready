import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id }    = await params
    const { phone } = await request.json()
    const supabase  = await createClient()
    const service   = await createServiceClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: report } = await service
      .from('reports')
      .select('public_slug, id')
      .eq('job_id', id)
      .single()

    if (!report) return NextResponse.json({ error: 'Report not generated yet. Generate the report first.' }, { status: 400 })

    const { data: company } = await service
      .from('companies')
      .select('name')
      .eq('id', (await service.from('jobs').select('company_id').eq('id', id).single()).data?.company_id)
      .single()

    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://your-app.vercel.app'
    const reportUrl = `${appUrl}/report/${report.public_slug}`
    const companyName = company?.name ?? 'Road Ready'

    const message = `${companyName}: Your tire service report is ready. Tap to view your Road Ready Report: ${reportUrl}`

    // Twilio SMS
    const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID
    const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
    const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER

    let smsSent = false
    let smsError = ''

    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && phone) {
      try {
        const Twilio = (await import('twilio')).default
        const client = Twilio(TWILIO_SID, TWILIO_TOKEN)
        await client.messages.create({
          body: message,
          from: TWILIO_FROM,
          to:   phone.replace(/\D/g, '').length === 10 ? `+1${phone.replace(/\D/g, '')}` : phone,
        })
        smsSent = true
      } catch (e: unknown) {
        smsError = e instanceof Error ? e.message : 'SMS failed'
        console.error('Twilio error:', smsError)
      }
    } else {
      smsError = 'Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.'
    }

    // Update report + job
    await service.from('reports').update({
      status:        'sent',
      sent_at:       new Date().toISOString(),
      sent_via:      'sms',
      sent_to_phone: phone,
    }).eq('id', report.id)

    await service.from('jobs').update({
      status:         'report_sent',
      report_sent_at: new Date().toISOString(),
    }).eq('id', id)

    await service.from('job_status_history').insert({
      job_id: id, status: 'report_sent', changed_by: user.id,
      note: smsSent ? `SMS sent to ${phone}` : `SMS failed: ${smsError}. Link: ${reportUrl}`,
    })

    return NextResponse.json({
      ok:        true,
      sms_sent:  smsSent,
      sms_error: smsError || null,
      report_url: reportUrl,
      message: smsSent
        ? `Report SMS sent to ${phone}`
        : `Report link ready: ${reportUrl}${smsError ? ` (SMS: ${smsError})` : ''}`,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to send report' }, { status: 500 })
  }
}
