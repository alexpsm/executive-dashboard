import { NextResponse } from 'next/server'
import axios from 'axios'

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID

  if (!accessToken || !accountId) {
    return NextResponse.json({ error: 'Missing Instagram credentials' }, { status: 400 })
  }

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    accountId,
    tests: {}
  }

  // Test 1: Check active stories
  try {
    const storiesResponse = await axios.get(`${GRAPH_API_URL}/${accountId}/stories`, {
      params: {
        access_token: accessToken,
        fields: 'id,timestamp,media_type,permalink'
      }
    })
    results.tests.activeStories = {
      status: 'success',
      count: storiesResponse.data?.data?.length || 0,
      stories: storiesResponse.data?.data || []
    }
  } catch (error: any) {
    results.tests.activeStories = {
      status: 'error',
      error: error.response?.data?.error?.message || error.message
    }
  }

  // Test 2: Try story insights on account level
  const storyMetrics = [
    'story_reach',
    'story_exits',
    'story_replies',
    'story_taps_forward',
    'story_taps_back'
  ]

  for (const metric of storyMetrics) {
    try {
      const response = await axios.get(`${GRAPH_API_URL}/${accountId}/insights`, {
        params: {
          access_token: accessToken,
          metric,
          period: 'day'
        }
      })
      results.tests[metric] = {
        status: 'available',
        data: response.data?.data?.[0]?.values?.slice(0, 5) || []
      }
    } catch (error: any) {
      results.tests[metric] = {
        status: 'not_available',
        error: error.response?.data?.error?.message || error.message
      }
    }
  }

  // Test 3: Try to list all available metrics
  try {
    const allMetricsResponse = await axios.get(`${GRAPH_API_URL}/${accountId}/insights`, {
      params: {
        access_token: accessToken,
        metric: 'reach,impressions,profile_views',
        period: 'day'
      }
    })
    results.tests.availableMetrics = {
      status: 'success',
      metrics: allMetricsResponse.data?.data?.map((m: any) => m.name) || []
    }
  } catch (error: any) {
    results.tests.availableMetrics = {
      status: 'error',
      error: error.response?.data?.error?.message || error.message
    }
  }

  // Test 4: Check if we can get insights from archived/expired stories via media endpoint
  // Try fetching recent media that might include stories
  try {
    const mediaResponse = await axios.get(`${GRAPH_API_URL}/${accountId}/media`, {
      params: {
        access_token: accessToken,
        fields: 'id,media_type,timestamp,caption',
        limit: '10'
      }
    })

    const mediaTypes = mediaResponse.data?.data?.map((m: any) => m.media_type) || []
    results.tests.recentMediaTypes = {
      status: 'success',
      types: Array.from(new Set(mediaTypes)),
      note: 'Stories are not returned via /media endpoint - they use /stories'
    }
  } catch (error: any) {
    results.tests.recentMediaTypes = {
      status: 'error',
      error: error.response?.data?.error?.message || error.message
    }
  }

  // Summary
  results.summary = {
    activeStoriesAvailable: results.tests.activeStories?.status === 'success',
    activeStoriesCount: results.tests.activeStories?.count || 0,
    storyMetricsAtAccountLevel: Object.entries(results.tests)
      .filter(([key, val]: [string, any]) => key.startsWith('story_') && val.status === 'available')
      .map(([key]) => key),
    recommendation: results.tests.activeStories?.count > 0
      ? 'Active stories found - sync now to capture reach before expiration'
      : 'No active stories. Historical story reach requires: 1) Manual input from IG Professional Dashboard, OR 2) More frequent syncs while stories are live'
  }

  return NextResponse.json(results, { status: 200 })
}
