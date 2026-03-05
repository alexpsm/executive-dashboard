import { NextResponse } from 'next/server'
import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (!accessToken || !accountId) {
    return NextResponse.json({ error: 'Missing Instagram credentials' }, { status: 400 })
  }

  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    accountId,
    queries: {}
  }

  try {
    // 1. Get current account info (total followers)
    const accountResponse = await axios.get(`${GRAPH_API_URL}/${accountId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,username,followers_count,follows_count,media_count'
      }
    })
    results.currentAccount = accountResponse.data
    results.currentFollowers = accountResponse.data.followers_count

    // 2. Try to get follower_count insights for last 30 days
    const since30 = Math.floor(thirtyDaysAgo.getTime() / 1000)
    const until30 = Math.floor(today.getTime() / 1000)

    try {
      const insights30Response = await axios.get(`${GRAPH_API_URL}/${accountId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'follower_count',
          period: 'day',
          since: since30.toString(),
          until: until30.toString()
        }
      })
      results.queries.last30Days = {
        since: thirtyDaysAgo.toISOString(),
        until: today.toISOString(),
        data: insights30Response.data,
        dataPoints: insights30Response.data?.data?.[0]?.values?.length || 0
      }

      // Calculate net change from available data
      const followerData = insights30Response.data?.data?.find((m: any) => m.name === 'follower_count')
      if (followerData?.values?.length > 1) {
        const firstValue = followerData.values[0]?.value
        const lastValue = followerData.values[followerData.values.length - 1]?.value
        const firstDate = followerData.values[0]?.end_time
        const lastDate = followerData.values[followerData.values.length - 1]?.end_time
        results.queries.last30Days.calculation = {
          firstValue,
          firstDate,
          lastValue,
          lastDate,
          netChange: lastValue - firstValue
        }
      }
    } catch (error: any) {
      results.queries.last30Days = { error: error.response?.data?.error || error.message }
    }

    // 3. Try to get insights from Jan 1 (likely will fail or return limited data)
    const sinceYTD = Math.floor(startOfYear.getTime() / 1000)
    try {
      const insightsYTDResponse = await axios.get(`${GRAPH_API_URL}/${accountId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'follower_count',
          period: 'day',
          since: sinceYTD.toString(),
          until: until30.toString()
        }
      })
      results.queries.ytdAttempt = {
        since: startOfYear.toISOString(),
        until: today.toISOString(),
        data: insightsYTDResponse.data,
        dataPoints: insightsYTDResponse.data?.data?.[0]?.values?.length || 0
      }

      // Show actual date range of data received
      const ytdData = insightsYTDResponse.data?.data?.find((m: any) => m.name === 'follower_count')
      if (ytdData?.values?.length > 0) {
        results.queries.ytdAttempt.actualDateRange = {
          first: ytdData.values[0]?.end_time,
          last: ytdData.values[ytdData.values.length - 1]?.end_time
        }
      }
    } catch (error: any) {
      results.queries.ytdAttempt = { error: error.response?.data?.error || error.message }
    }

    // 4. Check if we have a stored baseline in the database
    const { data: baseline } = await supabase
      .from('platform_baselines')
      .select('*')
      .eq('platform', 'instagram')
      .single()

    results.storedBaseline = baseline || null

    // 5. Recommendation based on findings
    const currentFollowers = results.currentFollowers
    if (baseline?.followers_jan1_2026) {
      results.recommendation = {
        method: 'baseline_comparison',
        baselineFollowers: baseline.followers_jan1_2026,
        currentFollowers,
        followersGainedYTD: currentFollowers - baseline.followers_jan1_2026
      }
    } else {
      results.recommendation = {
        method: 'need_baseline',
        message: 'No baseline stored. Need to manually input Jan 1, 2026 follower count for accurate YTD calculation.',
        currentFollowers
      }
    }

  } catch (error: any) {
    results.error = error.response?.data?.error || error.message
  }

  return NextResponse.json(results)
}
