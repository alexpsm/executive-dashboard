import { NextResponse } from 'next/server'
import { xeroClient } from '@/lib/integrations/xero/client'
import { youtubeAnalyticsClient } from '@/lib/integrations/youtube/analytics-api'
import { instagramClient } from '@/lib/integrations/meta/instagram'
import { facebookClient } from '@/lib/integrations/meta/facebook'
import { tiktokClient } from '@/lib/integrations/tiktok/client'
import { mondayClient } from '@/lib/integrations/monday'

interface SyncResult {
  platform: string
  success: boolean
  error?: string
  data?: any
  requiresManualInput?: boolean
}

export async function POST() {
  const results: SyncResult[] = []

  // Sync all platforms in parallel
  const syncPromises = [
    // Xero
    xeroClient.syncToSupabase()
      .then(result => ({
        platform: 'xero',
        success: result.success,
        error: result.error,
        data: result.data
      }))
      .catch(error => ({
        platform: 'xero',
        success: false,
        error: error.message
      })),

    // YouTube
    youtubeAnalyticsClient.syncToSupabase()
      .then(result => ({
        platform: 'youtube',
        success: result.success,
        error: result.error,
        data: result.data
      }))
      .catch(error => ({
        platform: 'youtube',
        success: false,
        error: error.message
      })),

    // Instagram
    instagramClient.syncToSupabase()
      .then(result => ({
        platform: 'instagram',
        success: result.success,
        error: result.error,
        data: result.data
      }))
      .catch(error => ({
        platform: 'instagram',
        success: false,
        error: error.message
      })),

    // Facebook
    facebookClient.syncToSupabase()
      .then(result => ({
        platform: 'facebook',
        success: result.success,
        error: result.error,
        data: result.data
      }))
      .catch(error => ({
        platform: 'facebook',
        success: false,
        error: error.message
      })),

    // TikTok
    tiktokClient.syncToSupabase()
      .then(result => ({
        platform: 'tiktok',
        success: result.success,
        error: result.error,
        data: result.data,
        requiresManualInput: result.requiresManualInput
      }))
      .catch(error => ({
        platform: 'tiktok',
        success: false,
        error: error.message,
        requiresManualInput: true
      })),

    // Monday.com Deals
    mondayClient.syncDealsToSupabase()
      .then(result => ({
        platform: 'monday',
        success: result.success,
        error: result.error,
        data: { synced: result.synced }
      }))
      .catch(error => ({
        platform: 'monday',
        success: false,
        error: error.message
      }))
  ]

  const syncResults = await Promise.all(syncPromises)
  results.push(...syncResults)

  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length
  const manualRequired = results.filter(r => r.requiresManualInput).map(r => r.platform)

  return NextResponse.json({
    success: failureCount === 0,
    message: `Sync completed: ${successCount} succeeded, ${failureCount} failed`,
    results,
    summary: {
      succeeded: successCount,
      failed: failureCount,
      manualInputRequired: manualRequired
    }
  })
}

export async function GET() {
  // Return sync status for all platforms
  return NextResponse.json({
    platforms: ['xero', 'youtube', 'instagram', 'facebook', 'tiktok', 'monday'],
    message: 'Use POST to trigger sync for all platforms'
  })
}
