import { NextResponse } from 'next/server'
import axios from 'axios'

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID

  if (!accessToken || !pageId) {
    return NextResponse.json({ error: 'Missing Facebook credentials' }, { status: 400 })
  }

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    pageId,
    approach: 'retention-based 60s view estimation',
    videos: [],
    totals: {
      videosChecked: 0,
      videosWithRetentionData: 0,
      videosOver60s: 0,
      estimated60sViews: 0,
      totalPlays: 0
    },
    errors: []
  }

  try {
    // 1. Get videos from page with duration
    const startOfYear = new Date(new Date().getFullYear(), 0, 1)
    const today = new Date()

    const videosResponse = await axios.get(`${GRAPH_API_URL}/${pageId}/videos`, {
      params: {
        access_token: accessToken,
        fields: 'id,title,description,created_time,length',
        limit: '50'
      }
    })

    const allVideos = videosResponse.data?.data || []
    results.totalVideosOnPage = allVideos.length

    // Filter to YTD videos
    const ytdVideos = allVideos.filter((video: any) => {
      const videoDate = new Date(video.created_time)
      return videoDate >= startOfYear && videoDate <= today
    })

    results.ytdVideoCount = ytdVideos.length

    // 2. For videos >= 60s, get retention graph and calculate estimated 60s views
    for (const video of ytdVideos) {
      const durationSeconds = video.length || 0
      const videoResult: Record<string, any> = {
        id: video.id,
        title: video.title || video.description?.substring(0, 50) || 'No title',
        created_time: video.created_time,
        duration_seconds: durationSeconds,
        is_over_60s: durationSeconds >= 60
      }

      results.totals.videosChecked++

      if (durationSeconds < 60) {
        videoResult.status = 'skipped'
        videoResult.reason = 'Video shorter than 60 seconds'
        results.videos.push(videoResult)
        continue
      }

      results.totals.videosOver60s++

      // Get retention data for this video
      try {
        const insightsResponse = await axios.get(`${GRAPH_API_URL}/${video.id}/video_insights`, {
          params: {
            access_token: accessToken,
            metric: 'fb_reels_total_plays,post_video_retention_graph'
          }
        })

        const insightsData = insightsResponse.data?.data || []
        let totalPlays = 0
        let retentionGraph: number[] = []

        for (const metric of insightsData) {
          if (metric.name === 'fb_reels_total_plays') {
            totalPlays = metric.values?.[0]?.value || 0
          }
          if (metric.name === 'post_video_retention_graph') {
            const rawValue = metric.values?.[0]?.value
            // Handle both object format {0: value, 1: value, ...} and array format [value, value, ...]
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

        videoResult.totalPlays = totalPlays
        videoResult.retentionGraphLength = retentionGraph.length
        videoResult.retentionSample = Array.isArray(retentionGraph) ? retentionGraph.slice(0, 5) : [] // First 5 values for debugging

        if (totalPlays > 0 && retentionGraph.length > 0) {
          results.totals.videosWithRetentionData++

          // Calculate index for 60s mark
          const graphLength = retentionGraph.length
          const indexFor60s = Math.floor((60 / durationSeconds) * graphLength)
          const retentionIndex = Math.min(indexFor60s, graphLength - 1)
          const retentionAt60s = retentionGraph[retentionIndex] || 0

          // Estimated 60s views = total plays × retention (values are already decimals 0-1)
          const estimated60sViews = Math.round(totalPlays * retentionAt60s)

          videoResult.indexFor60s = retentionIndex
          videoResult.retentionAt60s = retentionAt60s
          videoResult.estimated60sViews = estimated60sViews
          videoResult.status = 'success'

          results.totals.totalPlays += totalPlays
          results.totals.estimated60sViews += estimated60sViews
        } else {
          videoResult.status = 'no_data'
          videoResult.reason = totalPlays === 0 ? 'No total plays' : 'No retention graph'
        }
      } catch (error: any) {
        videoResult.status = 'error'
        videoResult.error = error.response?.data?.error?.message || error.message
        results.errors.push({
          videoId: video.id,
          error: videoResult.error
        })
      }

      results.videos.push(videoResult)
    }

    // 3. Summary
    results.summary = {
      retentionMethodWorks: results.totals.videosWithRetentionData > 0,
      videosOver60sCount: results.totals.videosOver60s,
      videosWithData: results.totals.videosWithRetentionData,
      totalPlaysAcrossVideos: results.totals.totalPlays,
      estimated60sViewsYTD: results.totals.estimated60sViews,
      calculation: 'estimated_60s_views = total_plays × retention_at_60s_mark'
    }

  } catch (error: any) {
    results.error = error.response?.data?.error || error.message
  }

  return NextResponse.json(results, { status: 200 })
}
