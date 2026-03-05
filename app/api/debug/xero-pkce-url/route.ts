import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: Request) {
  const clientId = process.env.XERO_CLIENT_ID

  if (!clientId) {
    return NextResponse.json({ error: 'XERO_CLIENT_ID not set' })
  }

  // Generate PKCE values
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  const state = crypto.randomBytes(16).toString('hex')

  const redirectUri = 'http://localhost:3000/api/auth/xero'

  const scopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    'accounting.transactions.read',
    'accounting.reports.read',
    'accounting.settings.read',
    'accounting.contacts.read'
  ].join(' ')

  const authUrl = `https://login.xero.com/identity/connect/authorize?` + new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  }).toString()

  return NextResponse.json({
    success: true,
    client_id: clientId,
    redirect_uri: redirectUri,
    auth_url: authUrl,
    pkce: {
      verifier: verifier,
      challenge: challenge,
      state: state
    },
    instructions: [
      '1. Make sure your Xero PKCE app has this EXACT redirect URI:',
      `   ${redirectUri}`,
      '',
      '2. Copy this auth_url and paste it in an INCOGNITO browser:',
      `   ${authUrl}`,
      '',
      '3. You should see a login page, then consent screen',
      '',
      'If it still goes straight to Xero dashboard, the redirect_uri might not match.'
    ]
  }, { status: 200 })
}
