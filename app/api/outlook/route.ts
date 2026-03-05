import { NextResponse } from 'next/server'
import { outlookClient } from '@/lib/integrations/outlook/client'

// GET - List emails or test connection
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'test') {
      const result = await outlookClient.testConnection()
      return NextResponse.json(result)
    }

    if (action === 'profile') {
      const result = await outlookClient.getUserProfile()
      return NextResponse.json(result)
    }

    // Default: list emails
    const maxResults = parseInt(searchParams.get('maxResults') || '20')
    const folder = searchParams.get('folder') || 'inbox'

    const result = await outlookClient.listEmails({ maxResults, folder })
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Outlook GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST - Send email
export async function POST(request: Request) {
  try {
    const body = await request.json()

    const { to, subject, body: emailBody, isHtml } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    const result = await outlookClient.sendEmail({
      to,
      subject,
      body: emailBody,
      isHtml: isHtml !== false
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Outlook POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
