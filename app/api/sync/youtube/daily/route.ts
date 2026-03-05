import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// USD to GBP conversion rate (YouTube Analytics API returns USD)
const USD_TO_GBP = 0.79

// Sync daily YouTube metrics for the Analytics section
// This stores each day's metrics separately (not cumulative)
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const daysBack = parseInt(searchParams.get('days') || '30')

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Set up OAuth
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 400 })
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    oauth2Client.setCredentials({ refresh_token: refreshToken })

    const analytics = google.youtubeAnalytics({ version: 'v2', auth: oauth2Client })

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    console.log(`YouTube Daily Sync: Fetching ${daysBack} days (${startDateStr} to ${endDateStr})`)

    // Query YouTube Analytics with day dimension for daily breakdown
    const response = await analytics.reports.query({
      ids: 'channel==MINE',
      startDate: startDateStr,
      endDate: endDateStr,
      metrics: [
        'views',
        'estimatedRevenue',
        'subscribersGained',
        'subscribersLost',
        'likes',
        'comments',
        'shares'
      ].join(','),
      dimensions: 'day',
      sort: 'day'
    })

    const rows = response.data.rows || []
    console.log(`YouTube Daily Sync: Got ${rows.length} days of data`)

    const dailyData: Array<{
      date: string
      views: number
      revenue: number
      subscribersGained: number
      subscribersLost: number
      netSubscribers: number
      likes: number
      comments: number
      shares: number
      engagementRate: number
    }> = []

    // Process each day's data
    for (const row of rows) {
      const date = row[0] as string // Format: YYYY-MM-DD
      const views = parseInt(row[1] as string) || 0
      const revenue = parseFloat(row[2] as string) || 0
      const subscribersGained = parseInt(row[3] as string) || 0
      const subscribersLost = parseInt(row[4] as string) || 0
      const likes = parseInt(row[5] as string) || 0
      const comments = parseInt(row[6] as string) || 0
      const shares = parseInt(row[7] as string) || 0

      const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0

      dailyData.push({
        date,
        views,
        revenue,
        subscribersGained,
        subscribersLost,
        netSubscribers: subscribersGained - subscribersLost,
        likes,
        comments,
        shares,
        engagementRate: Math.round(engagementRate * 100) / 100
      })

      // Upsert daily metrics to social_metrics
      // One row per day - aggregates calculated on-the-fly
      // Convert revenue from USD to GBP
      const revenueGBP = Math.round(revenue * USD_TO_GBP * 100) / 100
      const { error } = await supabase
        .from('social_metrics')
        .upsert({
          platform: 'youtube',
          metric_date: date,
          views,
          yt_ad_revenue: revenueGBP,
          followers: subscribersGained - subscribersLost,
          followers_gained: subscribersGained,
          engagement: Math.round(engagementRate * 100) / 100,
          api_source: 'api'
        }, { onConflict: 'platform,metric_date' })

      if (error) {
        console.error(`Error saving daily data for ${date}:`, error.message)
      }
    }

    // Update sync status
    await supabase
      .from('api_sync_status')
      .upsert({
        api_name: 'youtube',
        last_sync_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        records_synced: rows.length,
        is_healthy: true,
        last_error: null
      }, { onConflict: 'api_name' })

    return NextResponse.json({
      success: true,
      message: `Synced ${rows.length} days of YouTube daily metrics`,
      daysSync: rows.length,
      dateRange: { start: startDateStr, end: endDateStr },
      sample: dailyData.slice(-5) // Show last 5 days
    })

  } catch (error: any) {
    console.error('YouTube daily sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST to sync daily YouTube metrics',
    params: {
      days: 'Number of days to sync (default: 30)'
    }
  })
}
