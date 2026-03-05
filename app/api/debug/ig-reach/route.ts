import { NextResponse } from 'next/server'
import axios from 'axios'

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0'
export const dynamic = 'force-dynamic'

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID

  if (!accessToken || !accountId) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  try {
    // Get a few recent posts
    const mediaResponse = await axios.get(`${GRAPH_API_URL}/${accountId}/media`, {
      params: {
        access_token: accessToken,
        fields: 'id,media_type,timestamp,like_count',
        limit: '5'
      }
    })

    const posts = mediaResponse.data?.data || []
    const results = []

    for (const post of posts.slice(0, 3)) {
      // Try reach,impressions,saved,shares
      try {
        const insightsResponse = await axios.get(`${GRAPH_API_URL}/${post.id}/insights`, {
          params: {
            access_token: accessToken,
            metric: 'reach,impressions,saved,shares'
          }
        })
        results.push({
          id: post.id,
          media_type: post.media_type,
          timestamp: post.timestamp,
          status: 'success',
          insights: insightsResponse.data?.data?.map((m: any) => ({
            name: m.name,
            value: m.values?.[0]?.value ?? m.value
          }))
        })
      } catch (error: any) {
        // Try video-specific metrics for reels
        try {
          const videoInsightsResponse = await axios.get(`${GRAPH_API_URL}/${post.id}/insights`, {
            params: {
              access_token: accessToken,
              metric: 'reach,plays,ig_reels_video_view_total_time'
            }
          })
          results.push({
            id: post.id,
            media_type: post.media_type,
            timestamp: post.timestamp,
            status: 'success_reel',
            insights: videoInsightsResponse.data?.data?.map((m: any) => ({
              name: m.name,
              value: m.values?.[0]?.value ?? m.value
            }))
          })
        } catch (error2: any) {
          results.push({
            id: post.id,
            media_type: post.media_type,
            timestamp: post.timestamp,
            status: 'failed',
            error: error.response?.data?.error?.message || error.message,
            error2: error2.response?.data?.error?.message
          })
        }
      }
    }

    return NextResponse.json({ posts: results })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
