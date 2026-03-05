import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check if tokens exist in settings table
    const { data: tokenData, error: tokenError } = await supabase
      .from('settings')
      .select('value, updated_at')
      .eq('key', 'xero_tokens')
      .single()

    if (tokenError) {
      return NextResponse.json({
        success: false,
        status: 'no_tokens',
        message: 'No Xero tokens found in settings table',
        error: tokenError.message,
        hint: 'Visit /api/auth/xero to start OAuth flow'
      })
    }

    if (!tokenData?.value) {
      return NextResponse.json({
        success: false,
        status: 'empty_tokens',
        message: 'Token entry exists but value is empty',
        hint: 'Visit /api/auth/xero to re-authenticate'
      })
    }

    // Parse tokens
    let tokens
    try {
      tokens = JSON.parse(tokenData.value)
    } catch (e) {
      return NextResponse.json({
        success: false,
        status: 'invalid_json',
        message: 'Token value is not valid JSON',
        hint: 'Visit /api/auth/xero to re-authenticate'
      })
    }

    // Check token expiry
    const now = Date.now()
    const expiresAt = tokens.expires_at
    const isExpired = expiresAt < now
    const expiresIn = Math.round((expiresAt - now) / 1000 / 60) // minutes

    // Check env vars
    const hasClientId = !!process.env.XERO_CLIENT_ID
    const hasClientSecret = !!process.env.XERO_CLIENT_SECRET

    return NextResponse.json({
      success: true,
      status: isExpired ? 'expired' : 'valid',
      tokens: {
        has_access_token: !!tokens.access_token,
        has_refresh_token: !!tokens.refresh_token,
        has_tenant_id: !!tokens.tenant_id,
        tenant_id: tokens.tenant_id ? tokens.tenant_id.substring(0, 8) + '...' : null,
        expires_at: new Date(expiresAt).toISOString(),
        is_expired: isExpired,
        expires_in_minutes: isExpired ? 'EXPIRED' : expiresIn
      },
      env: {
        has_client_id: hasClientId,
        has_client_secret: hasClientSecret
      },
      last_updated: tokenData.updated_at
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
