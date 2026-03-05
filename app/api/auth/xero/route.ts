import { NextResponse } from 'next/server'
import { xeroClient } from '@/lib/integrations/xero/client'

// GET - Start OAuth flow (redirects to Xero)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const usePKCE = searchParams.get('pkce') === 'true'

    // Check if Xero returned an error
    if (error) {
      console.error('Xero OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        new URL(`/dashboard?xero_error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || '')}`, request.url)
      )
    }

    // Get the base URL for redirect
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const redirectUri = `${protocol}://${host}/api/auth/xero`

    console.log('Xero auth - redirect URI:', redirectUri)
    console.log('Xero auth - code present:', !!code)
    console.log('Xero auth - state:', state)

    // If we have a code, exchange it for tokens (callback)
    if (code) {
      console.log('Exchanging code for tokens...')
      const tokens = await xeroClient.exchangeCodeForTokens(code, redirectUri, state || undefined)

      if (tokens) {
        console.log('Token exchange successful, tenant_id:', tokens.tenant_id?.substring(0, 8) + '...')
        // Redirect to dashboard with success message
        return NextResponse.redirect(new URL('/dashboard?xero_connected=true', request.url))
      } else {
        console.error('Token exchange returned null')
        return NextResponse.redirect(new URL('/dashboard?xero_error=token_exchange_failed', request.url))
      }
    }

    // No code - start OAuth flow
    const { url: authUrl } = await xeroClient.getAuthUrl(redirectUri, usePKCE)
    console.log('Starting OAuth flow, redirecting to Xero...', usePKCE ? '(PKCE)' : '(Standard)')
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error('Xero auth error:', error)
    // Return JSON for debugging instead of redirect
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
