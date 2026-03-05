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
  const pageId = process.env.FACEBOOK_PAGE_ID
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  if (!accessToken || !pageId) {
    return NextResponse.json({ error: 'Missing Facebook credentials' }, { status: 400 })
  }

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    pageId,
    queries: {}
  }

  try {
    // 1. Get current page info (total fans)
    const pageResponse = await axios.get(`${GRAPH_API_URL}/${pageId}`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,fan_count,followers_count'
      }
    })
    results.currentPage = pageResponse.data
    results.currentFans = pageResponse.data.fan_count || pageResponse.data.followers_count

    // 2. Try to get page_fans insights (last 30 days)
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const since30 = Math.floor(thirtyDaysAgo.getTime() / 1000)
    const until30 = Math.floor(today.getTime() / 1000)

    try {
      const insights30Response = await axios.get(`${GRAPH_API_URL}/${pageId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'page_fans',
          period: 'day',
          since: since30.toString(),
          until: until30.toString()
        }
      })
      results.queries.pageFans30Days = {
        since: thirtyDaysAgo.toISOString(),
        until: today.toISOString(),
        data: insights30Response.data,
        dataPoints: insights30Response.data?.data?.[0]?.values?.length || 0
      }

      // Calculate net change
      const fanData = insights30Response.data?.data?.find((m: any) => m.name === 'page_fans')
      if (fanData?.values?.length > 1) {
        const firstValue = fanData.values[0]?.value
        const lastValue = fanData.values[fanData.values.length - 1]?.value
        results.queries.pageFans30Days.calculation = {
          firstValue,
          lastValue,
          netChange: lastValue - firstValue
        }
      }
    } catch (error: any) {
      results.queries.pageFans30Days = { error: error.response?.data?.error || error.message }
    }

    // 3. Try page_fan_adds (daily fans added - may require special permissions)
    try {
      const fanAddsResponse = await axios.get(`${GRAPH_API_URL}/${pageId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'page_fan_adds',
          period: 'day',
          since: since30.toString(),
          until: until30.toString()
        }
      })

      // Sum all daily values
      const fanAddsData = fanAddsResponse.data?.data?.find((m: any) => m.name === 'page_fan_adds')
      let totalAdds = 0
      if (fanAddsData?.values) {
        for (const day of fanAddsData.values) {
          totalAdds += day.value || 0
        }
      }

      results.queries.pageFanAdds = {
        status: 'available',
        dataPoints: fanAddsData?.values?.length || 0,
        totalAddsIn30Days: totalAdds,
        sampleData: fanAddsData?.values?.slice(0, 5)
      }
    } catch (error: any) {
      results.queries.pageFanAdds = {
        status: 'not_available',
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      }
    }

    // 3b. Try page_follows (alternative metric for followers)
    try {
      const followsResponse = await axios.get(`${GRAPH_API_URL}/${pageId}/insights`, {
        params: {
          access_token: accessToken,
          metric: 'page_follows',
          period: 'day',
          since: since30.toString(),
          until: until30.toString()
        }
      })

      const followsData = followsResponse.data?.data?.find((m: any) => m.name === 'page_follows')
      let totalFollows = 0
      if (followsData?.values) {
        for (const day of followsData.values) {
          totalFollows += day.value || 0
        }
      }

      results.queries.pageFollows = {
        status: 'available',
        dataPoints: followsData?.values?.length || 0,
        totalFollowsIn30Days: totalFollows,
        sampleData: followsData?.values?.slice(0, 5)
      }
    } catch (error: any) {
      results.queries.pageFollows = {
        status: 'not_available',
        error: error.response?.data?.error?.message || error.message
      }
    }

    // 3c. Try to list available metrics
    try {
      const availableResponse = await axios.get(`${GRAPH_API_URL}/${pageId}/insights`, {
        params: {
          access_token: accessToken
        }
      })
      results.queries.availableInsights = {
        status: 'available',
        metrics: availableResponse.data?.data?.map((m: any) => m.name) || []
      }
    } catch (error: any) {
      results.queries.availableInsights = {
        status: 'error',
        error: error.response?.data?.error?.message || error.message
      }
    }

    // 3d. Try monetization earnings
    try {
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const monetizationResponse = await axios.get(`${GRAPH_API_URL}/${pageId}/monetization_approximate_earnings`, {
        params: {
          access_token: accessToken,
          since: startOfYear.toISOString().split('T')[0],
          until: today.toISOString().split('T')[0]
        }
      })
      results.queries.monetization = {
        status: 'available',
        data: monetizationResponse.data
      }
    } catch (error: any) {
      results.queries.monetization = {
        status: 'not_available',
        error: error.response?.data?.error?.message || error.message,
        errorCode: error.response?.data?.error?.code
      }
    }

    // 4. Check video listing
    try {
      const videosResponse = await axios.get(`${GRAPH_API_URL}/${pageId}/videos`, {
        params: {
          access_token: accessToken,
          fields: 'id,title,description,created_time',
          limit: '5'
        }
      })
      results.queries.videos = {
        status: 'available',
        count: videosResponse.data?.data?.length || 0,
        sample: videosResponse.data?.data?.slice(0, 2)
      }
    } catch (error: any) {
      results.queries.videos = {
        status: 'not_available',
        error: error.response?.data?.error?.message || error.message
      }
    }

    // 5. Check if we have a stored baseline in the database
    const { data: baseline } = await supabase
      .from('platform_baselines')
      .select('*')
      .eq('platform', 'facebook')
      .single()

    results.storedBaseline = baseline || null

    // 6. Recommendation based on findings
    const currentFans = results.currentFans
    if (baseline?.followers_jan1_2026) {
      results.recommendation = {
        method: 'baseline_comparison',
        baselineFans: baseline.followers_jan1_2026,
        currentFans,
        followersGainedYTD: currentFans - baseline.followers_jan1_2026
      }
    } else {
      results.recommendation = {
        method: 'need_baseline',
        message: 'No baseline stored. Need to manually input Jan 1, 2026 fan count for accurate YTD calculation.',
        currentFans
      }
    }

  } catch (error: any) {
    results.error = error.response?.data?.error || error.message
  }

  return NextResponse.json(results)
}
