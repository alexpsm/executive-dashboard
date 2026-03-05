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

  // List of metrics to try for "total views"
  const metricsToTry = [
    'page_impressions',
    'page_impressions_unique',
    'page_posts_impressions',
    'page_posts_impressions_unique',
    'page_video_views',
    'page_views_total',
    'page_content_activity',
    'page_consumptions',
    'page_engaged_users'
  ]

  for (const metric of metricsToTry) {
    try {
      const url = `https://graph.facebook.com/v19.0/${pageId}/insights?metric=${metric}&period=day&since=${since}&until=${until}&access_token=${pageToken}`
      const response = await fetch(url)
      const data = await response.json()

      if (data.error) {
        results[metric] = { status: 'error', message: data.error.message }
      } else {
        const metricData = data.data?.find((m: any) => m.name === metric)
        const values = metricData?.values || []
        const total = values.reduce((sum: number, v: any) => sum + (v.value || 0), 0)
        results[metric] = {
          status: 'available',
          daysOfData: values.length,
          total: total,
          totalFormatted: total.toLocaleString(),
          firstDay: values[0]?.end_time,
          lastDay: values[values.length - 1]?.end_time
        }
      }
    } catch (error: any) {
      results[metric] = { status: 'fetch_error', message: error.message }
    }
  }

  return NextResponse.json({
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    },
    metrics: results
  })
}
