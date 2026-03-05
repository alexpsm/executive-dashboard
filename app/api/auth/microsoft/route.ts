import { NextResponse } from 'next/server'
import { outlookClient } from '@/lib/integrations/outlook/client'

// GET - Handle OAuth callback or start OAuth flow
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Check if Microsoft returned an error
    if (error) {
      console.error('Microsoft OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard?outlook_error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || '')}`, request.url)
      )
    }

    // If we have a code, exchange it for tokens (callback)
    if (code) {
      console.log('Exchanging Microsoft code for tokens...')
      const tokens = await outlookClient.exchangeCodeForTokens(code)

      if (tokens) {
        console.log('Microsoft token exchange successful')
        return NextResponse.redirect(new URL('/dashboard?outlook_connected=true', request.url))
      } else {
        console.error('Microsoft token exchange returned null')
        return NextResponse.redirect(new URL('/dashboard?outlook_error=token_exchange_failed', request.url))
      }
    }

    // No code - start OAuth flow
    const authUrl = outlookClient.getAuthUrl()
    console.log('Starting Microsoft OAuth flow...')
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Microsoft auth error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      },
      { status: 500 }
    )
  }
}

// POST - Disconnect Outlook
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === 'disconnect') {
      await outlookClient.disconnect()
      return NextResponse.json({ success: true, message: 'Outlook disconnected' })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Microsoft auth POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
