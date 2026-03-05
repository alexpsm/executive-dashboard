import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET
const MICROSOFT_TENANT_ID = process.env.MICROSOFT_TENANT_ID || 'common'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = `${APP_URL.replace(/\/$/, '')}/api/auth/microsoft`

// Microsoft Graph API endpoints
const AUTHORITY_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`
const TOKEN_ENDPOINT = `${AUTHORITY_URL}/oauth2/v2.0/token`
const AUTH_ENDPOINT = `${AUTHORITY_URL}/oauth2/v2.0/authorize`
const GRAPH_API_URL = 'https://graph.microsoft.com/v1.0'

// Scopes for email access
const SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'Mail.Read',
  'Mail.Send',
  'User.Read'
].join(' ')

interface OutlookTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface OutlookEmail {
  id: string
  subject: string
  from: {
    emailAddress: {
      name: string
      address: string
    }
  }
  receivedDateTime: string
  bodyPreview: string
  body?: {
    contentType: string
    content: string
  }
  isRead: boolean
}

class OutlookClient {
  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // Generate OAuth authorization URL
  getAuthUrl(): string {
    if (!MICROSOFT_CLIENT_ID) {
      throw new Error('MICROSOFT_CLIENT_ID not configured')
    }

    const params = new URLSearchParams({
      client_id: MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      response_mode: 'query',
      scope: SCOPES,
      state: 'outlook_auth'
    })

    return `${AUTH_ENDPOINT}?${params.toString()}`
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string): Promise<OutlookTokens | null> {
    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      throw new Error('Microsoft credentials not configured')
    }

    try {
      const params = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: SCOPES
      })

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Microsoft token exchange error:', error)
        throw new Error(error.error_description || 'Token exchange failed')
      }

      const tokens = await response.json()

      // Store tokens in Supabase
      await this.storeTokens(tokens)

      return tokens
    } catch (error: any) {
      console.error('Microsoft token exchange error:', error.message)
      return null
    }
  }

  // Store tokens in Supabase settings
  private async storeTokens(tokens: OutlookTokens): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await this.supabase.from('settings').upsert([
      { key: 'microsoft_access_token', value: tokens.access_token, updated_at: new Date().toISOString() },
      { key: 'microsoft_refresh_token', value: tokens.refresh_token, updated_at: new Date().toISOString() },
      { key: 'microsoft_token_expires', value: expiresAt, updated_at: new Date().toISOString() }
    ], { onConflict: 'key' })
  }

  // Get stored tokens
  private async getStoredTokens(): Promise<{ accessToken: string; refreshToken: string; expiresAt: string } | null> {
    const { data } = await this.supabase
      .from('settings')
      .select('key, value')
      .in('key', ['microsoft_access_token', 'microsoft_refresh_token', 'microsoft_token_expires'])

    if (!data || data.length < 3) return null

    const tokenMap = new Map(data.map(d => [d.key, d.value]))

    return {
      accessToken: tokenMap.get('microsoft_access_token') || '',
      refreshToken: tokenMap.get('microsoft_refresh_token') || '',
      expiresAt: tokenMap.get('microsoft_token_expires') || ''
    }
  }

  // Refresh access token if expired
  private async refreshAccessToken(refreshToken: string): Promise<string | null> {
    if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
      throw new Error('Microsoft credentials not configured')
    }

    try {
      const params = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: SCOPES
      })

      const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Microsoft token refresh error:', error)
        return null
      }

      const tokens = await response.json()
      await this.storeTokens(tokens)

      return tokens.access_token
    } catch (error: any) {
      console.error('Microsoft token refresh error:', error.message)
      return null
    }
  }

  // Get valid access token (refresh if needed)
  async getAccessToken(): Promise<string | null> {
    const stored = await this.getStoredTokens()

    if (!stored) {
      return null
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = new Date(stored.expiresAt)
    const now = new Date()
    const bufferMs = 5 * 60 * 1000 // 5 minutes

    if (expiresAt.getTime() - bufferMs < now.getTime()) {
      // Token expired or about to expire, refresh it
      return this.refreshAccessToken(stored.refreshToken)
    }

    return stored.accessToken
  }

  // List emails from inbox
  async listEmails(params?: {
    maxResults?: number
    folder?: string
  }): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      const accessToken = await this.getAccessToken()

      if (!accessToken) {
        return { success: false, error: 'Not authenticated. Please connect Outlook first.' }
      }

      const folder = params?.folder || 'inbox'
      const maxResults = params?.maxResults || 20

      const response = await fetch(
        `${GRAPH_API_URL}/me/mailFolders/${folder}/messages?$top=${maxResults}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime desc`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to fetch emails')
      }

      const data = await response.json()

      const messages = data.value.map((email: OutlookEmail) => ({
        id: email.id,
        subject: email.subject,
        from: email.from?.emailAddress?.address || 'Unknown',
        fromName: email.from?.emailAddress?.name || '',
        date: email.receivedDateTime,
        snippet: email.bodyPreview,
        isRead: email.isRead
      }))

      return { success: true, messages }
    } catch (error: any) {
      console.error('Outlook listEmails error:', error.message)
      return { success: false, error: error.message }
    }
  }

  // Send email
  async sendEmail(params: {
    to: string
    subject: string
    body: string
    isHtml?: boolean
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken()

      if (!accessToken) {
        return { success: false, error: 'Not authenticated. Please connect Outlook first.' }
      }

      const message = {
        message: {
          subject: params.subject,
          body: {
            contentType: params.isHtml !== false ? 'HTML' : 'Text',
            content: params.body
          },
          toRecipients: [
            {
              emailAddress: {
                address: params.to
              }
            }
          ]
        },
        saveToSentItems: true
      }

      const response = await fetch(
        `${GRAPH_API_URL}/me/sendMail`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(message)
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to send email')
      }

      return { success: true }
    } catch (error: any) {
      console.error('Outlook sendEmail error:', error.message)
      return { success: false, error: error.message }
    }
  }

  // Get current user profile
  async getUserProfile(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const accessToken = await this.getAccessToken()

      if (!accessToken) {
        return { success: false, error: 'Not authenticated' }
      }

      const response = await fetch(
        `${GRAPH_API_URL}/me`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to get user profile')
      }

      const user = await response.json()

      return {
        success: true,
        user: {
          id: user.id,
          displayName: user.displayName,
          email: user.mail || user.userPrincipalName,
          jobTitle: user.jobTitle
        }
      }
    } catch (error: any) {
      console.error('Outlook getUserProfile error:', error.message)
      return { success: false, error: error.message }
    }
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
      const profile = await this.getUserProfile()

      if (profile.success && profile.user) {
        return { success: true, email: profile.user.email }
      }

      return { success: false, error: profile.error || 'Not connected' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Clear stored tokens (disconnect)
  async disconnect(): Promise<void> {
    await this.supabase
      .from('settings')
      .delete()
      .in('key', ['microsoft_access_token', 'microsoft_refresh_token', 'microsoft_token_expires'])
  }
}

export const outlookClient = new OutlookClient()
