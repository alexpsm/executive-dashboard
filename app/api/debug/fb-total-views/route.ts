import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Get Page Access Token from User Access Token
async function getPageAccessToken(userAccessToken: string, pageId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userAccessToken}`
    )
    const data = await response.json()
    const page = data.data?.find((p: any) => p.id === pageId)
    return page?.access_token || null
  } catch {
    return null
  }
}

export async function GET() {
  const userAccessToken = process.env.FACEBOOK_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID

  if (!userAccessToken || !pageId) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  // Get page access token
  const pageToken = await getPageAccessToken(userAccessToken, pageId) || userAccessToken

  // Date range: Jan 1, 2026 to today
  const startDate = new Date(2026, 0, 1)
  const endDate = new Date()
  const since = Math.floor(startDate.getTime() / 1000)
  const until = Math.floor(endDate.getTime() / 1000)

  const results: Record<string, any> = {}

  // ALL metrics that could contribute to "total views" (videos + posts + stories + ads)
  const metricsToTry = [
    // Basic impressions - what people saw
    'page_impressions',           // Total impressions (organic + paid + viral)
    'page_impressions_organic',   // Organic impressions only
    'page_impressions_paid',      // Paid (ad) impressions
    'page_impressions_viral',     // Viral impressions (shares)
    'page_impressions_unique',    // Unique people reached

    // Post-specific
    'page_posts_impressions',     // Impressions on page posts (what we have: 147.4M)
    'page_posts_impressions_organic',
    'page_posts_impressions_paid',
    'page_posts_impressions_viral',

    // Video-specific
    'page_video_views',           // 3-second video views (69.4M)
    'page_video_views_organic',
    'page_video_views_paid',
    'page_video_views_autoplayed',
    'page_video_views_click_to_play',
    'page_video_view_time',

    // Story-specific (if available)
    'page_daily_story_impressions',
    'page_daily_story_reach',

    // Page views (visits)
    'page_views_total',           // Total page views (visits, not content views)
    'page_views_logged_in_total',
    'page_views_logged_in_unique',

    // Other engagement
    'page_content_activity',
    'page_consumptions',          // Total consumptions (clicks, plays, etc)
    'page_consumptions_unique',
    'page_engaged_users',

    // Fans/reach
    'page_fan_adds',
    'page_fan_removes',
    'page_fans',
  ]

  // Batch in 90-day chunks for accuracy
  async function fetchMetricYTD(metric: string): Promise<any> {
    let totalValue = 0
    let daysCount = 0
    let firstDay: string | null = null
    let lastDay: string | null = null

    let currentStart = new Date(startDate)
    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart)
      currentEnd.setDate(currentEnd.getDate() + 89)
      if (currentEnd > endDate) currentEnd.setTime(endDate.getTime())

      const chunkSince = Math.floor(currentStart.getTime() / 1000)
      const chunkUntil = Math.floor(currentEnd.getTime() / 1000)

      try {
        const url = `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metric}&period=day&since=${chunkSince}&until=${chunkUntil}&access_token=${pageToken}`
        const response = await fetch(url)
        const data = await response.json()

        if (data.error) {
          return { status: 'error', message: data.error.message }
        }

        const metricData = data.data?.find((m: any) => m.name === metric)
        const values = metricData?.values || []

        for (const v of values) {
          totalValue += v.value || 0
          daysCount++
          if (!firstDay) firstDay = v.end_time
          lastDay = v.end_time
        }
      } catch (error: any) {
        return { status: 'fetch_error', message: error.message }
      }

      currentStart.setDate(currentStart.getDate() + 90)
    }

    if (daysCount > 0) {
      return {
        status: 'available',
        daysOfData: daysCount,
        total: totalValue,
        totalFormatted: totalValue.toLocaleString(),
        totalMillions: (totalValue / 1_000_000).toFixed(2) + 'M',
        firstDay,
        lastDay
      }
    }
    return { status: 'no_data', daysOfData: 0, total: 0 }
  }

  // Test each metric
  for (const metric of metricsToTry) {
    results[metric] = await fetchMetricYTD(metric)
  }

  // Calculate potential total
  let potentialTotal = 0
  const contributors: string[] = []

  // Sum of: posts impressions + stories + ads (paid) would = total views
  // But we need to avoid double-counting
  if (results['page_posts_impressions']?.status === 'available') {
    potentialTotal += results['page_posts_impressions'].total
    contributors.push(`page_posts_impressions: ${results['page_posts_impressions'].totalMillions}`)
  }
  if (results['page_impressions_paid']?.status === 'available') {
    // Paid impressions not in posts
    contributors.push(`page_impressions_paid: ${results['page_impressions_paid'].totalMillions}`)
  }

  return NextResponse.json({
    info: 'Testing all possible Facebook metrics that could make up "total views"',
    businessManagerShows: '169.9M views (videos + posts + stories + ads)',
    currentlyUsing: 'page_posts_impressions (147.4M)',
    gap: '~22M (likely stories + ads not in posts)',
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    },
    metricsResults: results,
    potentialContributors: contributors
  })
}
