import { createClient } from '@supabase/supabase-js'
import type { TikTokMetrics, TikTokSyncResult, TikTokTokens } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const CONTENT_API = 'https://open.tiktokapis.com/v2'
const BUSINESS_API = 'https://business-api.tiktok.com/open_api/v1.3'

class TikTokClient {
  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // ── Token storage (Supabase settings table, same as Xero) ──────────────────

  public async getStoredTokens(): Promise<TikTokTokens | null> {
    try {
      const { data } = await this.supabase
        .from('settings')
        .select('value')
        .eq('key', 'tiktok_tokens')
        .single()
      if (data?.value) return JSON.parse(data.value) as TikTokTokens
    } catch {}
    return null
  }

  async storeTokens(tokens: TikTokTokens): Promise<void> {
    await this.supabase
      .from('settings')
      .upsert({
        key: 'tiktok_tokens',
        value: JSON.stringify(tokens),
        description: 'TikTok Business API OAuth tokens',
        updated_at: new Date().toISOString()
      })
  }

  // ── OAuth: exchange auth_code for access_token ────────────────────────────

  async exchangeCodeForToken(code: string, _redirectUri: string): Promise<{ success: boolean; error?: string }> {
    const appId = process.env.TIKTOK_APP_ID
    const secret = process.env.TIKTOK_APP_SECRET

    if (!appId || !secret) {
      return { success: false, error: 'TIKTOK_APP_ID or TIKTOK_APP_SECRET not configured' }
    }

    try {
      // TikTok Content API token exchange
      const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: appId.trim(),
          client_secret: secret.trim(),
          code: code.trim(),
          grant_type: 'authorization_code',
          redirect_uri: (process.env.TIKTOK_REDIRECT_URI || '').trim()
        })
      })

      const json = await res.json()
      console.log('TikTok token exchange response:', JSON.stringify(json, null, 2))

      if (json.error && json.error !== 'ok') {
        return { success: false, error: `${json.error}: ${json.error_description || JSON.stringify(json)}` }
      }

      const data = json.data || json
      const tokens: TikTokTokens = {
        access_token: data.access_token,
        open_id: data.open_id || '',
        refresh_token: data.refresh_token || '',
        scope: data.scope || '',
        expires_at: Date.now() + ((data.expires_in || 86400) * 1000),
        obtained_at: Date.now()
      }

      await this.storeTokens(tokens)
      return { success: true }
    } catch (err: any) {
      console.error('TikTok token exchange error:', err)
      return { success: false, error: err.message }
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    const appId = process.env.TIKTOK_APP_ID
    const secret = process.env.TIKTOK_APP_SECRET
    const tokens = await this.getStoredTokens()
    if (!appId || !secret || !tokens?.refresh_token) return false

    try {
      const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: appId.trim(),
          client_secret: secret.trim(),
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token.trim()
        })
      })
      const json = await res.json()
      if (json.error && json.error !== 'ok') return false

      const data = json.data || json
      if (!data.access_token) return false

      await this.storeTokens({
        ...tokens,
        access_token: data.access_token,
        refresh_token: data.refresh_token || tokens.refresh_token,
        expires_at: Date.now() + ((data.expires_in || 86400) * 1000),
        obtained_at: Date.now()
      })
      return true
    } catch {
      return false
    }
  }

  isApiConfigured(): boolean {
    return !!(process.env.TIKTOK_APP_ID && process.env.TIKTOK_APP_SECRET)
  }

  // ── Business API calls ────────────────────────────────────────────────────

  public async getAccessToken(): Promise<string> {
    let tokens = await this.getStoredTokens()
    if (!tokens?.access_token) throw new Error('No TikTok access token — please connect via OAuth')

    // Auto-refresh if expired or within 1 hour of expiry
    const expiresAt = tokens.expires_at || 0
    if (Date.now() > expiresAt - 3600000 && tokens.refresh_token) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        tokens = await this.getStoredTokens()
      }
    }

    return tokens!.access_token
  }

  // Get account info (followers, likes, video count) via Content API
  async getAccountInfo(): Promise<{ followers: number; likes: number; videos: number; display_name: string } | null> {
    try {
      const token = await this.getAccessToken()
      const url = new URL(`${CONTENT_API}/user/info/`)
      url.searchParams.set('fields', 'open_id,display_name,follower_count,following_count,likes_count,video_count')

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.error?.code && json.error.code !== 'ok') {
        throw new Error(json.error.message || json.error.code)
      }
      const user = json.data?.user
      return {
        followers: user?.follower_count || 0,
        likes: user?.likes_count || 0,
        videos: user?.video_count || 0,
        display_name: user?.display_name || ''
      }
    } catch (err: any) {
      console.error('TikTok getAccountInfo error:', err.message)
      return null
    }
  }

  // Get videos with engagement metrics via Content API
  async getVideos(): Promise<any[]> {
    try {
      const token = await this.getAccessToken()
      // Only these fields are valid on /v2/video/list/ — reach/impressions are NOT available
      const fields = 'id,create_time,title,view_count,like_count,comment_count,share_count,duration'
      const res = await fetch(`${CONTENT_API}/video/list/?fields=${fields}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: 20 })
      })
      const json = await res.json()
      if (json.error?.code && json.error.code !== 'ok') {
        throw new Error(json.error.message || json.error.code)
      }
      return json.data?.videos || []
    } catch (err: any) {
      console.error('TikTok getVideos error:', err.message)
      return []
    }
  }

  // ── Business API: daily metrics ──────────────────────────────────────────

  async getBusinessMetrics(startDate: string, endDate: string): Promise<any[]> {
    const tokens = await this.getStoredTokens()
    if (!tokens?.access_token || !tokens?.open_id) return []

    const fields = JSON.stringify([
      'daily_new_followers', 'daily_lost_followers', 'daily_total_followers',
      'followers_count', 'unique_video_views', 'video_views',
      'engagement_rate', 'average_comments', 'average_likes', 'average_shares', 'average_views'
    ])
    const url = `${BUSINESS_API}/business/get/?business_id=${tokens.open_id}&start_date=${startDate}&end_date=${endDate}&fields=${encodeURIComponent(fields)}`
    const res = await fetch(url, { headers: { 'Access-Token': tokens.access_token } })
    const json = await res.json()
    return json.code === 0 ? (json.data?.metrics || []) : []
  }

  // ── Sync to Supabase ──────────────────────────────────────────────────────

  async syncToSupabase(): Promise<TikTokSyncResult> {
    const tokens = await this.getStoredTokens()

    if (!tokens?.access_token) {
      await this.supabase.from('api_sync_status').upsert({
        api_name: 'tiktok',
        last_sync_at: new Date().toISOString(),
        last_error: 'Not connected — complete OAuth flow at /api/auth/tiktok',
        is_healthy: false
      }, { onConflict: 'api_name' })
      return { success: false, requiresManualInput: true, error: 'Not connected' }
    }

    try {
      const token = tokens.access_token
      const openId = tokens.open_id
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

      // Fetch yesterday's Business API metrics (followers, views, likes, comments, shares)
      const fields = JSON.stringify([
        'daily_new_followers', 'daily_lost_followers', 'followers_count',
        'unique_video_views', 'video_views', 'likes', 'comments', 'shares'
      ])
      const url = `${BUSINESS_API}/business/get/?business_id=${openId}&start_date=${yesterday}&end_date=${yesterday}&fields=${encodeURIComponent(fields)}`
      const metricsRes = await fetch(url, { headers: { 'Access-Token': token } })
      const metricsJson = await metricsRes.json()
      const dayMetrics = metricsJson.code === 0 ? (metricsJson.data?.metrics?.[0] || null) : null

      // Fetch first page of videos for reach (sorted by most recent)
      const videoFields = encodeURIComponent(JSON.stringify(['item_id', 'create_time', 'reach', 'video_views']))
      const videoRes = await fetch(
        `${BUSINESS_API}/business/video/list/?business_id=${openId}&fields=${videoFields}&max_count=20`,
        { headers: { 'Access-Token': token } }
      )
      const videoJson = await videoRes.json()
      const recentVideos: any[] = videoJson.code === 0 ? (videoJson.data?.videos || []) : []

      // Avg reach for videos published yesterday
      const yesterdayVideos = recentVideos.filter((v: any) => {
        const d = new Date(v.create_time * 1000).toISOString().split('T')[0]
        return d === yesterday
      })
      const reachPerPost = yesterdayVideos.length > 0
        ? Math.round(yesterdayVideos.reduce((s: number, v: any) => s + (v.reach || 0), 0) / yesterdayVideos.length)
        : null

      // Compute yesterday's metrics
      const gained = dayMetrics ? (dayMetrics.daily_new_followers || 0) - (dayMetrics.daily_lost_followers || 0) : 0
      const videoViews = dayMetrics?.video_views || 0
      const interactions = (dayMetrics?.likes || 0) + (dayMetrics?.comments || 0) + (dayMetrics?.shares || 0)
      const engagementRate = videoViews > 0
        ? Math.round((interactions / videoViews) * 10000) / 100
        : null

      const metrics: TikTokMetrics = {
        followers: dayMetrics?.followers_count || 0,
        followersGained: gained,
        engagementRate: engagementRate || 0,
        reachPerPost: reachPerPost || 0,
        forYouRate: 0,
        totalViews: videoViews
      }

      await this.supabase.from('social_metrics').upsert({
        platform: 'tiktok',
        metric_date: yesterday,
        followers: dayMetrics?.followers_count || null,
        followers_gained: gained,
        engagement: engagementRate,
        reach: reachPerPost,
        views: videoViews || null,
        is_manual_entry: false,
        api_source: 'api'
      }, { onConflict: 'platform,metric_date' })

      await this.supabase.from('api_sync_status').upsert({
        api_name: 'tiktok',
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        records_synced: 1,
        is_healthy: true,
        last_error: null
      }, { onConflict: 'api_name' })

      return { success: true, data: metrics, requiresManualInput: false }
    } catch (err: any) {
      console.error('TikTok sync error:', err.message)
      await this.supabase.from('api_sync_status').upsert({
        api_name: 'tiktok',
        last_sync_at: new Date().toISOString(),
        last_error: err.message,
        is_healthy: false
      }, { onConflict: 'api_name' })
      return { success: false, requiresManualInput: false, error: err.message }
    }
  }

  // ── Existing helpers ──────────────────────────────────────────────────────

  async getLatestMetrics(): Promise<TikTokMetrics | null> {
    const { data } = await this.supabase
      .from('social_metrics')
      .select('*')
      .eq('platform', 'tiktok')
      .order('metric_date', { ascending: false })
      .limit(1)
      .single()

    if (!data) return null
    return {
      followers: data.followers || 0,
      followersGained: data.followers_gained || 0,
      engagementRate: data.engagement || 0,
      reachPerPost: data.reach || 0,
      forYouRate: data.for_you_rate || 0,
      totalViews: data.views || 0
    }
  }

  async saveManualMetrics(metrics: Partial<TikTokMetrics>): Promise<{ success: boolean; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      await this.supabase.from('social_metrics').upsert({
        platform: 'tiktok',
        metric_date: today,
        followers: metrics.followers || 0,
        followers_gained: metrics.followersGained || 0,
        engagement: metrics.engagementRate || 0,
        reach: metrics.reachPerPost || 0,
        for_you_rate: metrics.forYouRate || 0,
        views: metrics.totalViews || 0,
        is_manual_entry: true,
        api_source: 'manual'
      }, { onConflict: 'platform,metric_date' })

      await this.supabase.from('api_sync_status').upsert({
        api_name: 'tiktok',
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        records_synced: 1,
        is_healthy: true,
        last_error: null
      }, { onConflict: 'api_name' })

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; requiresManualInput: boolean; account?: any }> {
    const tokens = await this.getStoredTokens()
    if (!tokens?.access_token) {
      return { success: false, requiresManualInput: true, error: 'Not connected — visit /api/auth/tiktok to connect' }
    }
    try {
      const account = await this.getAccountInfo()
      if (!account) return { success: false, requiresManualInput: false, error: 'Could not fetch account info' }
      return { success: true, requiresManualInput: false, account }
    } catch (err: any) {
      return { success: false, requiresManualInput: false, error: err.message }
    }
  }
}

export const tiktokClient = new TikTokClient()
