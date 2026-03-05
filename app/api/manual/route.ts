import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET - List all manual metrics
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const metricKey = searchParams.get('metric_key')

    const supabase = getSupabase()

    let query = supabase
      .from('manual_metrics')
      .select('*')
      .order('metric_date', { ascending: false })

    if (platform) {
      query = query.eq('platform', platform)
    }

    if (metricKey) {
      query = query.eq('metric_key', metricKey)
    }

    const { data, error } = await query.limit(100)

    if (error) throw error

    return NextResponse.json({
      success: true,
      metrics: data
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// POST - Save manual metrics
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { metrics } = body

    if (!metrics || !Array.isArray(metrics)) {
      return NextResponse.json(
        { success: false, error: 'metrics array is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()
    const today = new Date().toISOString().split('T')[0]

    // Validate and prepare metrics
    const validMetrics = metrics.map(m => ({
      metric_key: m.metric_key,
      metric_value: parseFloat(m.metric_value),
      metric_date: m.metric_date || today,
      platform: m.platform || null,
      notes: m.notes || null
    }))

    // Upsert manual metrics
    for (const metric of validMetrics) {
      await supabase
        .from('manual_metrics')
        .upsert(metric, { onConflict: 'metric_key,metric_date' })

      // Also update social_metrics if it's a social platform metric
      if (metric.platform && ['youtube', 'instagram', 'tiktok', 'facebook'].includes(metric.platform)) {
        const fieldMap: Record<string, string> = {
          // HypeAuditor estimated prices
          'youtube_price_per_post': 'estimated_price_post',
          'instagram_price_per_post': 'estimated_price_post',
          'instagram_price_per_story': 'estimated_price_story',
          'tiktok_price_per_post': 'estimated_price_post',

          // Facebook manual metrics
          'facebook_platform_revenue': 'platform_revenue',
          'facebook_views_1min': 'views_1min',
          'facebook_story_impressions': 'story_impressions', // Story impressions (not available via API)

          // TikTok manual metrics
          'tiktok_followers': 'followers',
          'tiktok_followers_gained': 'followers_gained',
          'tiktok_engagement_rate': 'engagement',
          'tiktok_reach_per_post': 'reach',
          'tiktok_for_you_rate': 'for_you_rate',

          // Instagram manual (story reach avg)
          'instagram_avg_reach_story': 'story_reach',

          // YouTube manual metrics (if Analytics API unavailable)
          'youtube_ctr': 'ctr',
          'youtube_ad_revenue': 'yt_ad_revenue'
        }

        const field = fieldMap[metric.metric_key]
        if (field) {
          await supabase
            .from('social_metrics')
            .upsert({
              platform: metric.platform,
              metric_date: metric.metric_date,
              [field]: metric.metric_value,
              is_manual_entry: true
            }, { onConflict: 'platform,metric_date' })
        }
      }

      // Update financial_kpis if it's a financial metric
      if (metric.metric_key === 'running_costs_baseline') {
        await supabase
          .from('financial_kpis')
          .upsert({
            metric_date: metric.metric_date,
            running_costs_baseline: metric.metric_value
          }, { onConflict: 'metric_date' })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${validMetrics.length} manual metrics`,
      saved: validMetrics.length
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove a manual metric
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const metricKey = searchParams.get('metric_key')
    const metricDate = searchParams.get('metric_date')

    if (!metricKey || !metricDate) {
      return NextResponse.json(
        { success: false, error: 'metric_key and metric_date are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from('manual_metrics')
      .delete()
      .eq('metric_key', metricKey)
      .eq('metric_date', metricDate)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Metric deleted'
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
