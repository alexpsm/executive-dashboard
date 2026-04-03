import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import https from 'https'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

  // Process in parallel batches of 5 to avoid overwhelming the API
  const batchSize = 5
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize)
    const checks = await Promise.all(
      batch.map(id => checkIfShort(id).then(isShort => ({ id, isShort })))
    )
    checks.forEach(({ id, isShort }) => results.set(id, isShort))
  }

  return results
}

// Fetch YouTube data for a specific month
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const month = searchParams.get('month') || '01' // Default to January
  const year = searchParams.get('year') || '2026'

  const startDate = `${year}-${month.padStart(2, '0')}-01`
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
  const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`

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
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

    // Get channel stats
    const channelResponse = await youtube.channels.list({
      part: ['statistics', 'contentDetails'],
      mine: true
    })
    const channel = channelResponse.data.items?.[0]
    const totalSubscribers = parseInt(channel?.statistics?.subscriberCount || '0')

    // Get analytics for the month
    const analyticsResponse = await analytics.reports.query({
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

    const row = analyticsResponse.data.rows?.[0]
    if (!row) {
      return NextResponse.json({ error: 'No data for this period', startDate, endDate }, { status: 404 })
    }

    const views = parseInt(row[0] as string) || 0
    const estimatedRevenue = parseFloat(row[1] as string) || 0
    const estimatedMinutesWatched = parseInt(row[2] as string) || 0
    const averageViewDuration = parseFloat(row[3] as string) || 0
    const subscribersGained = parseInt(row[4] as string) || 0
    const subscribersLost = parseInt(row[5] as string) || 0
    const likes = parseInt(row[6] as string) || 0
    const comments = parseInt(row[7] as string) || 0
    const shares = parseInt(row[8] as string) || 0

    const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0

    // Get impressions and CTR
    let impressions = 0
    let ctr = 0
    try {
      const impressionsResponse = await analytics.reports.query({
        ids: 'channel==MINE',
        startDate,
        endDate,
        metrics: 'impressions,impressionsClickThroughRate',
        dimensions: ''
      })
      const impRow = impressionsResponse.data.rows?.[0]
      if (impRow) {
        impressions = parseInt(impRow[0] as string) || 0
        ctr = Math.round((parseFloat(impRow[1] as string) || 0) * 10000) / 100
      }
    } catch (e) {
      console.log('Impressions not available')
    }

    // Get videos published in this month
    const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads
    let videosInMonth = 0
    let shortsInMonth = 0
    let videoViews = 0
    let shortsViews = 0

    if (uploadsPlaylistId) {
      const playlistResponse = await youtube.playlistItems.list({
        part: ['contentDetails', 'snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: 50
      })

      // Filter to videos published in the target month
      const monthVideos = playlistResponse.data.items?.filter(item => {
        const publishDate = item.snippet?.publishedAt?.split('T')[0] || ''
        return publishDate >= startDate && publishDate <= endDate
      }) || []

      const videoIds = monthVideos
        .map(item => item.contentDetails?.videoId)
        .filter(Boolean) as string[]

      if (videoIds.length > 0) {
        // Check which videos are Shorts using oEmbed API
        console.log(`Checking ${videoIds.length} videos for Short status via oEmbed...`)
        const shortsMap = await checkIfShortsBatch(videoIds)

        // Get views for each video DURING the target month only using Analytics API
        // This ensures we only count views that occurred in January, not after
        console.log(`Fetching views during ${startDate} to ${endDate} per video...`)

        const videoViewsMap = new Map<string, number>()

        // Query Analytics API for views by video dimension during the month
        try {
          const videoAnalytics = await analytics.reports.query({
            ids: 'channel==MINE',
            startDate,
            endDate,
            metrics: 'views',
            dimensions: 'video',
            sort: '-views',
            maxResults: 200
          })

          // Build map of videoId -> views during this period
          for (const row of videoAnalytics.data.rows || []) {
            const videoId = row[0] as string
            const viewsDuringPeriod = parseInt(row[1] as string) || 0
            videoViewsMap.set(videoId, viewsDuringPeriod)
          }
        } catch (analyticsError: any) {
          console.log('Video-level analytics not available, falling back to current view counts')
        }

        // Categorize views by video vs shorts
        for (const videoId of videoIds) {
          const isShort = shortsMap.get(videoId) || false
          // Use views during the period if available, otherwise 0 (video might not have had views yet)
          const viewsDuringPeriod = videoViewsMap.get(videoId) || 0

          if (isShort) {
            shortsInMonth++
            shortsViews += viewsDuringPeriod
          } else {
            videosInMonth++
            videoViews += viewsDuringPeriod
          }
        }

        console.log(`Found ${shortsInMonth} Shorts (${shortsViews} views) and ${videosInMonth} videos (${videoViews} views) in ${year}-${month}`)
      }
    }

    // Calculate YTD averages (Jan 1 to end of this month)
    // This is cumulative - total views YTD / total content YTD
    const ytdStartDate = `${year}-01-01`
    let ytdVideoViews = 0
    let ytdShortsViews = 0
    let ytdVideosCount = 0
    let ytdShortsCount = 0

    if (uploadsPlaylistId) {
      // Get ALL videos published YTD (Jan 1 to end of target month)
      const ytdPlaylistResponse = await youtube.playlistItems.list({
        part: ['contentDetails', 'snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: 50
      })

      const ytdVideos = ytdPlaylistResponse.data.items?.filter(item => {
        const publishDate = item.snippet?.publishedAt?.split('T')[0] || ''
        return publishDate >= ytdStartDate && publishDate <= endDate
      }) || []

      const ytdVideoIds = ytdVideos
        .map(item => item.contentDetails?.videoId)
        .filter(Boolean) as string[]

      // Get YTD views for ALL videos that received views this year (not just 2026-published)
      // This gives the true channel-wide shorts/long-form split
      const ytdViewsMap = new Map<string, number>()
      try {
        const ytdAnalytics = await analytics.reports.query({
          ids: 'channel==MINE',
          startDate: ytdStartDate,
          endDate,
          metrics: 'views',
          dimensions: 'video',
          sort: '-views',
          maxResults: 200
        })

        for (const row of ytdAnalytics.data.rows || []) {
          ytdViewsMap.set(row[0] as string, parseInt(row[1] as string) || 0)
        }
      } catch (e) {
        console.log('YTD video analytics not available')
      }

      if (ytdViewsMap.size > 0) {
        // Check ALL videos that got views (including pre-2026 content) for Short status
        const allVideoIds = Array.from(ytdViewsMap.keys())
        console.log(`Checking Short status for ${allVideoIds.length} videos that got views YTD...`)
        const ytdShortsMap = await checkIfShortsBatch(allVideoIds)

        // Sum up views by type across the entire channel
        for (const [videoId, views] of ytdViewsMap) {
          const isShort = ytdShortsMap.get(videoId) || false
          if (isShort) {
            ytdShortsCount++
            ytdShortsViews += views
          } else {
            ytdVideosCount++
            ytdVideoViews += views
          }
        }

        console.log(`YTD totals (all channel views): ${ytdVideosCount} videos (${ytdVideoViews} views), ${ytdShortsCount} shorts (${ytdShortsViews} views)`)
      }
    }

    // YTD averages (cumulative for KPI tracking)
    const avgVideoViews = ytdVideosCount > 0 ? Math.round(ytdVideoViews / ytdVideosCount) : 0
    const avgShortsViews = ytdShortsCount > 0 ? Math.round(ytdShortsViews / ytdShortsCount) : 0

    const monthData = {
      period: { startDate, endDate, month: parseInt(month), year: parseInt(year) },
      analytics: {
        views,
        estimatedRevenue,
        estimatedMinutesWatched,
        averageViewDuration,
        subscribersGained,
        subscribersLost,
        netSubscribers: subscribersGained - subscribersLost,
        likes,
        comments,
        shares,
        engagementRate: Math.round(engagementRate * 100) / 100,
        impressions,
        ctr
      },
      content: {
        // Monthly breakdown (this month only)
        monthly: {
          videosPublished: videosInMonth,
          shortsPublished: shortsInMonth,
          totalPublished: videosInMonth + shortsInMonth,
          videoViews,
          shortsViews
        },
        // YTD cumulative (Jan 1 to end of this month) - for KPI tracking
        ytd: {
          videosPublished: ytdVideosCount,
          shortsPublished: ytdShortsCount,
          totalPublished: ytdVideosCount + ytdShortsCount,
          videoViews: ytdVideoViews,
          shortsViews: ytdShortsViews,
          avgVideoViews,
          avgShortsViews
        }
      },
      channel: {
        totalSubscribers
      }
    }

    // Save to social_metrics with the month's end date
    const { error: upsertError } = await supabase
      .from('social_metrics')
      .upsert({
        platform: 'youtube',
        metric_date: endDate,
        followers: subscribersGained,
        subscribers: subscribersGained,
        views,
        posts_count: videosInMonth + shortsInMonth,
        shorts_views: shortsViews,
        avg_video_views: avgVideoViews,
        avg_shorts_views: avgShortsViews,
        engagement: Math.round(engagementRate * 100) / 100,
        ctr,
        impressions,
        yt_ad_revenue: estimatedRevenue,
        followers_gained: subscribersGained,
        api_source: 'api'
      }, { onConflict: 'platform,metric_date' })

    if (upsertError) {
      console.error('Upsert error:', upsertError)
    }

    return NextResponse.json({
      success: true,
      message: `YouTube data for ${year}-${month} saved`,
      data: monthData,
      savedTo: `social_metrics (metric_date: ${endDate})`
    })

  } catch (error: any) {
    console.error('YouTube monthly sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
