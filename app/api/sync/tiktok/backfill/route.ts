import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tiktokClient } from '@/lib/integrations/tiktok/client'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUSINESS_API = 'https://business-api.tiktok.com/open_api/v1.3'

async function fetchDailyMetrics(token: string, openId: string, startDate: string, endDate: string) {
  // Per-day: followers + likes/comments/shares/views for engagement calculation
  const fields = JSON.stringify([
    'daily_new_followers', 'daily_lost_followers', 'followers_count',
    'unique_video_views', 'video_views', 'likes', 'comments', 'shares'
  ])
  const url = `${BUSINESS_API}/business/get/?business_id=${openId}&start_date=${startDate}&end_date=${endDate}&fields=${encodeURIComponent(fields)}`
  const res = await fetch(url, { headers: { 'Access-Token': token } })
  const json = await res.json()
  return json.code === 0 ? (json.data?.metrics || []) : []
}

async function fetchVideoReach(token: string, openId: string) {
  const fields = encodeURIComponent(JSON.stringify(['item_id', 'create_time', 'reach', 'video_views', 'likes', 'comments', 'shares']))
  const allVideos: any[] = []
  let cursor = ''

  for (let page = 0; page < 20; page++) {
    const cursorParam = cursor ? `&cursor=${cursor}` : ''
    const res = await fetch(`${BUSINESS_API}/business/video/list/?business_id=${openId}&fields=${fields}&max_count=20${cursorParam}`, {
      headers: { 'Access-Token': token }
    })
    const text = await res.text()
    let json: any
    try { json = JSON.parse(text) } catch { break }

    // Accept both string "0" and number 0
    if (String(json.code) !== '0') break

    const videos = json.data?.videos || []
    allVideos.push(...videos)

    if (!json.data?.has_more || !json.data?.cursor) break
    cursor = String(json.data.cursor)
  }

  return allVideos
}

export async function POST() {
  try {
    // getAccessToken() auto-refreshes if expired (uses refresh_token, valid 365 days)
    let token: string
    try {
      token = await tiktokClient.getAccessToken()
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 401 })
    }

    const storedTokens = await tiktokClient.getStoredTokens()
    const openId = storedTokens?.open_id
    if (!openId) return NextResponse.json({ error: 'No TikTok open_id' }, { status: 401 })

    const yearStart = `${new Date().getFullYear()}-01-01`
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Fetch daily metrics in overlapping 7-day windows, processed oldest→newest.
    // TikTok returns all days in a 7-day range correctly when queried as the START of the window.
    // The LAST day of each window may receive a cumulative aggregate value (a TikTok API quirk).
    // Overlapping by 1 day means each day also appears as the START of the next window, which
    // overwrites the potentially-wrong last-day value from the previous window.
    const daysByDate = new Map<string, any>()
    const end = new Date(yesterday)

    for (let ws = new Date(yearStart); ws <= end;) {
      const we = new Date(ws)
      we.setDate(we.getDate() + 6)
      if (we > end) we.setTime(end.getTime())

      const days = await fetchDailyMetrics(
        token, openId,
        ws.toISOString().split('T')[0],
        we.toISOString().split('T')[0]
      )
      for (const d of days) daysByDate.set(d.date, d)

      // Advance by 6 days (not 7) so the last day of this window is also the START of the next,
      // allowing the next window to overwrite any cumulative aggregate stored for that day.
      ws.setDate(ws.getDate() + 6)
    }

    // After windowed fetch, do one fresh 7-day query to overwrite any zeros for recent dates.
    // The windowed approach (15+ API calls) can hit rate limits on the last window, leaving
    // daily_new_followers=0 for recent dates even when data is available.
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const recentDays = await fetchDailyMetrics(token, openId, weekAgo, yesterday)
    for (const d of recentDays) daysByDate.set(d.date, d)

    const allDays = Array.from(daysByDate.values())

    // Fetch video-level reach inline (paginated)
    const videoFields = encodeURIComponent(JSON.stringify(['item_id', 'create_time', 'reach', 'video_views', 'likes', 'comments', 'shares']))
    const videos: any[] = []
    let videoCursor = ''

    for (let page = 0; page < 20; page++) {
      const cursorParam = videoCursor ? `&cursor=${videoCursor}` : ''
      const vRes = await fetch(`${BUSINESS_API}/business/video/list/?business_id=${openId}&fields=${videoFields}&max_count=20${cursorParam}`, {
        headers: { 'Access-Token': token }
      })
      const vText = await vRes.text()
      let vJson: any
      try { vJson = JSON.parse(vText) } catch { break }
      if (String(vJson.code) !== '0') break
      videos.push(...(vJson.data?.videos || []))
      if (!vJson.data?.has_more || !vJson.data?.cursor) break
      videoCursor = String(vJson.data.cursor)
    }
    // Build a cumulative running avg reach per post over time.
    // For each day, avg reach = total reach of 2026 videos published on or before that day.
    // This lets the analytics chart show how avg reach has trended (vs a flat YTD-only value).
    const ytd2026Videos = videos.filter(v => {
      if (!v.create_time) return false
      return new Date(v.create_time * 1000).getFullYear() >= new Date().getFullYear()
    }).sort((a, b) => (a.create_time || 0) - (b.create_time || 0))

    const getRunningAvgReach = (dateStr: string): number | null => {
      // End-of-day unix timestamp for this date
      const endOfDay = new Date(dateStr + 'T23:59:59Z').getTime() / 1000
      const videosUpToDate = ytd2026Videos.filter(v => (v.create_time || 0) <= endOfDay)
      if (videosUpToDate.length === 0) return null
      const totalReach = videosUpToDate.reduce((sum, v) => sum + (v.reach || 0), 0)
      return Math.round(totalReach / videosUpToDate.length)
    }

    // YTD total for response metadata
    const totalYtdReach = ytd2026Videos.reduce((sum, v) => sum + (v.reach || 0), 0)
    const avgReachPerPost = ytd2026Videos.length > 0
      ? Math.round(totalYtdReach / ytd2026Videos.length)
      : null

    // UPDATE all existing TikTok rows for the year (works regardless of unique constraints / RLS on DELETE)
    let saved = 0
    let ytdGained = 0

    for (const day of allDays) {
      // Use gross new followers (matching TikTok Business Suite which shows new followers, not net)
      const newFollowers = day.daily_new_followers || 0
      ytdGained += newFollowers

      // Engagement rate = (likes + comments + shares) / video_views * 100
      const videoViews = day.video_views || 0
      const interactions = (day.likes || 0) + Math.max(day.comments || 0, 0) + (day.shares || 0)
      const engagementRate = videoViews > 0 ? Math.round((interactions / videoViews) * 10000) / 100 : null

      // Running cumulative avg reach per post as of this date
      const reachPerPost = getRunningAvgReach(day.date)

      const payload = {
        followers: day.followers_count || null,
        // followers_gained has a DB trigger that overrides writes; store gross new in posts_count instead
        posts_count: newFollowers,
        views: videoViews || null,
        engagement: engagementRate,
        avg_reach_post: reachPerPost,  // reach column has a trigger; use avg_reach_post instead
        api_source: 'api',
        is_manual_entry: false,
      }

      // Try UPDATE first (updates all existing rows for this date); if no rows matched, INSERT
      const { data: updated, error: updateErr } = await supabase
        .from('social_metrics')
        .update(payload)
        .eq('platform', 'tiktok')
        .eq('metric_date', day.date)
        .select('id')

      if (!updateErr && updated && updated.length > 0) {
        saved++
      } else {
        const { error: insertErr } = await supabase.from('social_metrics').insert({
          platform: 'tiktok',
          metric_date: day.date,
          ...payload,
        })
        if (!insertErr) saved++
      }
    }

    await supabase.from('api_sync_status').upsert({
      api_name: 'tiktok',
      last_sync_at: new Date().toISOString(),
      last_success_at: new Date().toISOString(),
      records_synced: saved,
      is_healthy: true,
      last_error: null
    }, { onConflict: 'api_name' })

    return NextResponse.json({
      success: true,
      days_saved: saved,
      ytd_followers_gained: ytdGained,
      date_range: `${yearStart} → ${yesterday}`,
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
