import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const clientId = process.env.XERO_CLIENT_ID
    const clientSecret = process.env.XERO_CLIENT_SECRET

    if (!clientId) {
      return NextResponse.json({
        success: false,
        error: 'XERO_CLIENT_ID not set in environment variables'
      })
    }

    if (!clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'XERO_CLIENT_SECRET not set in environment variables'
      })
    }

    // Build the redirect URI the same way the auth route does
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const redirectUri = `${protocol}://${host}/api/auth/xero`

    const scopes = [
      'openid',
      'profile',
      'email',
      'accounting.transactions.read',
      'accounting.reports.read',
      'accounting.settings.read',
      'accounting.contacts.read'
    ].join(' ')

    const authUrl = `https://identity.xero.com/connect/authorize?` + new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: 'xero_auth'
    }).toString()

    return NextResponse.json({
      success: true,
      client_id: clientId.substring(0, 8) + '...',
      redirect_uri: redirectUri,
      auth_url: authUrl,
      instructions: [
        '1. Make sure your Xero app has this redirect URI configured:',
        `   ${redirectUri}`,
        '',
        '2. Visit this URL to authenticate:',
        `   ${authUrl}`,
        '',
        '3. After authorization, check /api/debug/xero-status to confirm tokens are stored'
      ]
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
