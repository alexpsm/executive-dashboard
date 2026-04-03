import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import type { YouTubeAnalytics, YouTubeDemographics, YouTubeSyncResult } from './types'
import { youtubeDataClient } from './data-api'
import { saveDemographicSnapshot } from '../demographics'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Check if a video is a Short using YouTube oEmbed API
// Shorts have vertical dimensions (height > width)
async function checkIfShort(videoId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const shortsUrl = encodeURIComponent(`https://www.youtube.com/shorts/${videoId}`)
    const url = `https://www.youtube.com/oembed?url=${shortsUrl}&format=json`

    const req = https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          // Shorts have vertical orientation (height > width)
          resolve(json.height > json.width)
        } catch {
          resolve(false)
        }
      })
    })

    req.on('error', () => resolve(false))
    req.setTimeout(3000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

// Batch check multiple videos for Short status
async function checkIfShortsBatch(videoIds: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()

  // Process in parallel batches of 10 to avoid overwhelming the API
  const batchSize = 10
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize)
    const checks = await Promise.all(
      batch.map(id => checkIfShort(id).then(isShort => ({ id, isShort })))
    )
    checks.forEach(({ id, isShort }) => results.set(id, isShort))
  }

  return results
}

class YouTubeAnalyticsClient {
  private oauth2Client: any = null

  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // Initialize OAuth2 client with stored tokens
  async getOAuth2Client() {
    if (this.oauth2Client) return this.oauth2Client

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Google OAuth credentials not configured')
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    this.oauth2Client.setCredentials({ refresh_token: refreshToken })

    return this.oauth2Client
  }

  // Get authenticated YouTube Analytics API instance
  async getAnalyticsAPI() {
    const auth = await this.getOAuth2Client()
    return google.youtubeAnalytics({ version: 'v2', auth })
  }

  // Get channel analytics for date range (YTD metrics)
  async getChannelAnalytics(startDate: string, endDate: string): Promise<YouTubeAnalytics | null> {
    try {
      const analytics = await this.getAnalyticsAPI()

      // First query: Core metrics
      const response = await analytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: [
          'views',
          'estimatedRevenue',
          'estimatedMinutesWatched',
          'averageViewDuration',
          'subscribersGained',
          'subscribersLost',
          'likes',
          'comments',
          'shares'
        ].join(','),
        dimensions: ''
      })

      const row = response.data.rows?.[0]
      if (!row) return null

      const views = parseInt(row[0] as string) || 0
      const likes = parseInt(row[6] as string) || 0
      const comments = parseInt(row[7] as string) || 0
      const shares = parseInt(row[8] as string) || 0

      // Calculate engagement rate: (likes + comments + shares) / views * 100
      const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0

      return {
        views: views,
        estimatedRevenue: parseFloat(row[1] as string) || 0,
        estimatedMinutesWatched: parseInt(row[2] as string) || 0,
        averageViewDuration: parseFloat(row[3] as string) || 0,
        subscribersGained: parseInt(row[4] as string) || 0,
        subscribersLost: parseInt(row[5] as string) || 0,
        likes,
        comments,
        shares,
        engagementRate: Math.round(engagementRate * 100) / 100,
        impressions: 0, // Will try to get from separate query
        impressionsCTR: 0
      }
    } catch (error: any) {
      console.error('YouTube Analytics error:', error.message)
      return null
    }
  }

  // Get impressions and CTR from Traffic Sources report
  async getImpressionMetrics(startDate: string, endDate: string): Promise<{ impressions: number; ctr: number } | null> {
    try {
      const analytics = await this.getAnalyticsAPI()

      // Try to get card impressions/CTR as a proxy
      const response = await analytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'cardImpressions,cardClickRate',
        dimensions: ''
      })

      const row = response.data.rows?.[0]
      if (row) {
        return {
          impressions: parseInt(row[0] as string) || 0,
          ctr: parseFloat(row[1] as string) || 0
        }
      }
      return null
    } catch {
      return null
    }
  }

  // Get impressions and CTR from YouTube Analytics
  async getImpressionsCTR(startDate: string, endDate: string): Promise<{ impressions: number; ctr: number } | null> {
    try {
      const analytics = await this.getAnalyticsAPI()

      const response = await analytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'impressions,impressionsClickThroughRate',
        dimensions: ''
      })

      const row = response.data.rows?.[0]
      if (!row) return null

      return {
        impressions: parseInt(row[0] as string) || 0,
        ctr: Math.round((parseFloat(row[1] as string) || 0) * 10000) / 100 // Convert to percentage (0.05 -> 5%)
      }
    } catch (error: any) {
      console.error('YouTube impressions/CTR error:', error.message)
      return null
    }
  }

  // Get revenue data
  async getRevenue(startDate: string, endDate: string): Promise<number> {
    try {
      const analytics = await this.getChannelAnalytics(startDate, endDate)
      return analytics?.estimatedRevenue || 0
    } catch {
      return 0
    }
  }

  // Get ALL views during a period, broken down by shorts vs videos
  // Uses monthly Analytics API queries which support the video dimension
  async getViewsBreakdownDuringPeriod(startDate: string, endDate: string): Promise<{
    totalViews: number
    shortsViews: number
    videoViews: number
    videosWithViews: number
    shortsWithViews: number
  }> {
    try {
      const analytics = await this.getAnalyticsAPI()

      // Parse dates to iterate through each month
      const start = new Date(startDate)
      const end = new Date(endDate)

      // Aggregate views per video across all months
      const aggregatedViews = new Map<string, number>()

      // Process month by month (Analytics API requires smaller date ranges for video dimension)
      let currentDate = new Date(start)
      while (currentDate <= end) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

        // Ensure we don't go past the end date
        const queryStart = monthStart < start ? start : monthStart
        const queryEnd = monthEnd > end ? end : monthEnd

        const queryStartStr = queryStart.toISOString().split('T')[0]
        const queryEndStr = queryEnd.toISOString().split('T')[0]

        try {
          // Query Analytics API for this month's views by video
          const response = await analytics.reports.query({
            ids: 'channel==MINE',
            startDate: queryStartStr,
            endDate: queryEndStr,
            metrics: 'views',
            dimensions: 'video',
            sort: '-views',
            maxResults: 500
          })

          for (const row of response.data.rows || []) {
            const videoId = row[0] as string
            const views = parseInt(row[1] as string) || 0
            aggregatedViews.set(videoId, (aggregatedViews.get(videoId) || 0) + views)
          }
        } catch (monthError: any) {
          // If monthly query fails too, fallback to estimating from all-time video data
          console.log(`YouTube: Month ${queryStartStr} query failed, will use fallback`)
        }

        // Move to next month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      }

      // If we got video-level data, use it
      if (aggregatedViews.size > 0) {
        const videoIds = Array.from(aggregatedViews.keys())
        console.log(`YouTube: Checking ${videoIds.length} videos for Short status (views breakdown)...`)
        const shortsMap = await checkIfShortsBatch(videoIds)

        let totalViews = 0
        let shortsViews = 0
        let videoViews = 0
        let shortsWithViews = 0
        let videosWithViews = 0

        for (const [videoId, views] of aggregatedViews) {
          totalViews += views
          const isShort = shortsMap.get(videoId) || false
          if (isShort) {
            shortsViews += views
            shortsWithViews++
          } else {
            videoViews += views
            videosWithViews++
          }
        }

        console.log(`YouTube: Views breakdown - ${shortsViews.toLocaleString()} shorts views, ${videoViews.toLocaleString()} video views`)
        return { totalViews, shortsViews, videoViews, videosWithViews, shortsWithViews }
      }

      // Fallback: Use channel analytics total and estimate breakdown from all-time video ratios
      console.log('YouTube: Using fallback ratio-based breakdown')
      const channelAnalytics = await this.getChannelAnalytics(startDate, endDate)
      const totalViews = channelAnalytics?.views || 0

      // Get all videos with current views to estimate ratio
      const videos = await youtubeDataClient.getVideos()
      let allTimeShortsViews = 0
      let allTimeVideoViews = 0

      for (const video of videos) {
        if (video.isShort) {
          allTimeShortsViews += video.viewCount
        } else {
          allTimeVideoViews += video.viewCount
        }
      }

      const totalAllTime = allTimeShortsViews + allTimeVideoViews
      const shortsRatio = totalAllTime > 0 ? allTimeShortsViews / totalAllTime : 0.3 // Default 30% if no data

      const shortsViews = Math.round(totalViews * shortsRatio)
      const videoViews = totalViews - shortsViews

      console.log(`YouTube: Estimated breakdown - ${shortsViews.toLocaleString()} shorts views (${Math.round(shortsRatio * 100)}%), ${videoViews.toLocaleString()} video views`)

      return {
        totalViews,
        shortsViews,
        videoViews,
        videosWithViews: videos.filter(v => !v.isShort).length,
        shortsWithViews: videos.filter(v => v.isShort).length
      }
    } catch (error: any) {
      console.error('YouTube views breakdown error:', error.message)
      return { totalViews: 0, shortsViews: 0, videoViews: 0, videosWithViews: 0, shortsWithViews: 0 }
    }
  }

  // Get demographics data
  async getDemographics(startDate: string, endDate: string): Promise<YouTubeDemographics[]> {
    try {
      const analytics = await this.getAnalyticsAPI()

      const response = await analytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'viewerPercentage',
        dimensions: 'ageGroup',
        sort: 'ageGroup'
      })

      return (response.data.rows || []).map(row => ({
        ageGroup: row[0] as string,
        percentage: parseFloat(row[1] as string) || 0
      }))
    } catch (error: any) {
      console.error('YouTube Demographics error:', error.message)
      return []
    }
  }

  // Calculate Gen Z audience (ages 13-17 and 18-24)
  async getGenZAudience(startDate: string, endDate: string, totalSubscribers: number): Promise<number> {
    const demographics = await this.getDemographics(startDate, endDate)

    const genZPercentage = demographics
      .filter(d => d.ageGroup === 'age13-17' || d.ageGroup === 'age18-24')
      .reduce((sum, d) => sum + d.percentage, 0)

    return Math.round(totalSubscribers * genZPercentage / 100)
  }

  // Full sync to Supabase - ALL METRICS ARE YTD (2026)
  async syncToSupabase(): Promise<YouTubeSyncResult> {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const startDate = startOfYear.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]

      // Get channel stats from Data API (for total subscribers reference)
      const channelStats = await youtubeDataClient.getChannelStats()
      if (!channelStats) {
        throw new Error('Failed to get channel stats')
      }

      // Sync all videos to content_posts table
      const videosCount = await youtubeDataClient.syncVideosToSupabase()

      // Get YTD video stats (for 2026-published content only - used for engagement rate)
      const ytdStats = await youtubeDataClient.getYTDVideoStats(startDate)

      // Get average views for 2026 videos only (KPI tracking)
      const { avgVideoViews, avgShortsViews } = await youtubeDataClient.getAverageViews(startDate)

      // Get engagement rates for 2026 videos only
      const { videoEngagement, shortsEngagement } = await youtubeDataClient.getEngagementRates(startDate)

      // Try to get YTD analytics data from Analytics API
      let analytics: YouTubeAnalytics | null = null
      let genZFollowers = 0
      let impressionData: { impressions: number; ctr: number } | null = null

      try {
        analytics = await this.getChannelAnalytics(startDate, endDate)
        impressionData = await this.getImpressionsCTR(startDate, endDate)

        if (analytics && channelStats.subscriberCount > 0) {
          genZFollowers = await this.getGenZAudience(startDate, endDate, channelStats.subscriberCount)
        }
      } catch (e) {
        console.log('Analytics API not available, using Data API fallback')
      }

      // Get ALL views during 2026, broken down by shorts vs videos
      // This includes views on ANY video (old or new) - for dashboard totals
      const viewsBreakdown = await this.getViewsBreakdownDuringPeriod(startDate, endDate)

      // Gross subscribers gained in 2026 (not net — matches YouTube Studio "Subscribers" tab)
      const subscribersGained = analytics
        ? analytics.subscribersGained
        : 0

      // Use the views breakdown for total/shorts/video views
      // These are ALL views during 2026 on ANY content
      const ytdViews = viewsBreakdown.totalViews || analytics?.views || 0
      const ytdShortsViews = viewsBreakdown.shortsViews
      const ytdVideoViews = viewsBreakdown.videoViews

      // Use engagement rate from 2026-published videos only (per user requirement)
      const engagementRate = videoEngagement

      console.log(`YouTube Sync: Total views=${ytdViews.toLocaleString()}, Shorts views=${ytdShortsViews.toLocaleString()}, Video views=${ytdVideoViews.toLocaleString()}`)

      // Store aggregate-only metrics in today's row
      // These are YTD calculations that can't come from daily sync:
      // - shorts_views (breakdown requires video-level analysis)
      // - avg_video_views, avg_shorts_views (calculated from 2026 videos)
      // - ctr, posts_count (aggregate KPIs)
      // Note: We DON'T store views, followers, yt_ad_revenue here - those come from daily sync
      // This prevents double-counting when health API sums daily values
      const { error: metricsError } = await this.supabase
        .from('social_metrics')
        .upsert({
          platform: 'youtube',
          metric_date: endDate,
          // Aggregate-only metrics (not available from daily sync)
          posts_count: ytdStats.videoCount + ytdStats.shortsCount, // Videos published in 2026
          shorts_views: ytdShortsViews, // ALL shorts views during 2026 (any short)
          avg_video_views: avgVideoViews, // Avg of 2026 videos (KPI tracking)
          avg_shorts_views: avgShortsViews, // Avg of 2026 shorts (KPI tracking)
          ctr: impressionData?.ctr || analytics?.impressionsCTR || 0,
          api_source: 'api'
        }, { onConflict: 'platform,metric_date' })

      if (metricsError) {
        console.error('YouTube social_metrics upsert error:', metricsError)
        throw new Error(`Failed to save YouTube metrics: ${metricsError.message}`)
      }

      // Upsert demographics
      if (genZFollowers > 0) {
        const demographics = await this.getDemographics(startDate, endDate)
        const age13_17 = demographics.find(d => d.ageGroup === 'age13-17')?.percentage || 0
        const age18_24 = demographics.find(d => d.ageGroup === 'age18-24')?.percentage || 0
        const age25_34 = demographics.find(d => d.ageGroup === 'age25-34')?.percentage || 0
        const age35_44 = demographics.find(d => d.ageGroup === 'age35-44')?.percentage || 0
        const age45_54 = demographics.find(d => d.ageGroup === 'age45-54')?.percentage || 0
        const age55_64 = demographics.find(d => d.ageGroup === 'age55-64')?.percentage || 0
        const age65plus = demographics.find(d => d.ageGroup === 'age65+')?.percentage || 0

        await this.supabase
          .from('audience_demographics')
          .upsert({
            platform: 'youtube',
            metric_date: endDate,
            age_13_17_percent: age13_17,
            age_18_24_percent: age18_24,
            gen_z_followers: genZFollowers,
            total_followers: channelStats.subscriberCount,
            api_source: 'api'
          }, { onConflict: 'platform,metric_date' })

        // Save monthly demographic snapshot for accurate Gen Z tracking
        await saveDemographicSnapshot({
          platform: 'youtube',
          total_followers: channelStats.subscriberCount,
          demographics: {
            age13_17: age13_17,
            age18_24: age18_24,
            age25_34: age25_34,
            age35_44: age35_44,
            age45_54: age45_54,
            age55_64: age55_64,
            age65plus: age65plus
          }
        })
      }

      // Update sync status
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'youtube_data',
          last_sync_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          records_synced: videosCount,
          is_healthy: true,
          last_error: null
        }, { onConflict: 'api_name' })

      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'youtube_analytics',
          last_sync_at: new Date().toISOString(),
          last_success_at: analytics ? new Date().toISOString() : null,
          records_synced: analytics ? 1 : 0,
          is_healthy: !!analytics,
          last_error: analytics ? null : 'Analytics API not available - using manual input'
        }, { onConflict: 'api_name' })

      return {
        success: true,
        data: {
          channelStats,
          videos: ytdStats.videoCount, // Videos published in 2026
          shorts: ytdStats.shortsCount, // Shorts published in 2026
          analytics: analytics || undefined,
          avgVideoViews, // Avg views on 2026 videos (KPI tracking)
          avgShortsViews, // Avg views on 2026 shorts (KPI tracking)
          ytd: {
            views: ytdViews, // ALL views during 2026 (any content)
            videoViews: ytdVideoViews, // ALL video views during 2026 (any video)
            shortsViews: ytdShortsViews, // ALL shorts views during 2026 (any short)
            subscribersGained,
            adRevenue: analytics?.estimatedRevenue || 0,
            engagementRate, // From 2026 videos only
            videoEngagement,
            shortsEngagement
          }
        }
      }
    } catch (error: any) {
      // Update sync status with error
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'youtube_data',
          last_sync_at: new Date().toISOString(),
          last_error: error.message,
          is_healthy: false
        }, { onConflict: 'api_name' })

      return { success: false, error: error.message }
    }
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      await this.getChannelAnalytics(
        startDate.toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      )
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const youtubeAnalyticsClient = new YouTubeAnalyticsClient()
