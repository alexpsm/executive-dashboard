import { NextResponse } from 'next/server'
import axios from 'axios'

const GRAPH_API_URL = 'https://graph.facebook.com/v21.0'
export const dynamic = 'force-dynamic'

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID
  const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID

  if (!accessToken || !pageId) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const since = Math.floor(startOfYear.getTime() / 1000)
  const until = Math.floor(today.getTime() / 1000)
  const sinceDate = startOfYear.toISOString().split('T')[0]
  const untilDate = today.toISOString().split('T')[0]

  const results: Record<string, any> = { timestamp: new Date().toISOString() }

  // 1. Facebook 3-second video views
  try {
    const r = await axios.get(`${GRAPH_API_URL}/${pageId}/insights`, {
      params: { access_token: accessToken, metric: 'page_video_views', period: 'day', since, until }
    })
    const data = r.data?.data?.find((m: any) => m.name === 'page_video_views')
    const total = data?.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0
    results.fb_3s_views = { status: 'success', total_ytd: total, dataPoints: data?.values?.length }
  } catch (e: any) {
    results.fb_3s_views = { status: 'failed', error: e.response?.data?.error?.message || e.message }
  }

  // 2. Facebook 60s views - need a video post ID first
  try {
    const videosR = await axios.get(`${GRAPH_API_URL}/${pageId}/videos`, {
      params: { access_token: accessToken, fields: 'id,created_time', limit: '3' }
    })
    const videos = videosR.data?.data || []
    results.fb_videos_sample = videos.map((v: any) => v.id)

    if (videos.length > 0) {
      // Test 60s views on first video
      try {
        const insR = await axios.get(`${GRAPH_API_URL}/${videos[0].id}/insights`, {
          params: { access_token: accessToken, metric: 'post_video_views_60s_excludes_shorter' }
        })
        results.fb_60s_views_per_post = { status: 'success', sample: insR.data?.data }
      } catch (e: any) {
        results.fb_60s_views_per_post = { status: 'failed', error: e.response?.data?.error?.message || e.message }
      }
    }
  } catch (e: any) {
    results.fb_60s_views_per_post = { status: 'failed', error: e.response?.data?.error?.message || e.message }
  }

  // 3. Facebook page posts impressions (total views/reach)
  try {
    const r = await axios.get(`${GRAPH_API_URL}/${pageId}/insights`, {
      params: { access_token: accessToken, metric: 'page_posts_impressions', period: 'day', since, until }
    })
    const data = r.data?.data?.find((m: any) => m.name === 'page_posts_impressions')
    const total = data?.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0
    results.fb_posts_impressions = { status: 'success', total_ytd: total, dataPoints: data?.values?.length }
  } catch (e: any) {
    results.fb_posts_impressions = { status: 'failed', error: e.response?.data?.error?.message || e.message }
  }

  // 4. Facebook monetization earnings (POST method)
  try {
    const r = await axios.post(`${GRAPH_API_URL}/${pageId}/monetization_approximate_earnings`, null, {
      params: { access_token: accessToken, since: sinceDate, until: untilDate }
    })
    results.fb_earnings_post = { status: 'success', data: r.data }
  } catch (e: any) {
    // Also try GET
    try {
      const r2 = await axios.get(`${GRAPH_API_URL}/${pageId}/monetization_approximate_earnings`, {
        params: { access_token: accessToken, since: sinceDate, until: untilDate }
      })
      results.fb_earnings_get = { status: 'success', data: r2.data }
    } catch (e2: any) {
      results.fb_earnings = {
        post_error: e.response?.data?.error?.message || e.message,
        get_error: e2.response?.data?.error?.message || e2.message
      }
    }
  }

  // 5. Instagram story reach
  if (igAccountId) {
    try {
      const r = await axios.get(`${GRAPH_API_URL}/${igAccountId}/stories`, {
        params: {
          access_token: accessToken,
          fields: 'id,timestamp,insights.metric(reach)'
        }
      })
      const stories = r.data?.data || []
      const reachValues = stories
        .map((s: any) => s.insights?.data?.find((m: any) => m.name === 'reach')?.values?.[0]?.value || 0)
        .filter((v: number) => v > 0)
      results.ig_story_reach = {
        status: 'success',
        storyCount: stories.length,
        avgReach: reachValues.length > 0 ? Math.round(reachValues.reduce((a: number, b: number) => a + b, 0) / reachValues.length) : 0,
        sample: stories.slice(0, 2).map((s: any) => ({
          id: s.id,
          timestamp: s.timestamp,
          insights: s.insights?.data
        }))
      }
    } catch (e: any) {
      results.ig_story_reach = { status: 'failed', error: e.response?.data?.error?.message || e.message }
    }

    // 6. Instagram batch media reach
    try {
      const r = await axios.get(`${GRAPH_API_URL}/${igAccountId}/media`, {
        params: {
          access_token: accessToken,
          fields: 'id,timestamp,media_type,insights.metric(reach)',
          limit: '10'
        }
      })
      const posts = r.data?.data || []
      const reachValues = posts
        .map((p: any) => p.insights?.data?.find((m: any) => m.name === 'reach')?.values?.[0]?.value || 0)
        .filter((v: number) => v > 0)
      results.ig_batch_reach = {
        status: 'success',
        postCount: posts.length,
        avgReach: reachValues.length > 0 ? Math.round(reachValues.reduce((a: number, b: number) => a + b, 0) / reachValues.length) : 0,
        sample: posts.slice(0, 2).map((p: any) => ({
          id: p.id,
          media_type: p.media_type,
          insights: p.insights?.data
        }))
      }
    } catch (e: any) {
      results.ig_batch_reach = { status: 'failed', error: e.response?.data?.error?.message || e.message }
    }
  }

  return NextResponse.json(results)
}
