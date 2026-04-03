import { NextRequest, NextResponse } from 'next/server'
import { tiktokClient } from '@/lib/integrations/tiktok/client'

// GET - Start OAuth flow OR handle callback (TikTok Content API / account holder flow)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const clientKey = process.env.TIKTOK_APP_ID
  if (!clientKey) {
    return NextResponse.json({ error: 'TIKTOK_APP_ID not configured' }, { status: 500 })
  }

  const redirectUri = process.env.TIKTOK_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/tiktok`

  // --- Callback: exchange code for token ---
  if (code) {
    try {
      const result = await tiktokClient.exchangeCodeForToken(code, redirectUri)
      if (result.success) {
        return NextResponse.redirect(new URL('/social?tiktok_connected=true', request.url))
      } else {
        return NextResponse.redirect(
          new URL(`/social?tiktok_error=${encodeURIComponent(result.error || 'token_exchange_failed')}`, request.url)
        )
      }
    } catch (err: any) {
      return NextResponse.redirect(
        new URL(`/social?tiktok_error=${encodeURIComponent(err.message)}`, request.url)
      )
    }
  }

  if (error) {
    return NextResponse.redirect(
      new URL(`/social?tiktok_error=${encodeURIComponent(error)}`, request.url)
    )
  }

  // --- Initiate OAuth (Content API) ---
  const stateParam = Math.random().toString(36).substring(2)

  const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/')
  authUrl.searchParams.set('client_key', clientKey)
  authUrl.searchParams.set('scope', 'user.info.basic,user.info.stats,video.list')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', stateParam)

  return NextResponse.redirect(authUrl.toString())
}
