import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import axios from 'axios'

const GRAPH_API_URL = 'https://graph.facebook.com/v22.0'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60 seconds for cron

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no secret configured, allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!accessToken || !accountId) {
    return NextResponse.json({ error: 'Missing Instagram credentials' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    storiesFetched: 0,
    storiesSaved: 0,
    errors: []
  }

  try {
    // Fetch active stories with reach insights
    const storiesResponse = await axios.get(`${GRAPH_API_URL}/${accountId}/stories`, {
      params: {
        access_token: accessToken,
        fields: 'id,timestamp,media_type,insights.metric(reach,impressions,replies,exits)'
      }
    })

    const stories = storiesResponse.data?.data || []
    results.storiesFetched = stories.length

    if (stories.length === 0) {
      results.message = 'No active stories found'
      return NextResponse.json(results, { status: 200 })
    }

    // Save each story to content_posts
    for (const story of stories) {
      try {
        // Extract metrics from insights
        const insights = story.insights?.data || []
        const reachMetric = insights.find((m: any) => m.name === 'reach')
        const impressionsMetric = insights.find((m: any) => m.name === 'impressions')
        const repliesMetric = insights.find((m: any) => m.name === 'replies')
        const exitsMetric = insights.find((m: any) => m.name === 'exits')

        const reach = reachMetric?.values?.[0]?.value ?? reachMetric?.value ?? 0
        const impressions = impressionsMetric?.values?.[0]?.value ?? impressionsMetric?.value ?? 0
        const replies = repliesMetric?.values?.[0]?.value ?? repliesMetric?.value ?? 0
        const exits = exitsMetric?.values?.[0]?.value ?? exitsMetric?.value ?? 0

        if (reach > 0) {
          const { error } = await supabase
            .from('content_posts')
            .upsert({
              platform: 'instagram',
              external_id: story.id,
              post_type: 'story',
              published_at: story.timestamp,
              reach,
              views: impressions,
              comments: replies,
              // Store exits in a JSON field or separate column if needed
            }, { onConflict: 'platform,external_id' })

          if (error) {
            results.errors.push({ storyId: story.id, error: error.message })
          } else {
            results.storiesSaved++
          }
        }
      } catch (storyError: any) {
        results.errors.push({ storyId: story.id, error: storyError.message })
      }
    }

    // Log sync to api_sync_status
    await supabase
      .from('api_sync_status')
      .upsert({
        api_name: 'instagram_stories_cron',
        last_sync_at: new Date().toISOString(),
        last_success_at: results.storiesSaved > 0 ? new Date().toISOString() : undefined,
        records_synced: results.storiesSaved,
        is_healthy: results.errors.length === 0,
        last_error: results.errors.length > 0 ? JSON.stringify(results.errors[0]) : null
      }, { onConflict: 'api_name' })

    results.success = true
    results.message = `Synced ${results.storiesSaved} stories with reach data`

  } catch (error: any) {
    results.success = false
    results.error = error.response?.data?.error?.message || error.message
  }

  return NextResponse.json(results, { status: 200 })
}
