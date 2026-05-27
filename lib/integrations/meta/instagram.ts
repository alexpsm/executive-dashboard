import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import type { InstagramAccount, InstagramMedia, InstagramInsights, InstagramSyncResult } from './types'
import { saveDemographicSnapshot } from '../demographics'

const GRAPH_API_URL = 'https://graph.facebook.com/v22.0'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

class InstagramClient {
  private get accessToken() {
    return process.env.FACEBOOK_ACCESS_TOKEN
  }

  private get accountId() {
    return process.env.INSTAGRAM_ACCOUNT_ID
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

  // Get Instagram business account info
  async getAccount(): Promise<InstagramAccount | null> {
    if (!this.accountId) {
      throw new Error('Instagram account ID not configured')
    }

    try {
      const data = await this.apiRequest<InstagramAccount>(`/${this.accountId}`, {
        fields: 'id,username,followers_count,follows_count,media_count'
      })
      return data
    } catch (error: any) {
      console.error('Instagram account error:', error.response?.data || error.message)
      throw error
    }
  }

  // Get account insights
  async getInsights(period: 'day' | 'week' | 'days_28' = 'days_28'): Promise<InstagramInsights | null> {
    if (!this.accountId) return null

    try {
      const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
        `/${this.accountId}/insights`,
        {
          metric: 'reach,impressions,profile_views,website_clicks,follower_count',
          period
        }
      )

      const metrics = response.data.reduce((acc, metric) => {
        acc[metric.name] = metric.values[0]?.value || 0
        return acc
      }, {} as Record<string, number>)

      return {
        followers: metrics.follower_count || 0,
        reach: metrics.reach || 0,
        impressions: metrics.impressions || 0,
        profileViews: metrics.profile_views || 0,
        websiteClicks: metrics.website_clicks || 0
      }
    } catch (error: any) {
      console.error('Instagram insights error:', error.response?.data || error.message)
      return null
    }
  }

  // Get followers gained YTD using baseline comparison method
  // The daily insights API only keeps ~30-60 days of data, so we use:
  // Current followers - Jan 1 baseline = YTD followers gained
  async getFollowersGainedYTD(): Promise<{ gained: number; method: string; currentFollowers: number; baseline: number }> {
    if (!this.accountId) return { gained: 0, method: 'no_account', currentFollowers: 0, baseline: 0 }

    try {
      // Get current follower count from API
      const account = await this.getAccount()
      const currentFollowers = account?.followers_count || 0

      // Get baseline from database
      const { data: baselineData } = await this.supabase
        .from('platform_baselines')
        .select('followers_jan1_2026')
        .eq('platform', 'instagram')
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

      // Fallback: try to get from available insights data
      const insightsGained = await this.getFollowersGainedFromInsights()
      return {
        gained: insightsGained,
        method: 'insights_partial',
        currentFollowers,
        baseline: 0
      }
    } catch (error: any) {
      console.error('Instagram followers gained error:', error.message)
      return { gained: 0, method: 'error', currentFollowers: 0, baseline: 0 }
    }
  }

  // Get followers gained from insights data - SUM all daily values (not cumulative!)
  // Instagram's follower_count metric returns daily NEW followers gained, so we sum them
  private async getFollowersGainedFromInsights(): Promise<number> {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)

      // Batch in 30-day chunks since API has 30-day limit
      let totalGained = 0
      let currentStart = new Date(startOfYear)

      while (currentStart < today) {
        const currentEnd = new Date(currentStart)
        currentEnd.setDate(currentEnd.getDate() + 29)

        if (currentEnd > today) {
          currentEnd.setTime(today.getTime())
        }

        const sinceTimestamp = Math.floor(currentStart.getTime() / 1000)
        const untilTimestamp = Math.floor(currentEnd.getTime() / 1000)

        try {
          const response = await this.apiRequest<{ data: Array<{ name: string; values: Array<{ value: number; end_time: string }> }> }>(
            `/${this.accountId}/insights`,
            {
              metric: 'follower_count',
              period: 'day',
              since: sinceTimestamp.toString(),
              until: untilTimestamp.toString()
            }
          )

          // SUM all daily values (each value = new followers that day)
          const followerData = response.data?.find(m => m.name === 'follower_count')
          if (followerData?.values) {
            for (const dayData of followerData.values) {
              totalGained += dayData.value || 0
            }
          }
        } catch (chunkError: any) {
          // Skip failed chunks (data may not be available for older dates)
          console.log(`Instagram insights chunk skipped: ${currentStart.toISOString().split('T')[0]}`)
        }

        // Move to next chunk
        currentStart.setDate(currentStart.getDate() + 30)
      }

      return totalGained
    } catch (error: any) {
      console.error('Instagram insights fallback error:', error.response?.data?.error?.message || error.message)
      return 0
    }
  }

  // Get media posts with batch reach insights, with pagination to fetch ALL posts
  // Uses fields=insights.metric(reach) to avoid N+1 individual insight requests
  // Paginates through all results until we have all 2026 posts
  async getMedia(maxPosts = 1000): Promise<InstagramMedia[]> {
    if (!this.accountId) return []

    const startOfYear = `${new Date().getFullYear()}-01-01`
    const allMedia: InstagramMedia[] = []
    let nextUrl: string | null = null
    let pageCount = 0
    const maxPages = 15 // Safety limit - up to 1500 posts

    try {
      // First request
      const firstResponse = await this.apiRequest<{ data: any[]; paging?: { next?: string } }>(`/${this.accountId}/media`, {
        fields: 'id,media_type,caption,timestamp,permalink,like_count,comments_count,insights.metric(reach)',
        limit: '100' // Max per page
      })

      const processMedia = (data: any[]) => {
        for (const media of data) {
          const reachMetric = media.insights?.data?.find((m: any) => m.name === 'reach')
          const reach = reachMetric?.values?.[0]?.value ?? reachMetric?.value ?? 0
          allMedia.push({
            id: media.id,
            media_type: media.media_type,
            caption: media.caption || '',
            timestamp: media.timestamp,
            permalink: media.permalink,
            like_count: media.like_count || 0,
            comments_count: media.comments_count || 0,
            reach
          })
        }
      }

      processMedia(firstResponse.data || [])
      nextUrl = firstResponse.paging?.next || null
      pageCount++

      // Paginate to get more posts until we have all 2026 posts
      // Posts are returned newest-first, so we stop when ALL posts on a page are before 2026
      while (nextUrl && pageCount < maxPages && allMedia.length < maxPosts) {
        try {
          const response = await axios.get(nextUrl)
          const pageData = response.data.data || []

          if (pageData.length === 0) break

          // Check if ALL posts on this page are before 2026
          const allBeforeYear = pageData.every((m: any) => m.timestamp < startOfYear)
          if (allBeforeYear) {
            console.log(`Instagram pagination stopped: all posts on page ${pageCount + 1} are before ${startOfYear}`)
            break
          }

          processMedia(pageData)
          nextUrl = response.data.paging?.next || null
          pageCount++
          console.log(`Instagram pagination: page ${pageCount}, total posts: ${allMedia.length}`)
        } catch (pageError: any) {
          console.error('Instagram pagination error:', pageError.message)
          break
        }
      }

      // Debug: show date range of posts
      if (allMedia.length > 0) {
        const dates = allMedia.map(m => m.timestamp.split('T')[0]).sort()
        const ytdPosts = allMedia.filter(m => m.timestamp >= startOfYear)
        console.log(`Instagram getMedia: fetched ${allMedia.length} total posts across ${pageCount} pages`)
        console.log(`  Date range: ${dates[0]} to ${dates[dates.length - 1]}`)
        console.log(`  YTD posts (>= ${startOfYear}): ${ytdPosts.length}`)

        // Count by month
        const byMonth: Record<string, number> = {}
        for (const post of ytdPosts) {
          const month = post.timestamp.substring(0, 7) // YYYY-MM
          byMonth[month] = (byMonth[month] || 0) + 1
        }
        console.log(`  Posts by month:`, byMonth)
      }
      return allMedia
    } catch (error: any) {
      console.error('Instagram media error:', error.response?.data || error.message)
      return []
    }
  }

  // Get insights for a specific media item
  // Note: 'impressions' removed in API v22.0 - using reach/saved/shares/plays instead
  async getMediaInsights(mediaId: string, mediaType?: string): Promise<{ reach: number; impressions: number; saved: number; shares: number } | null> {
    try {
      const isReel = mediaType === 'REELS' || mediaType === 'VIDEO'
      const metric = isReel ? 'reach,saved,shares,plays' : 'reach,saved,shares,total_interactions'

      const response = await this.apiRequest<{ data: Array<{ name: string; value?: number; values?: Array<{ value: number }> }> }>(
        `/${mediaId}/insights`,
        { metric }
      )

      const metrics = response.data.reduce((acc, m) => {
        acc[m.name] = m.value ?? m.values?.[0]?.value ?? 0
        return acc
      }, {} as Record<string, number>)

      return {
        reach: metrics.reach || 0,
        impressions: metrics.plays || metrics.total_interactions || 0,
        saved: metrics.saved || 0,
        shares: metrics.shares || 0
      }
    } catch {
      return null
    }
  }

  // Get active stories with reach insights (stories expire in 24h)
  async getStories(): Promise<Array<{ id: string; timestamp: string; reach: number }>> {
    if (!this.accountId) return []

    try {
      const response = await this.apiRequest<{ data: any[] }>(`/${this.accountId}/stories`, {
        fields: 'id,timestamp,insights.metric(reach)'
      })
      return (response.data || []).map((s: any) => {
        const reachMetric = s.insights?.data?.find((m: any) => m.name === 'reach')
        const reach = reachMetric?.values?.[0]?.value ?? reachMetric?.value ?? 0
        return { id: s.id, timestamp: s.timestamp, reach }
      })
    } catch {
      // Stories endpoint may not be available or no active stories
      return []
    }
  }

  // Calculate average reach per post
  async getAverageReachPerPost(): Promise<number> {
    const media = await this.getMedia(50) // Last 50 posts
    if (media.length === 0) return 0

    let totalReach = 0
    let count = 0

    for (const post of media.slice(0, 20)) { // Limit API calls
      const insights = await this.getMediaInsights(post.id)
      if (insights) {
        totalReach += insights.reach
        count++
      }
    }

    return count > 0 ? Math.round(totalReach / count) : 0
  }

  // Calculate engagement rate
  async getEngagementRate(): Promise<number> {
    const account = await this.getAccount()
    if (!account || account.followers_count === 0) return 0

    const media = await this.getMedia(30)
    if (media.length === 0) return 0

    const totalEngagement = media.reduce((sum, post) => {
      return sum + post.like_count + post.comments_count
    }, 0)

    const avgEngagement = totalEngagement / media.length
    return Math.round((avgEngagement / account.followers_count) * 100 * 100) / 100 // % with 2 decimals
  }

  // Get audience demographics (age/gender breakdown)
  // Returns age percentages for Gen Z calculation (ages 13-24)
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
    if (!this.accountId) return null

    try {
      // audience_gender_age returns breakdown by gender and age groups
      const response = await this.apiRequest<{
        data: Array<{
          name: string
          values: Array<{ value: Record<string, number> }>
        }>
      }>(`/${this.accountId}/insights`, {
        metric: 'follower_demographics',
        period: 'lifetime',
        metric_type: 'total_value',
        breakdown: 'age'
      })

      // Parse the age breakdown
      // Format: { "13-17": 5.2, "18-24": 32.1, "25-34": 28.5, ... }
      const ageData = response.data?.find(m => m.name === 'follower_demographics')
      const ageBreakdown = ageData?.values?.[0]?.value || {}

      // Map age groups - Instagram uses different age range formats
      const age13_17 = ageBreakdown['13-17'] || 0
      const age18_24 = ageBreakdown['18-24'] || 0
      const age25_34 = ageBreakdown['25-34'] || 0
      const age35_44 = ageBreakdown['35-44'] || 0
      const age45_54 = ageBreakdown['45-54'] || 0
      const age55_64 = ageBreakdown['55-64'] || 0
      const age65plus = ageBreakdown['65+'] || 0

      const genZPercent = age13_17 + age18_24

      console.log(`Instagram demographics: 13-17=${age13_17}%, 18-24=${age18_24}%, Gen Z total=${genZPercent}%`)

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
      // Try alternative endpoint format (older API versions)
      try {
        const response = await this.apiRequest<{
          data: Array<{
            name: string
            values: Array<{ value: Record<string, number> }>
          }>
        }>(`/${this.accountId}/insights`, {
          metric: 'audience_gender_age',
          period: 'lifetime'
        })

        const ageGenderData = response.data?.find(m => m.name === 'audience_gender_age')
        const breakdown = ageGenderData?.values?.[0]?.value || {}

        // Sum across genders for each age group
        // Format: { "F.13-17": 2.5, "M.13-17": 2.7, "F.18-24": 15.2, ... }
        let age13_17 = 0, age18_24 = 0, age25_34 = 0, age35_44 = 0, age45_54 = 0, age55_64 = 0, age65plus = 0

        for (const [key, value] of Object.entries(breakdown)) {
          const ageGroup = key.split('.')[1] // Get age part after gender
          const numValue = typeof value === 'number' ? value : 0
          if (ageGroup === '13-17') age13_17 += numValue
          else if (ageGroup === '18-24') age18_24 += numValue
          else if (ageGroup === '25-34') age25_34 += numValue
          else if (ageGroup === '35-44') age35_44 += numValue
          else if (ageGroup === '45-54') age45_54 += numValue
          else if (ageGroup === '55-64') age55_64 += numValue
          else if (ageGroup === '65+') age65plus += numValue
        }

        const genZPercent = age13_17 + age18_24
        console.log(`Instagram demographics (audience_gender_age): Gen Z total=${genZPercent}%`)

        return { age13_17, age18_24, age25_34, age35_44, age45_54, age55_64, age65plus, genZPercent }
      } catch (fallbackError: any) {
        console.error('Instagram demographics error:', error.response?.data?.error?.message || error.message)
        return null
      }
    }
  }

  // Full sync to Supabase - ALL METRICS ARE YTD (2026)
  async syncToSupabase(): Promise<InstagramSyncResult> {
    try {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const startDate = startOfYear.toISOString().split('T')[0]
      const todayStr = today.toISOString().split('T')[0]

      // Get account info (current totals)
      const account = await this.getAccount()
      if (!account) {
        throw new Error('Failed to get Instagram account')
      }

      // Get all media with batch reach (single API call via fields=insights.metric(reach))
      const allMedia = await this.getMedia()
      for (const post of allMedia) {
        await this.supabase
          .from('content_posts')
          .upsert({
            platform: 'instagram',
            external_id: post.id,
            post_type: post.media_type === 'REELS' ? 'reel' :
                       post.media_type === 'VIDEO' ? 'video' :
                       post.media_type === 'CAROUSEL_ALBUM' ? 'carousel' : 'image',
            title: post.caption?.substring(0, 200) || '',
            published_at: post.timestamp,
            likes: post.like_count,
            comments: post.comments_count,
            reach: post.reach || 0,
            url: post.permalink
          }, { onConflict: 'platform,external_id' })
      }

      // Sync active stories with reach (stories expire in 24h so count will vary)
      const stories = await this.getStories()
      for (const story of stories) {
        if (story.reach > 0) {
          await this.supabase
            .from('content_posts')
            .upsert({
              platform: 'instagram',
              external_id: story.id,
              post_type: 'story',
              published_at: story.timestamp,
              reach: story.reach
            }, { onConflict: 'platform,external_id' })
        }
      }

      // Filter to 2026 posts only
      const ytdMedia = allMedia.filter(m => m.timestamp >= startDate)

      // Calculate engagement rate from 2026 posts only
      let engagementRate = 0
      if (ytdMedia.length > 0 && account.followers_count > 0) {
        const totalEngagement = ytdMedia.reduce((sum, post) => {
          return sum + post.like_count + post.comments_count
        }, 0)
        const avgEngagement = totalEngagement / ytdMedia.length
        engagementRate = Math.round((avgEngagement / account.followers_count) * 100 * 100) / 100
      }

      // Calculate total and avg reach per post from 2026 media (reach fetched in batch with getMedia)
      const ytdMediaWithReach = ytdMedia.filter(m => (m.reach || 0) > 0)
      const totalReachPost = ytdMediaWithReach.reduce((sum, m) => sum + (m.reach || 0), 0)
      const avgReachPost = ytdMediaWithReach.length > 0
        ? Math.round(totalReachPost / ytdMediaWithReach.length)
        : 0

      // Story reach: query content_posts for story type with reach > 0
      const { data: storyPosts } = await this.supabase
        .from('content_posts')
        .select('reach')
        .eq('platform', 'instagram')
        .eq('post_type', 'story')
        .gte('published_at', startDate)
        .gt('reach', 0)

      const avgReachStory = storyPosts && storyPosts.length > 0
        ? Math.round(storyPosts.reduce((sum, p) => sum + p.reach, 0) / storyPosts.length)
        : 0

      // Get followers gained using baseline comparison method (more accurate than insights)
      const followersResult = await this.getFollowersGainedYTD()
      const followersGained = followersResult.gained
      const followersMethod = followersResult.method

      console.log(`Instagram followers: current=${followersResult.currentFollowers}, baseline=${followersResult.baseline}, gained=${followersGained} (method: ${followersMethod})`)

      // Note: YTD totals are calculated live in the health API from baselines
      // We don't store them in social_metrics to avoid overwriting daily values
      // The health API fetches current followers from the API and calculates YTD gained

      // Update today's daily record with aggregate metrics
      // Don't touch 'followers' - let it keep the daily value from daily sync
      // The daily sync stores actual daily follower gains (e.g., 300 per day)
      // We only update engagement, reach, and posts_count here
      const { error: metricsError } = await this.supabase
        .from('social_metrics')
        .update({
          posts_count: ytdMedia.length,
          engagement: engagementRate,
          avg_reach_post: avgReachPost,
          views: totalReachPost,
          story_reach: avgReachStory
        })
        .eq('platform', 'instagram')
        .eq('metric_date', todayStr)

      if (metricsError) {
        console.error('Instagram social_metrics upsert error:', metricsError)
        throw new Error(`Failed to save Instagram metrics: ${metricsError.message}`)
      }

      // Get and save demographics for Gen Z tracking
      let genZFollowers = 0
      let genZPercent = 0
      const demographics = await this.getAudienceDemographics()
      if (demographics && account.followers_count > 0) {
        genZPercent = demographics.genZPercent
        genZFollowers = Math.round(account.followers_count * genZPercent / 100)

        await this.supabase
          .from('audience_demographics')
          .upsert({
            platform: 'instagram',
            metric_date: todayStr,
            age_13_17_percent: demographics.age13_17,
            age_18_24_percent: demographics.age18_24,
            gen_z_followers: genZFollowers,
            total_followers: account.followers_count,
            api_source: 'api'
          }, { onConflict: 'platform,metric_date' })

        // Save monthly demographic snapshot for accurate Gen Z tracking
        await saveDemographicSnapshot({
          platform: 'instagram',
          total_followers: account.followers_count,
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

        console.log(`Instagram demographics saved: Gen Z=${genZPercent}%, followers=${genZFollowers}`)
      }

      // Update sync status
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'instagram',
          last_sync_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          records_synced: allMedia.length,
          is_healthy: true,
          last_error: null
        }, { onConflict: 'api_name' })

      return {
        success: true,
        data: {
          account,
          posts: allMedia.length,
          avgReachPost,
          avgReachStory,
          engagementRate,
          demographics: demographics ? {
            genZPercent,
            genZFollowers,
            age13_17: demographics.age13_17,
            age18_24: demographics.age18_24
          } : null,
          ytd: {
            postsCount: ytdMedia.length,
            followersGained,
            followersMethod,
            currentFollowers: followersResult.currentFollowers,
            baseline: followersResult.baseline,
            engagementRate,
            avgReachPost,
            avgReachStory
          }
        }
      }
    } catch (error: any) {
      // Update sync status with error
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'instagram',
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
      await this.getAccount()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const instagramClient = new InstagramClient()
