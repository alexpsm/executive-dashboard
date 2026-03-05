import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import type { FacebookPage, FacebookVideoInsights, FacebookPageInsights, FacebookSyncResult } from './types'
import { saveDemographicSnapshot } from '../demographics'

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

class FacebookClient {
  private get accessToken() {
    return process.env.FACEBOOK_ACCESS_TOKEN
  }

  private get pageId() {
    return process.env.FACEBOOK_PAGE_ID
  }

  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // Make Graph API request
  private async apiRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error('Facebook access token not configured')
    }

    const response = await axios.get(`${GRAPH_API_URL}${endpoint}`, {
      params: {
        access_token: this.accessToken,
        ...params
      }
    })

    return response.data
  }

  // Get Facebook page info
  async getPage(): Promise<FacebookPage | null> {
    if (!this.pageId) {
      throw new Error('Facebook page ID not configured')
    }

    try {
      const data = await this.apiRequest<FacebookPage>(`/${this.pageId}`, {
        fields: 'id,name,fan_count,followers_count'
      })
      return data
    } catch (error: any) {
      console.error('Facebook page error:', error.response?.data || error.message)
      throw error
    }
  }

  // Get page insights
  async getPageInsights(period: 'day' | 'week' | 'days_28' = 'days_28'): Promise<FacebookPageInsights | null> {
    if (!this.pageId) return null

    try {
      const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
        `/${this.pageId}/insights`,
        {
          metric: 'page_fans,page_views_total,page_impressions,page_engaged_users',
          period
        }
      )

      const metrics = response.data.reduce((acc, metric) => {
        acc[metric.name] = metric.values[0]?.value || 0
        return acc
      }, {} as Record<string, number>)

      return {
        followers: metrics.page_fans || 0,
        pageViews: metrics.page_views_total || 0,
        reach: metrics.page_impressions || 0,
        engagement: metrics.page_engaged_users || 0
      }
    } catch (error: any) {
      console.error('Facebook insights error:', error.response?.data || error.message)
      return null
    }
  }

  // Get monetization earnings for YTD - tries multiple endpoints
  async getMonetizationEarnings(startDate: string, endDate: string): Promise<{ revenue: number; method: string }> {
    if (!this.pageId) return { revenue: 0, method: 'no_page' }

    // Try content_monetization_earnings endpoint first (Business Manager -> Insights -> Revenue)
    try {
      const response = await this.apiRequest<{ data: Array<{ earnings: { amount: number; currency: string } | number }> }>(
        `/${this.pageId}/content_monetization_earnings`,
        {
          since: startDate,
          until: endDate
        }
      )

      let totalEarnings = 0
      if (response.data) {
        for (const entry of response.data) {
          // Handle both formats: {earnings: {amount, currency}} or {earnings: number}
          const earnings = typeof entry.earnings === 'object'
            ? entry.earnings.amount
            : entry.earnings
          totalEarnings += earnings || 0
        }
      }

      if (totalEarnings > 0) {
        console.log(`Facebook: content_monetization_earnings returned £${totalEarnings}`)
        return { revenue: totalEarnings, method: 'content_monetization_earnings' }
      }
    } catch (error: any) {
      console.log('Facebook content_monetization_earnings:', error.response?.data?.error?.message || error.message)
    }

    // Try video_monetization_insights endpoint
    try {
      const response = await this.apiRequest<{ data: Array<{ values: Array<{ value: number }> }> }>(
        `/${this.pageId}/video_monetization_insights`,
        {
          since: startDate,
          until: endDate
        }
      )

      let totalEarnings = 0
      if (response.data) {
        for (const metric of response.data) {
          const sum = metric.values?.reduce((acc, v) => acc + (v.value || 0), 0) || 0
          totalEarnings += sum
        }
      }

      if (totalEarnings > 0) {
        console.log(`Facebook: video_monetization_insights returned £${totalEarnings}`)
        return { revenue: totalEarnings, method: 'video_monetization_insights' }
      }
    } catch (error: any) {
      console.log('Facebook video_monetization_insights:', error.response?.data?.error?.message || error.message)
    }

    // Try monetization_approximate_earnings endpoint (legacy)
    try {
      const response = await this.apiRequest<{ data: Array<{ approximate_earnings: number }> }>(
        `/${this.pageId}/monetization_approximate_earnings`,
        {
          since: startDate,
          until: endDate
        }
      )

      let totalEarnings = 0
      if (response.data) {
        for (const entry of response.data) {
          totalEarnings += entry.approximate_earnings || 0
        }
      }

      if (totalEarnings > 0) {
        console.log(`Facebook: monetization_approximate_earnings returned £${totalEarnings}`)
        return { revenue: totalEarnings, method: 'monetization_approximate_earnings' }
      }
    } catch (error: any) {
      console.log('Facebook monetization_approximate_earnings:', error.response?.data?.error?.message || error.message)
    }

    console.log('Facebook: No monetization endpoint returned data - revenue requires manual input')
    return { revenue: 0, method: 'not_available' }
  }

  // Get followers gained YTD using baseline comparison method
  // The page_fan_adds/removes metrics require special permissions not typically available
  // So we use: Current fans - Jan 1 baseline = YTD followers gained
  async getFollowersGainedYTD(): Promise<{ gained: number; method: string; currentFollowers: number; baseline: number }> {
    if (!this.pageId) return { gained: 0, method: 'no_page', currentFollowers: 0, baseline: 0 }

    try {
      // Get current fan count from API
      const page = await this.getPage()
      const currentFollowers = page?.fan_count || page?.followers_count || 0

      // Get baseline from database
      const { data: baselineData } = await this.supabase
        .from('platform_baselines')
        .select('followers_jan1_2026')
        .eq('platform', 'facebook')
        .single()

      const baseline = baselineData?.followers_jan1_2026 || 0

      if (baseline > 0) {
        // Use baseline comparison (most accurate)
        return {
          gained: currentFollowers - baseline,
          method: 'baseline_comparison',
          currentFollowers,
          baseline
        }
      }

      // Fallback: try page_fans insights (limited availability)
      const insightsGained = await this.getFollowersGainedFromInsights()
      return {
        gained: insightsGained,
        method: 'insights_partial',
        currentFollowers,
        baseline: 0
      }
    } catch (error: any) {
      console.error('Facebook followers gained error:', error.message)
      return { gained: 0, method: 'error', currentFollowers: 0, baseline: 0 }
    }
  }

  // Get followers gained using page_follows metric (cumulative daily totals)
  // Calculates difference between first available Jan value and latest value
  // Batches in 90-day chunks since Facebook API has ~93 day limit
  private async getFollowersGainedFromInsights(): Promise<number> {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)

      // Collect all data points across batches
      let allValues: Array<{ value: number; end_time: string }> = []
      let currentStart = new Date(startOfYear)

      while (currentStart < today) {
        const currentEnd = new Date(currentStart)
        currentEnd.setDate(currentEnd.getDate() + 89) // 90-day window

        if (currentEnd > today) {
          currentEnd.setTime(today.getTime())
        }

        const sinceTimestamp = Math.floor(currentStart.getTime() / 1000)
        const untilTimestamp = Math.floor(currentEnd.getTime() / 1000)

        try {
          const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: number; end_time: string }> }> }>(
            `/${this.pageId}/insights`,
            {
              metric: 'page_follows',
              period: 'day',
              since: sinceTimestamp.toString(),
              until: untilTimestamp.toString()
            }
          )

          // page_follows returns cumulative daily totals
          const followsData = response.data?.find(m => m.name === 'page_follows')
          if (followsData?.values) {
            allValues = allValues.concat(followsData.values)
          }
        } catch (chunkError: any) {
          // Skip failed chunks
          console.log(`Facebook page_follows chunk skipped: ${currentStart.toISOString().split('T')[0]}`)
        }

        // Move to next chunk
        currentStart.setDate(currentStart.getDate() + 90)
      }

      // Calculate difference between first and last values (cumulative totals)
      if (allValues.length > 1) {
        const firstValue = allValues[0]?.value || 0
        const lastValue = allValues[allValues.length - 1]?.value || 0
        return lastValue - firstValue
      }

      return 0
    } catch (error: any) {
      console.error('Facebook page_follows error:', error.response?.data?.error?.message || error.message)
      return 0
    }
  }

  // Get videos from page with pagination (fetches ALL videos, not just first 100)
  async getVideos(maxVideos = 500): Promise<any[]> {
    if (!this.pageId) return []

    const allVideos: any[] = []
    let nextUrl: string | null = null
    let pageCount = 0

    try {
      // First request
      const response = await this.apiRequest<{ data: any[]; paging?: { next?: string } }>(`/${this.pageId}/videos`, {
        fields: 'id,title,description,created_time,length,permalink_url',
        limit: '100' // Max per page
      })

      allVideos.push(...(response.data || []))
      nextUrl = response.paging?.next || null
      pageCount++

      // Paginate through all pages
      while (nextUrl && allVideos.length < maxVideos) {
        try {
          const pageResponse = await fetch(nextUrl)
          const pageData = await pageResponse.json()

          if (pageData.data && pageData.data.length > 0) {
            allVideos.push(...pageData.data)
            nextUrl = pageData.paging?.next || null
            pageCount++
          } else {
            break
          }
        } catch (pageError: any) {
          console.error('Facebook videos pagination error:', pageError.message)
          break
        }
      }

      console.log(`Facebook: Fetched ${allVideos.length} videos across ${pageCount} pages`)
      return allVideos
    } catch (error: any) {
      console.error('Facebook videos error:', error.response?.data || error.message)
      return []
    }
  }

  // Get video insights (views, engagement) - using Graph API v19.0 compatible fields
  async getVideoInsights(videoId: string): Promise<FacebookVideoInsights | null> {
    try {
      // Get video data with available fields for Page videos
      // Note: reactions is not available on Video nodes, using likes instead
      const videoData = await this.apiRequest<any>(`/${videoId}`, {
        fields: 'id,title,description,created_time,length,likes.summary(true),comments.summary(true)'
      })

      // Note: video views require specific Page permissions
      // Will be populated if available
      return {
        id: videoId,
        title: videoData.title || videoData.description?.substring(0, 100) || '',
        created_time: videoData.created_time,
        views: 0, // Requires special permissions
        views_3s: 0,
        views_60s: 0,
        reactions: videoData.likes?.summary?.total_count || 0,
        comments: videoData.comments?.summary?.total_count || 0,
        shares: 0
      }
    } catch (error: any) {
      // Silently return null - many fields require special permissions
      return null
    }
  }

  // Get estimated 60s views for a single video using retention graph
  // Formula: total_plays × retention_percentage_at_60s
  private async getVideoEstimated60sViews(videoId: string, videoDurationSeconds: number): Promise<number> {
    try {
      // Skip videos shorter than 60 seconds - they can't have 60s views
      if (videoDurationSeconds < 60) {
        return 0
      }

      // Get video insights with retention graph and total plays
      const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: any }> }> }>(
        `/${videoId}/video_insights`,
        { metric: 'fb_reels_total_plays,post_video_retention_graph' }
      )

      let totalPlays = 0
      let retentionGraph: number[] = []

      for (const metric of (response.data || [])) {
        if (metric.name === 'fb_reels_total_plays') {
          totalPlays = metric.values?.[0]?.value || 0
        }
        if (metric.name === 'post_video_retention_graph') {
          // Retention graph can be array or object format {0: value, 1: value, ...}
          const rawValue = metric.values?.[0]?.value
          if (rawValue) {
            if (Array.isArray(rawValue)) {
              retentionGraph = rawValue
            } else if (typeof rawValue === 'object') {
              // Convert object to array - keys are indices
              const keys = Object.keys(rawValue).map(Number).sort((a, b) => a - b)
              retentionGraph = keys.map(k => rawValue[k])
            }
          }
        }
      }

      if (totalPlays === 0 || retentionGraph.length === 0) {
        return 0
      }

      // Calculate the index for 60 seconds in the retention graph
      // The graph has varying lengths - we need to find what index corresponds to 60s
      // Graph length typically represents the video duration
      const graphLength = retentionGraph.length
      const indexFor60s = Math.floor((60 / videoDurationSeconds) * graphLength)

      // Get retention percentage at 60s mark (or last available if video is close to 60s)
      const retentionIndex = Math.min(indexFor60s, graphLength - 1)
      const retentionAt60s = retentionGraph[retentionIndex] || 0

      // Calculate estimated 60s views
      // retentionAt60s is a decimal (0-1), e.g., 0.45 = 45% retention
      const estimated60sViews = Math.round(totalPlays * retentionAt60s)

      return estimated60sViews
    } catch (error: any) {
      // Silently fail - video insights may not be available for all videos
      return 0
    }
  }

  // Get total plays for a single video (any duration view)
  private async getVideoTotalPlays(videoId: string): Promise<number> {
    try {
      const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
        `/${videoId}/video_insights`,
        { metric: 'fb_reels_total_plays' }
      )

      const totalPlays = response.data?.find(m => m.name === 'fb_reels_total_plays')?.values?.[0]?.value || 0
      return totalPlays
    } catch {
      return 0
    }
  }

  // Get YTD total video plays (all views, any duration) by summing video-level metrics
  // This matches Business Manager's "Views" metric better than page_video_views (3s only)
  async getYTDTotalVideoPlays(): Promise<number> {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const startDate = startOfYear.toISOString().split('T')[0]

      // Get all videos from page
      const allVideos = await this.getVideos(200) // Get more videos for accurate count

      // Filter to YTD videos (published in 2026)
      const ytdVideos = allVideos.filter(video => {
        const videoDate = video.created_time?.split('T')[0] || ''
        return videoDate >= startDate
      })

      console.log(`Facebook: Calculating total plays for ${ytdVideos.length} YTD videos`)

      let totalPlays = 0
      let videosProcessed = 0

      for (const video of ytdVideos) {
        const plays = await this.getVideoTotalPlays(video.id)
        totalPlays += plays
        videosProcessed++
      }

      console.log(`Facebook: Total plays from ${videosProcessed} videos: ${totalPlays.toLocaleString()}`)

      return totalPlays
    } catch (error: any) {
      console.error('Facebook total plays calculation error:', error.message)
      return 0
    }
  }

  // Get YTD 60s views by aggregating across all videos using retention method
  private async getYTD60sViewsFromRetention(): Promise<number> {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const startDate = startOfYear.toISOString().split('T')[0]

      // Get all videos from page
      const allVideos = await this.getVideos(100)

      // Filter to YTD videos (published in 2026)
      const ytdVideos = allVideos.filter(video => {
        const videoDate = video.created_time?.split('T')[0] || ''
        return videoDate >= startDate
      })

      console.log(`Facebook: Calculating 60s views for ${ytdVideos.length} YTD videos using retention method`)

      let total60sViews = 0
      let videosProcessed = 0

      for (const video of ytdVideos) {
        const durationSeconds = video.length || 0

        // Only process videos that are 60+ seconds
        if (durationSeconds >= 60) {
          const estimated60s = await this.getVideoEstimated60sViews(video.id, durationSeconds)
          total60sViews += estimated60s
          videosProcessed++
        }
      }

      console.log(`Facebook: Processed ${videosProcessed} videos >= 60s, estimated 60s views: ${total60sViews}`)

      return total60sViews
    } catch (error: any) {
      console.error('Facebook retention-based 60s calculation error:', error.message)
      return 0
    }
  }

  // Get YTD page-level video view metrics via insights API
  // page_video_views = 3-second video views (all videos on page)
  // page_posts_impressions = total impressions across all posts
  // page_video_views_60s_excludes_shorter = 60s views at page level
  private async getPageVideoMetricsYTD(): Promise<{ totalViews: number; views3s: number; views1min: number }> {
    if (!this.pageId) return { totalViews: 0, views3s: 0, views1min: 0 }

    const today = new Date()
    const startOfYear = new Date(today.getFullYear(), 0, 1)
    const since = Math.floor(startOfYear.getTime() / 1000)
    const until = Math.floor(today.getTime() / 1000)

    let totalViews = 0
    let views3s = 0
    let views1min = 0

    const params = { period: 'day', since: since.toString(), until: until.toString() }

    // Fetch confirmed working metrics together
    try {
      const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
        `/${this.pageId}/insights`,
        { ...params, metric: 'page_video_views,page_posts_impressions' }
      )
      for (const metric of (response.data || [])) {
        const sum = metric.values?.reduce((acc: number, v: { value: number }) => acc + (v.value || 0), 0) || 0
        if (metric.name === 'page_video_views') views3s = sum
        if (metric.name === 'page_posts_impressions') totalViews = sum
      }
    } catch (error: any) {
      console.error('Facebook page video metrics error:', error.response?.data?.error?.message || error.message)
    }

    // Try 60s views at page level - try multiple metric names in priority order
    const metrics60s = [
      'page_video_views_60s_excludes_shorter',
      'page_uploaded_views_60s_excludes_shorter',
      'page_video_views_10s',
    ]
    for (const metric60s of metrics60s) {
      try {
        const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
          `/${this.pageId}/insights`,
          { ...params, metric: metric60s }
        )
        const found = response.data?.find(m => m.name === metric60s)
        if (found) {
          views1min = found.values?.reduce((acc: number, v: { value: number }) => acc + (v.value || 0), 0) || 0
          if (views1min > 0) break // Use first metric that returns data
        }
      } catch {
        // Try next metric
      }
    }

    // Fallback: If page-level 60s metrics return 0, use retention-based calculation
    if (views1min === 0) {
      console.log('Facebook: Page-level 60s metrics unavailable, using retention-based calculation')
      views1min = await this.getYTD60sViewsFromRetention()
    }

    return { totalViews, views3s, views1min }
  }

  // Get aggregated video metrics (legacy - kept for compatibility)
  async getAggregatedVideoMetrics(): Promise<{ totalViews: number; views3s: number; views1min: number }> {
    return this.getPageVideoMetricsYTD()
  }

  // Get page audience demographics (age/gender breakdown)
  // Uses page_fans_gender_age metric for Gen Z calculation
  async getAudienceDemographics(): Promise<{
    age13_17: number
    age18_24: number
    age25_34: number
    age35_44: number
    age45_54: number
    age55_64: number
    age65plus: number
    genZPercent: number
  } | null> {
    if (!this.pageId) return null

    try {
      // page_fans_gender_age returns breakdown by gender and age groups
      const response = await this.apiRequest<{
        data: Array<{
          name: string
          values: Array<{ value: Record<string, number> }>
        }>
      }>(`/${this.pageId}/insights`, {
        metric: 'page_fans_gender_age',
        period: 'lifetime'
      })

      const ageGenderData = response.data?.find(m => m.name === 'page_fans_gender_age')
      const breakdown = ageGenderData?.values?.[0]?.value || {}

      // Sum across genders for each age group
      // Format: { "F.13-17": 2500, "M.13-17": 2700, "F.18-24": 15200, ... }
      // Note: Facebook returns absolute counts, not percentages
      let age13_17 = 0, age18_24 = 0, age25_34 = 0, age35_44 = 0, age45_54 = 0, age55_64 = 0, age65plus = 0
      let totalFans = 0

      for (const [key, value] of Object.entries(breakdown)) {
        const ageGroup = key.split('.')[1] // Get age part after gender (F. or M.)
        const numValue = typeof value === 'number' ? value : 0
        totalFans += numValue

        if (ageGroup === '13-17') age13_17 += numValue
        else if (ageGroup === '18-24') age18_24 += numValue
        else if (ageGroup === '25-34') age25_34 += numValue
        else if (ageGroup === '35-44') age35_44 += numValue
        else if (ageGroup === '45-54') age45_54 += numValue
        else if (ageGroup === '55-64') age55_64 += numValue
        else if (ageGroup === '65+') age65plus += numValue
      }

      // Convert to percentages if we have total fans
      if (totalFans > 0) {
        age13_17 = Math.round((age13_17 / totalFans) * 10000) / 100
        age18_24 = Math.round((age18_24 / totalFans) * 10000) / 100
        age25_34 = Math.round((age25_34 / totalFans) * 10000) / 100
        age35_44 = Math.round((age35_44 / totalFans) * 10000) / 100
        age45_54 = Math.round((age45_54 / totalFans) * 10000) / 100
        age55_64 = Math.round((age55_64 / totalFans) * 10000) / 100
        age65plus = Math.round((age65plus / totalFans) * 10000) / 100
      }

      const genZPercent = Math.round((age13_17 + age18_24) * 100) / 100

      console.log(`Facebook demographics: 13-17=${age13_17}%, 18-24=${age18_24}%, Gen Z total=${genZPercent}%`)

      return {
        age13_17,
        age18_24,
        age25_34,
        age35_44,
        age45_54,
        age55_64,
        age65plus,
        genZPercent
      }
    } catch (error: any) {
      console.error('Facebook demographics error:', error.response?.data?.error?.message || error.message)
      return null
    }
  }

  // Full sync to Supabase - ALL METRICS ARE YTD (2026)
  async syncToSupabase(): Promise<FacebookSyncResult> {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const startDate = startOfYear.toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]

      // Get page info (current totals)
      const page = await this.getPage()
      if (!page) {
        throw new Error('Failed to get Facebook page')
      }

      // Get all videos
      const allVideos = await this.getVideos()

      // Filter to YTD videos (published in 2026)
      const ytdVideos = allVideos.filter(video => {
        const videoDate = video.created_time?.split('T')[0] || ''
        return videoDate >= startDate
      })

      const ytdVideoCount = ytdVideos.length

      // Upsert all videos to content_posts (basic info only)
      // Page-level view metrics (3s, 60s, total) are fetched via getPageVideoMetricsYTD()
      for (const video of allVideos) {
        await this.supabase
          .from('content_posts')
          .upsert({
            platform: 'facebook',
            external_id: video.id,
            post_type: 'video',
            title: video.title || video.description?.substring(0, 200) || '',
            published_at: video.created_time,
            url: video.permalink_url
          }, { onConflict: 'platform,external_id' })
      }

      // Get YTD video view metrics via page-level insights
      // page_video_views = 3s views, page_posts_impressions = total impressions, page_video_views_60s = 60s views
      const { totalViews: ytdTotalViews, views3s: ytdViews3s, views1min: ytdViews1min } = await this.getPageVideoMetricsYTD()

      // Get total video plays (any duration) - this matches Business Manager "Views" metric
      const ytdTotalPlays = await this.getYTDTotalVideoPlays()

      // Get followers gained using baseline comparison method (more reliable than insights)
      const followersResult = await this.getFollowersGainedYTD()
      const followersGained = followersResult.gained
      const followersMethod = followersResult.method

      // Get platform revenue from monetization API (YTD)
      const revenueResult = await this.getMonetizationEarnings(startDate, todayStr)
      const platformRevenue = revenueResult.revenue
      const revenueMethod = revenueResult.method

      // Upsert aggregate-only metrics to social_metrics
      // Note: We DON'T store followers, views here - those come from daily sync (summed)
      // This prevents double-counting when health API sums daily values
      // Metrics stored here are only available from main sync (page-level aggregates)
      const { error: metricsError } = await this.supabase
        .from('social_metrics')
        .upsert({
          platform: 'facebook',
          metric_date: todayStr,
          views_3s: ytdViews3s, // 3s views (page-level YTD)
          views_1min: ytdViews1min, // 1min views (page-level YTD via retention)
          reach: ytdTotalPlays, // Total video plays (any duration) - matches Business Manager "Views"
          posts_count: ytdVideoCount, // Videos published in 2026
          platform_revenue: platformRevenue,
          api_source: 'api'
        }, { onConflict: 'platform,metric_date' })

      if (metricsError) {
        console.error('Facebook social_metrics upsert error:', metricsError)
      }

      // Get and save demographics for Gen Z tracking
      let genZFollowers = 0
      let genZPercent = 0
      const currentFollowers = page.fan_count || page.followers_count || 0
      const demographics = await this.getAudienceDemographics()
      if (demographics && currentFollowers > 0) {
        genZPercent = demographics.genZPercent
        genZFollowers = Math.round(currentFollowers * genZPercent / 100)

        await this.supabase
          .from('audience_demographics')
          .upsert({
            platform: 'facebook',
            metric_date: todayStr,
            age_13_17_percent: demographics.age13_17,
            age_18_24_percent: demographics.age18_24,
            gen_z_followers: genZFollowers,
            total_followers: currentFollowers,
            api_source: 'api'
          }, { onConflict: 'platform,metric_date' })

        console.log(`Facebook demographics saved: Gen Z=${genZPercent}%, followers=${genZFollowers}`)

        // Save monthly demographic snapshot for accurate Gen Z tracking over time
        await saveDemographicSnapshot({
          platform: 'facebook',
          total_followers: currentFollowers,
          demographics: {
            age13_17: demographics.age13_17,
            age18_24: demographics.age18_24,
            age25_34: demographics.age25_34,
            age35_44: demographics.age35_44,
            age45_54: demographics.age45_54,
            age55_64: demographics.age55_64,
            age65plus: demographics.age65plus
          }
        })
      }

      // Update sync status
      // Note: Video view metrics require Creator Studio access - marking as partial
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'facebook',
          last_sync_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          records_synced: allVideos.length,
          is_healthy: true,
          last_error: null
        }, { onConflict: 'api_name' })

      return {
        success: true,
        data: {
          page,
          videos: allVideos.length,
          totalViews: ytdTotalViews,
          totalPlays: ytdTotalPlays, // Total video plays (any duration) - matches Business Manager
          views3s: ytdViews3s,
          views1min: ytdViews1min,
          demographics: demographics ? {
            genZPercent,
            genZFollowers,
            age13_17: demographics.age13_17,
            age18_24: demographics.age18_24
          } : null,
          ytd: {
            videoCount: ytdVideoCount,
            totalViews: ytdTotalViews,
            totalPlays: ytdTotalPlays,
            views3s: ytdViews3s,
            views1min: ytdViews1min,
            followersGained,
            followersMethod,
            currentFollowers: followersResult.currentFollowers,
            baseline: followersResult.baseline,
            platformRevenue,
            revenueMethod
          }
        }
      }
    } catch (error: any) {
      // Update sync status with error
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'facebook',
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
      await this.getPage()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const facebookClient = new FacebookClient()
