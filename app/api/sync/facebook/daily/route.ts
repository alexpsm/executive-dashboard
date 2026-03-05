import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const maxDuration = 120 // Allow more time for full YTD sync

// Get Page Access Token - tries to exchange User Token for Page Token
// If that fails, returns the original token (it may already be a Page Token)
async function getPageAccessToken(userAccessToken: string, pageId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`
    )
    const data = await response.json()
    const page = data.data?.find((p: any) => p.id === pageId)
    if (page?.access_token) {
      console.log('Facebook: Got page access token from /me/accounts')
      return page.access_token
    }
  } catch (e) {
    console.log('Facebook: Could not exchange for page token, using provided token directly')
  }
  // Return original token - it may already be a page token or have page permissions
  return userAccessToken
}

// Fetch insights for a date range (max ~93 days per request)
// Makes separate calls for different metric groups as Facebook API requires
async function fetchInsightsBatch(
  pageId: string,
  pageAccessToken: string,
  startDate: Date,
  endDate: Date
): Promise<{ follows: any[]; videoViews: any[]; impressions: any[] }> {
  const since = Math.floor(startDate.getTime() / 1000)
  const until = Math.floor(endDate.getTime() / 1000)
  const dateRange = `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`

  let follows: any[] = []
  let videoViews: any[] = []
  let impressions: any[] = []

  // Fetch page_follows (cumulative daily totals)
  try {
    const followsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_follows&period=day&since=${since}&until=${until}&access_token=${pageAccessToken}`
    )
    const followsData = await followsResponse.json()
    if (followsData.error) {
      console.error(`Facebook page_follows error (${dateRange}):`, followsData.error.message)
    } else {
      follows = followsData.data?.find((m: any) => m.name === 'page_follows')?.values || []
    }
  } catch (error: any) {
    console.error(`Facebook page_follows fetch error:`, error.message)
  }

  // Fetch video views (3-second views)
  try {
    const viewsResponse = await fetch(
      `https://graph.facebook.com/v19.0/${pageId}/insights?metric=page_video_views&period=day&since=${since}&until=${until}&access_token=${pageAccessToken}`
    )
    const viewsData = await viewsResponse.json()
    if (viewsData.error) {
      console.error(`Facebook page_video_views error (${dateRange}):`, viewsData.error.message)
    } else {
      videoViews = viewsData.data?.find((m: any) => m.name === 'page_video_views')?.values || []
    }
  } catch (error: any) {
    console.error(`Facebook page_video_views fetch error:`, error.message)
  }

  // Fetch total impressions - try multiple metrics to find one that works
  // page_posts_impressions = impressions on page posts (usually available)
  // page_views_total = total page views
  const impressionMetrics = ['page_posts_impressions', 'page_views_total', 'page_content_activity']
  for (const metric of impressionMetrics) {
    if (impressions.length > 0) break // Stop if we got data
    try {
      const impressionsResponse = await fetch(
        `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${pageAccessToken}`
      )
      const impressionsData = await impressionsResponse.json()
      if (impressionsData.error) {
        console.log(`Facebook ${metric} not available: ${impressionsData.error.message}`)
      } else {
        impressions = impressionsData.data?.find((m: any) => m.name === metric)?.values || []
        if (impressions.length > 0) {
          console.log(`Facebook: Using ${metric} for impressions (${impressions.length} days)`)
        }
      }
    } catch (error: any) {
      console.log(`Facebook ${metric} fetch error:`, error.message)
    }
  }

  console.log(`  Fetched: ${follows.length} follows, ${videoViews.length} videoViews, ${impressions.length} impressions`)

  return { follows, videoViews, impressions }
}

// Sync daily Facebook metrics for the Analytics section
// Supports full YTD sync by batching in 90-day chunks
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const daysBack = parseInt(searchParams.get('days') || '30')
  const fullYTD = searchParams.get('ytd') === 'true' // ?ytd=true for full year

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const userAccessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN
    const pageId = process.env.FACEBOOK_PAGE_ID

    if (!userAccessToken) {
      return NextResponse.json({ error: 'Facebook access token not configured' }, { status: 400 })
    }
    if (!pageId) {
      return NextResponse.json({ error: 'Facebook page ID not configured' }, { status: 400 })
    }

    // Get page access token (or use provided token if already a page token)
    const pageAccessToken = await getPageAccessToken(userAccessToken, pageId)

    // Calculate date range
    const endDate = new Date()
    let startDate: Date

    if (fullYTD) {
      // Full YTD: Start from January 1st of current year
      startDate = new Date(endDate.getFullYear(), 0, 1)
      console.log(`Facebook Daily Sync: Full YTD from ${startDate.toISOString().split('T')[0]}`)
    } else {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - daysBack)
      console.log(`Facebook Daily Sync: Last ${daysBack} days`)
    }

    // Facebook API has ~93 day limit per request, so batch in 90-day chunks
    const allFollows: any[] = []
    const allVideoViews: any[] = []
    const allImpressions: any[] = []

    let currentStart = new Date(startDate)
    let batchCount = 0

    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + 89) // 90-day window

      if (currentEnd > endDate) {
        currentEnd.setTime(endDate.getTime())
      }

      console.log(`  Batch ${++batchCount}: ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}`)

      const batch = await fetchInsightsBatch(pageId, pageAccessToken, currentStart, currentEnd)
      allFollows.push(...batch.follows)
      allVideoViews.push(...batch.videoViews)
      allImpressions.push(...batch.impressions)

      // Move to next batch
      currentStart.setDate(currentStart.getDate() + 90)
    }

    console.log(`Facebook: Collected ${allFollows.length} days of follows data across ${batchCount} batches`)

    // Build daily records
    const dateMap = new Map<string, any>()

    for (const item of allFollows) {
      const date = item.end_time.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, cumulativeFollowers: 0, videoViews: 0, impressions: 0 })
      }
      // page_follows is cumulative daily totals
      dateMap.get(date).cumulativeFollowers = item.value || 0
    }

    for (const item of allVideoViews) {
      const date = item.end_time.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, cumulativeFollowers: 0, videoViews: 0, impressions: 0 })
      }
      // page_video_views is daily (3-second views)
      dateMap.get(date).videoViews = item.value || 0
    }

    for (const item of allImpressions) {
      const date = item.end_time.split('T')[0]
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, cumulativeFollowers: 0, videoViews: 0, impressions: 0 })
      }
      // page_impressions is daily
      dateMap.get(date).impressions = item.value || 0
    }

    // Calculate daily follower gains from cumulative page_follows
    // page_follows returns cumulative totals, so diff = daily gained
    const sortedDates = Array.from(dateMap.keys()).sort()
    let prevFollowers = 0

    for (const date of sortedDates) {
      const metrics = dateMap.get(date)
      const currentFollowers = metrics.cumulativeFollowers

      if (prevFollowers > 0 && currentFollowers > 0) {
        // Daily gained = today's cumulative - yesterday's cumulative
        metrics.dailyFollowersGained = currentFollowers - prevFollowers
      } else {
        // First day or missing data - can't calculate diff
        metrics.dailyFollowersGained = 0
      }

      if (currentFollowers > 0) {
        prevFollowers = currentFollowers
      }
    }

    // Save to database
    const dailyData: any[] = []
    for (const [date, metrics] of dateMap) {
      dailyData.push({
        date,
        followers: metrics.dailyFollowersGained,
        views: metrics.videoViews,
        impressions: metrics.impressions
      })

      const { error } = await supabase
        .from('social_metrics')
        .upsert({
          platform: 'facebook',
          metric_date: date,
          followers: metrics.dailyFollowersGained || 0, // Daily followers gained
          views: metrics.videoViews || 0, // Daily 3s video views
          impressions: metrics.impressions || 0, // Daily impressions
          api_source: 'api'
        }, { onConflict: 'platform,metric_date' })

      if (error) {
        console.error(`Error saving Facebook daily data for ${date}:`, error.message)
      }
    }

    // Calculate totals for summary
    const totalFollowersGained = dailyData.reduce((sum, d) => sum + (d.followers || 0), 0)
    const totalViews = dailyData.reduce((sum, d) => sum + (d.views || 0), 0)
    const totalImpressions = dailyData.reduce((sum, d) => sum + (d.impressions || 0), 0)

    // Update sync status
    await supabase
      .from('api_sync_status')
      .upsert({
        api_name: 'facebook',
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        records_synced: dailyData.length,
        is_healthy: true,
        last_error: null
      }, { onConflict: 'api_name' })

    return NextResponse.json({
      success: true,
      message: `Synced ${dailyData.length} days of Facebook daily metrics`,
      daysSync: dailyData.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      totals: {
        followersGained: totalFollowersGained,
        videoViews: totalViews,
        impressions: totalImpressions
      },
      sample: dailyData.slice(-5)
    })

  } catch (error: any) {
    console.error('Facebook daily sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST to sync daily Facebook metrics',
    params: {
      days: 'Number of days to sync (default: 30)',
      ytd: 'Set to "true" for full year-to-date sync from Jan 1'
    }
  })
}
