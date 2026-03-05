import { createClient } from '@supabase/supabase-js'
import type { TikTokMetrics, TikTokSyncResult } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * TikTok Integration Client
 *
 * Note: TikTok's API is highly restrictive and requires:
 * - Approved Business Account
 * - TikTok for Business API access
 * - Or TikTok Research API (requires university/research affiliation)
 *
 * This client primarily supports manual input with the option to
 * integrate the API if credentials become available.
 */
class TikTokClient {
  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // Check if TikTok API is configured
  isApiConfigured(): boolean {
    return !!(
      process.env.TIKTOK_CLIENT_KEY &&
      process.env.TIKTOK_CLIENT_SECRET &&
      process.env.TIKTOK_ACCESS_TOKEN
    )
  }

  // Get latest TikTok metrics from database
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

  // Save manual metrics input
  async saveManualMetrics(metrics: Partial<TikTokMetrics>): Promise<{ success: boolean; error?: string }> {
    try {
      const today = new Date().toISOString().split('T')[0]

      await this.supabase
        .from('social_metrics')
        .upsert({
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

      // Also save to manual_metrics for tracking
      const manualEntries = [
        { key: 'tiktok_followers', value: metrics.followers },
        { key: 'tiktok_followers_gained', value: metrics.followersGained },
        { key: 'tiktok_engagement_rate', value: metrics.engagementRate },
        { key: 'tiktok_reach_per_post', value: metrics.reachPerPost },
        { key: 'tiktok_for_you_rate', value: metrics.forYouRate }
      ]

      for (const entry of manualEntries) {
        if (entry.value !== undefined) {
          await this.supabase
            .from('manual_metrics')
            .upsert({
              metric_key: entry.key,
              metric_value: entry.value,
              metric_date: today,
              platform: 'tiktok'
            }, { onConflict: 'metric_key,metric_date' })
        }
      }

      // Update sync status
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'tiktok',
          last_sync_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          records_synced: 1,
          is_healthy: true,
          last_error: null
        }, { onConflict: 'api_name' })

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Sync (will return manual input required status)
  async syncToSupabase(): Promise<TikTokSyncResult> {
    // If API not configured, indicate manual input is required
    if (!this.isApiConfigured()) {
      // Check if we have recent manual data
      const latestMetrics = await this.getLatestMetrics()

      // Update sync status to indicate manual input needed
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'tiktok',
          last_sync_at: new Date().toISOString(),
          last_error: 'TikTok API not configured - manual input required',
          is_healthy: !!latestMetrics,
          requires_reauth: false
        }, { onConflict: 'api_name' })

      return {
        success: !!latestMetrics,
        data: latestMetrics || undefined,
        requiresManualInput: true,
        error: latestMetrics ? undefined : 'No TikTok data available - please enter manually'
      }
    }

    // If API is configured, attempt to fetch data
    // This is a placeholder for future TikTok API integration
    try {
      // TODO: Implement TikTok API calls when credentials are available
      // const response = await this.fetchFromApi()

      return {
        success: false,
        requiresManualInput: true,
        error: 'TikTok API integration not yet implemented'
      }
    } catch (error: any) {
      return {
        success: false,
        requiresManualInput: true,
        error: error.message
      }
    }
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; error?: string; requiresManualInput: boolean }> {
    if (!this.isApiConfigured()) {
      return {
        success: false,
        error: 'TikTok API not configured - using manual input',
        requiresManualInput: true
      }
    }

    // Would test API connection here if configured
    return {
      success: false,
      error: 'TikTok API test not implemented',
      requiresManualInput: true
    }
  }
}

export const tiktokClient = new TikTokClient()
