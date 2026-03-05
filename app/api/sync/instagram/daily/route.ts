import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Sync daily Instagram metrics for the Analytics section
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const daysBack = parseInt(searchParams.get('days') || '30')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Facebook/Instagram access token not configured' }, { status: 400 })
    }

    // Use direct Instagram Account ID from env (more reliable than discovery)
    const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID
    if (!igAccountId) {
      return NextResponse.json({ error: 'INSTAGRAM_ACCOUNT_ID not configured' }, { status: 400 })
    }

    // Get current follower count for engagement calculation
    const accountResponse = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=followers_count&access_token=${accessToken}`
    )
    const accountData = await accountResponse.json()
    const currentFollowers = accountData.followers_count || 0

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    // Instagram insights API - get daily metrics
    // Note: Instagram only keeps ~30 days of daily data
    const since = Math.floor(startDate.getTime() / 1000)
    const until = Math.floor(endDate.getTime() / 1000)

    console.log(`Instagram Daily Sync: Fetching ${daysBack} days`)

    // Get follower count daily breakdown
    // Note: 'impressions' deprecated in API v22.0, using reach and views instead
    const insightsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/insights?metric=follower_count,reach&period=day&since=${since}&until=${until}&access_token=${accessToken}`
    )
    const insightsData = await insightsResponse.json()

    if (insightsData.error) {
      console.error('Instagram insights error:', insightsData.error)
      return NextResponse.json({ error: insightsData.error.message }, { status: 500 })
    }

    // Get posts from content_posts to calculate engagement and avg reach per day
    // Posts are grouped by their publish date
    const startDateStr = startDate.toISOString().split('T')[0]
    const { data: posts } = await supabase
      .from('content_posts')
      .select('published_at, likes, comments, reach')
      .eq('platform', 'instagram')
      .gte('published_at', startDateStr)
      .order('published_at', { ascending: true })

    // Group posts by date
    const postsByDate = new Map<string, Array<{ likes: number; comments: number; reach: number }>>()
    for (const post of posts || []) {
      const date = post.published_at?.split('T')[0]
      if (!date) continue
      if (!postsByDate.has(date)) {
        postsByDate.set(date, [])
      }
      postsByDate.get(date)!.push({
        likes: post.likes || 0,
        comments: post.comments || 0,
        reach: post.reach || 0
      })
    }

    // Calculate rolling averages for each day (using posts from last 7 days)
    const calculateRollingMetrics = (targetDate: string) => {
      const target = new Date(targetDate)
      const rollingPosts: Array<{ likes: number; comments: number; reach: number }> = []

      // Collect posts from last 7 days
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(target)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().split('T')[0]
        const dayPosts = postsByDate.get(dateStr) || []
        rollingPosts.push(...dayPosts)
      }

      if (rollingPosts.length === 0) {
        return { engagement: 0, avgReachPost: 0 }
      }

      const totalLikes = rollingPosts.reduce((sum, p) => sum + p.likes, 0)
      const totalComments = rollingPosts.reduce((sum, p) => sum + p.comments, 0)
      const totalReach = rollingPosts.reduce((sum, p) => sum + p.reach, 0)
      const postCount = rollingPosts.length

      // Engagement = (avg likes + comments per post) / followers * 100
      const avgEngagement = (totalLikes + totalComments) / postCount
      const engagement = currentFollowers > 0
        ? Math.round((avgEngagement / currentFollowers) * 100 * 100) / 100
        : 0

      // Avg reach per post
      const avgReachPost = Math.round(totalReach / postCount)

      return { engagement, avgReachPost }
    }

    // Process the daily data
    const dailyData: Array<{
      date: string
      followers: number
      reach: number
      engagement: number
      avgReachPost: number
    }> = []

    // Instagram returns data grouped by metric
    const followerData = insightsData.data?.find((m: any) => m.name === 'follower_count')?.values || []
    const reachData = insightsData.data?.find((m: any) => m.name === 'reach')?.values || []

    // Build daily records
    const dateMap = new Map<string, any>()

    for (const item of followerData) {
      const date = item.end_time.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, followers: 0, reach: 0, engagement: 0, avgReachPost: 0 })
      }
      dateMap.get(date).followers = item.value || 0
    }

    for (const item of reachData) {
      const date = item.end_time.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, followers: 0, reach: 0, engagement: 0, avgReachPost: 0 })
      }
      dateMap.get(date).reach = item.value || 0
    }

    // Add engagement and avg reach to each day
    for (const [date, metrics] of dateMap) {
      const rolling = calculateRollingMetrics(date)
      metrics.engagement = rolling.engagement
      metrics.avgReachPost = rolling.avgReachPost
    }

    // Save to database
    for (const [date, metrics] of dateMap) {
      dailyData.push(metrics)

      const { error } = await supabase
        .from('social_metrics')
        .upsert({
          platform: 'instagram',
          metric_date: date,
          followers: metrics.followers,
          reach: metrics.reach,
          engagement: metrics.engagement,
          avg_reach_post: metrics.avgReachPost,
          api_source: 'api'
        }, { onConflict: 'platform,metric_date' })

      if (error) {
        console.error(`Error saving Instagram daily data for ${date}:`, error.message)
      }
    }

    // Update sync status
    await supabase
      .from('api_sync_status')
      .upsert({
        api_name: 'instagram',
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        records_synced: dailyData.length,
        is_healthy: true,
        last_error: null
      }, { onConflict: 'api_name' })

    return NextResponse.json({
      success: true,
      message: `Synced ${dailyData.length} days of Instagram daily metrics`,
      daysSync: dailyData.length,
      sample: dailyData.slice(-5)
    })

  } catch (error: any) {
    console.error('Instagram daily sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST to sync daily Instagram metrics',
    params: {
      days: 'Number of days to sync (default: 30, max ~30 due to API limits)'
    }
  })
}
