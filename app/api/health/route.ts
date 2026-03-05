import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/client'
import { clickupClient } from '@/lib/integrations/clickup'
import { googleCalendarClient } from '@/lib/integrations/google-calendar'
import { ollamaClient } from '@/lib/ai/ollama'
import { openaiClient } from '@/lib/ai/openai'
import { calculateTotalGenZGained } from '@/lib/integrations/demographics'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = getServiceSupabase()
  try {
    // Fetch AI settings from DB
    const { data: dbSettings } = await supabase.from('settings').select('*')
    const config: Record<string, string> = {}
    dbSettings?.forEach((s: any) => config[s.key] = s.value)

    const provider = config['ai_provider'] || process.env.AI_PROVIDER || 'ollama'
    const openAIKey = config['openai_api_key'] || process.env.OPENAI_API_KEY
    const openAIModel = config['openai_model'] || process.env.OPENAI_MODEL || 'gpt-4o'

    // Check services in parallel
    const [clickupStatus, calendarStatus, ollamaStatus] = await Promise.all([
      clickupClient.testConnection(),
      googleCalendarClient.testConnection(),
      ollamaClient.testConnection()
    ])

    // Test OpenAI if selected
    let openaiConnected = false
    if (provider === 'openai' && openAIKey) {
      const test = await openaiClient.testConnection(openAIKey)
      openaiConnected = test.success
    }

    const startOfYear = `${new Date().getFullYear()}-01-01`
    const today = new Date().toISOString().split('T')[0]

    // Fetch all required data in parallel
    const [
      { data: financialData },
      { data: revenueData },
      { data: dealsData, count: activeDealsCount },
      { data: socialData },
      { data: demographicsData },
      { data: kpiTargets },
      { data: syncStatus },
      { data: roiMetrics },
      { data: baselines }
    ] = await Promise.all([
      // Financial KPIs (from new table)
      supabase
        .from('financial_kpis')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1),

      // Revenue from invoices (backup)
      supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')
        .gte('issue_date', startOfYear),

      // Deals Pipeline
      supabase
        .from('deals')
        .select('deal_value, stage')
        .neq('stage', 'Lost'),

      // Social Metrics (all YTD data for aggregation)
      // Query all data from this year plus any YTD records
      supabase
        .from('social_metrics')
        .select('*')
        .gte('metric_date', `${new Date().getFullYear()}-01-01`)
        .order('metric_date', { ascending: true }),

      // Demographics for Gen Z tracking
      supabase
        .from('audience_demographics')
        .select('*')
        .order('metric_date', { ascending: false }),

      // KPI Targets
      supabase
        .from('kpi_targets')
        .select('*'),

      // API Sync Status
      supabase
        .from('api_sync_status')
        .select('*'),

      // ROI Metrics (last 30 days)
      supabase
        .from('roi_metrics')
        .select('time_saved_hours')
        .gte('metric_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Platform baselines for Instagram/Facebook followers calculation
      supabase
        .from('platform_baselines')
        .select('*')
    ])

    // Get latest financial KPI
    const latestFinancial = financialData?.[0]

    // Note: Cross-platform revenue will be calculated after social data aggregation
    // as it's YouTube ad revenue + Facebook platform revenue
    const b2b_digital_sales = latestFinancial?.b2b_digital_sales || 0
    const running_costs_saved = latestFinancial?.running_costs_saved || 0

    // Pipeline value
    const pipeline_value = dealsData?.reduce((sum, d) => sum + (d.deal_value || 0), 0) || 0

    // Build baseline map for Instagram/Facebook followers calculation
    const baselineMap = new Map<string, number>()
    baselines?.forEach((b: any) => {
      baselineMap.set(b.platform, b.followers_jan1_2026 || 0)
    })

    // Aggregate YTD metrics per platform
    // Instagram/Facebook: use latest values (followers from baselines)
    // YouTube: sum daily values from Analytics API
    const ytdSocial = new Map<string, any>()

    socialData?.forEach((m: any) => {
      // Skip YTD records - only process daily records
      if (m.metric_date?.includes('-ytd')) return

      if (!ytdSocial.has(m.platform)) {
        ytdSocial.set(m.platform, {
          platform: m.platform,
          views: 0,
          followers: 0,
          followers_gained: 0,
          yt_ad_revenue: 0,
          shorts_views: 0,
          views_3s: 0,
          views_1min: 0,
          reach: 0,
          story_reach: 0,
          impressions: 0,
          story_impressions: 0, // Facebook story impressions (manual input - not available via API)
          posts_count: 0,
          engagement_sum: 0,
          engagement_count: 0,
          avg_video_views: 0,
          avg_shorts_views: 0,
          avg_reach_post: 0,
          ctr: 0,
          estimated_price_post: 0,
          estimated_price_story: 0,
          platform_revenue: 0 // Facebook platform revenue (manual input until API available)
        })
      }

      const agg = ytdSocial.get(m.platform)

      // Platform-specific aggregation logic
      if (m.platform === 'instagram') {
        // Instagram: use LATEST values for metrics (main sync updates these)
        agg.views = m.views || agg.views
        agg.engagement = m.engagement || agg.engagement
        agg.avg_reach_post = m.avg_reach_post || agg.avg_reach_post
        agg.story_reach = m.story_reach || agg.story_reach
        agg.posts_count = m.posts_count || agg.posts_count
        agg.estimated_price_post = m.estimated_price_post || agg.estimated_price_post
        agg.estimated_price_story = m.estimated_price_story || agg.estimated_price_story
        // Note: followers will be set from baselines below
      } else if (m.platform === 'facebook') {
        // Facebook: SUM daily values for YTD totals
        agg.followers += m.followers || 0 // Daily followers gained (will be overridden by baseline if available)
        agg.views += m.views || 0 // Daily 3s video views
        agg.impressions += m.impressions || 0 // Daily impressions (page_posts_impressions)
        agg.story_impressions = (agg.story_impressions || 0) + (m.story_impressions || 0) // Story impressions (manual input)
        // Keep latest non-zero values for these aggregate metrics (from main sync)
        agg.views_3s = m.views_3s || agg.views_3s
        agg.views_1min = m.views_1min || agg.views_1min
        agg.reach = m.reach || agg.reach // Total video plays (any duration) - matches Business Manager
        agg.posts_count = m.posts_count || agg.posts_count
        agg.platform_revenue = m.platform_revenue || agg.platform_revenue // Manual input until API available
      } else {
        // YouTube/TikTok: SUM daily values
        agg.views += m.views || 0
        agg.followers += m.followers || 0
        agg.followers_gained += m.followers_gained || 0
        agg.yt_ad_revenue += m.yt_ad_revenue || 0
        agg.reach += m.reach || 0
        agg.impressions += m.impressions || 0
        // Track engagement for averaging
        if (m.engagement > 0) {
          agg.engagement_sum += m.engagement
          agg.engagement_count++
        }
        // Keep latest non-zero values for aggregate KPIs
        agg.shorts_views = m.shorts_views || agg.shorts_views
        agg.posts_count = m.posts_count || agg.posts_count
        agg.avg_video_views = m.avg_video_views || agg.avg_video_views
        agg.avg_shorts_views = m.avg_shorts_views || agg.avg_shorts_views
        agg.ctr = m.ctr || agg.ctr
      }
    })

    // Calculate average engagement rates for YouTube/TikTok
    ytdSocial.forEach((agg) => {
      if (agg.engagement_count > 0) {
        agg.engagement = Math.round((agg.engagement_sum / agg.engagement_count) * 100) / 100
      }
    })

    // Calculate Instagram followers from baselines (current - Jan 1)
    // This is more accurate than summing daily values (API only keeps ~30 days)
    const igBaseline = baselineMap.get('instagram') || 0
    if (igBaseline > 0 && ytdSocial.has('instagram')) {
      // Fetch current Instagram follower count
      try {
        const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
        const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID
        if (accessToken && igAccountId) {
          const igResponse = await fetch(
            `https://graph.facebook.com/v19.0/${igAccountId}?fields=followers_count&access_token=${accessToken}`
          )
          const igData = await igResponse.json()
          const currentFollowers = igData.followers_count || 0
          const followersGained = currentFollowers - igBaseline
          ytdSocial.get('instagram').followers = followersGained
        }
      } catch (e) {
        console.error('Failed to fetch Instagram followers:', e)
      }
    }

    // Calculate Facebook followers from baselines (current - Jan 1)
    // More accurate than summing daily API values
    const fbBaseline = baselineMap.get('facebook') || 0
    if (fbBaseline > 0 && ytdSocial.has('facebook')) {
      try {
        const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
        const pageId = process.env.FACEBOOK_PAGE_ID
        if (accessToken && pageId) {
          const fbResponse = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=followers_count,fan_count&access_token=${accessToken}`
          )
          const fbData = await fbResponse.json()
          const currentFollowers = fbData.followers_count || fbData.fan_count || 0
          const followersGained = currentFollowers - fbBaseline
          ytdSocial.get('facebook').followers = followersGained
          console.log(`Facebook followers: current=${currentFollowers}, baseline=${fbBaseline}, gained=${followersGained}`)
        }
      } catch (e) {
        console.error('Failed to fetch Facebook followers:', e)
      }
    }

    // Alias for backwards compatibility
    const latestSocial = ytdSocial

    // Get latest demographics per platform
    const latestDemographics = new Map<string, any>()
    demographicsData?.forEach((d: any) => {
      if (!latestDemographics.has(d.platform)) {
        latestDemographics.set(d.platform, d)
      }
    })

    // Calculate total audience
    const total_audience = Array.from(latestSocial.values())
      .reduce((sum, m) => sum + (m.followers || 0), 0)

    // Calculate Gen Z audience using snapshot-based tracking
    // This compares baseline (Jan 2026 or first available) vs current snapshot
    // to accurately track Gen Z followers GAINED, not just current total
    let total_gen_z = 0
    let gen_z_gained = 0
    let gen_z_platforms: any[] = []

    try {
      const genZData = await calculateTotalGenZGained()
      total_gen_z = genZData.total_current_gen_z // Current total Gen Z followers
      gen_z_gained = genZData.total_gen_z_gained // Gen Z followers gained YTD
      gen_z_platforms = genZData.platforms // Per-platform breakdown
    } catch (e) {
      console.error('Failed to calculate Gen Z from snapshots, falling back to demographics table')
      // Fallback to old method if snapshots aren't available yet
      total_gen_z = Array.from(latestDemographics.values())
        .reduce((sum, d) => sum + (d.gen_z_followers || 0), 0)
    }

    // ROI / Cost savings
    const monthly_time_saved = roiMetrics?.reduce((sum, m) => sum + (m.time_saved_hours || 0), 0) || 0

    // Build social stats object
    const youtube = latestSocial.get('youtube')
    const instagram = latestSocial.get('instagram')
    const tiktok = latestSocial.get('tiktok')
    const facebook = latestSocial.get('facebook')

    // Calculate Cross-Platform Revenue = YouTube Ad Revenue + Facebook Platform Revenue
    const youtubeRevenue = youtube?.yt_ad_revenue || 0
    const facebookRevenue = facebook?.platform_revenue || 0
    const ytd_revenue = youtubeRevenue + facebookRevenue

    // ALL SOCIAL STATS ARE YTD (2026 progress)
    const socialStats = {
      youtube: youtube ? {
        // YTD Metrics (progress in 2026)
        subscribers_gained: youtube.subscribers || youtube.followers || 0, // Net subs gained in 2026
        views: youtube.views || 0, // Views in 2026
        shorts_views: youtube.shorts_views || 0, // Shorts views in 2026
        ad_revenue: youtube.yt_ad_revenue || 0, // Ad revenue in 2026
        impressions: youtube.impressions || 0, // Impressions in 2026
        ctr: youtube.ctr || 0, // CTR in 2026
        engagement_rate: youtube.engagement || 0, // Engagement rate for 2026 content
        avg_video_views: youtube.avg_video_views || 0, // Avg views for 2026 videos
        avg_shorts_views: youtube.avg_shorts_views || 0, // Avg views for 2026 shorts
        posts_count: youtube.posts_count || 0, // Videos published in 2026
        // Legacy fields for backwards compatibility
        followers: youtube.followers || 0,
        subscribers: youtube.subscribers || youtube.followers || 0
      } : null,

      instagram: instagram ? {
        // YTD Metrics (progress in 2026)
        followers_gained: instagram.followers || 0, // Followers gained in 2026
        engagement_rate: instagram.engagement || 0, // Engagement from 2026 posts
        avg_reach_post: instagram.avg_reach_post || 0, // Avg reach per 2026 post (from main sync)
        avg_reach_story: instagram.story_reach || 0, // Avg reach per 2026 story
        total_reach: instagram.views || 0, // Total reach from summing individual post reach (consistent with avg)
        posts_count: instagram.posts_count || 0, // Posts in 2026
        estimated_price_post: instagram.estimated_price_post || 0, // HypeAuditor price per post
        estimated_price_story: instagram.estimated_price_story || 0, // HypeAuditor price per story
        // Legacy fields
        followers: instagram.followers || 0,
        engagement: instagram.engagement || 0,
        reach: instagram.reach || 0, // Daily reach summed (kept for backwards compatibility)
        story_reach: instagram.story_reach || 0
      } : null,

      tiktok: tiktok ? {
        // YTD Metrics
        followers_gained: tiktok.followers_gained || tiktok.followers || 0,
        engagement_rate: tiktok.engagement || 0,
        reach: tiktok.reach || 0,
        for_you_rate: tiktok.for_you_rate || 0,
        // Legacy
        followers: tiktok.followers || 0,
        engagement: tiktok.engagement || 0
      } : null,

      facebook: facebook ? {
        // YTD Metrics (progress in 2026)
        followers_gained: facebook.followers || 0, // Followers gained in 2026
        // Total views = page_posts_impressions (videos + photos + posts, excludes stories)
        total_views: facebook.impressions || 0,
        views_3s: facebook.views_3s || facebook.views || 0, // 3-second video views
        views_1min: facebook.views_1min || 0, // 1-minute video views
        platform_revenue: facebook.platform_revenue || 0, // Platform revenue in 2026
        posts_count: facebook.posts_count || 0, // Videos published in 2026
        // Legacy
        followers: facebook.followers || 0,
        views: facebook.views || 0
      } : null
    }

    // Build KPI targets map
    const targets = new Map<string, any>()
    kpiTargets?.forEach(t => targets.set(t.kpi_key, t))

    // Build sync status map
    const syncStatusMap = new Map<string, any>()
    syncStatus?.forEach(s => syncStatusMap.set(s.api_name, s))

    const stats = {
      // Main KPIs
      ytd_revenue,
      revenue_goal: targets.get('revenue_cross_platform')?.target_value || 100000,
      b2b_digital_sales,
      b2b_goal: targets.get('b2b_digital_sales')?.target_value || 50000,
      running_costs_saved,
      cost_savings_goal: targets.get('running_costs_saved')?.target_value || 75000,

      // Audience
      total_audience,
      total_gen_z, // Current total Gen Z followers across all platforms
      gen_z_gained, // Gen Z followers gained YTD (from snapshots)
      gen_z_platforms, // Per-platform Gen Z breakdown
      audience_goal: targets.get('gen_z_fb_ig_tiktok')?.target_value || 483722,

      // Pipeline
      active_deals: activeDealsCount || 0,
      pipeline_value,

      // ROI
      monthly_time_saved,
      cost_savings: monthly_time_saved * 50,

      // Social detailed stats
      social: socialStats,

      // Overdue invoices (for header badge)
      overdue_invoices: 0 // Will calculate if needed
    }

    // Check for overdue invoices
    const { count: overdueCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'overdue')

    stats.overdue_invoices = overdueCount || 0

    // Check which services have credentials configured
    const hasMondayToken = !!process.env.MONDAY_API_TOKEN
    const hasYouTubeCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_REFRESH_TOKEN)
    const hasMetaCredentials = !!process.env.FACEBOOK_ACCESS_TOKEN
    const hasXeroCredentials = !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET)

    return NextResponse.json({
      success: true,
      services: {
        supabase: true,
        // AI Services
        ollama: ollamaStatus.success,
        ollama_models: ollamaStatus.models || [],
        ai_provider: provider,
        openai_model: openAIModel,
        openai: !!openAIKey,
        has_openai_key: !!openAIKey,
        // Integration Services (based on env vars)
        monday: hasMondayToken,
        youtube: hasYouTubeCredentials,
        meta: hasMetaCredentials,
        xero: hasXeroCredentials,
        // Legacy (keep for backwards compatibility)
        clickup: clickupStatus.success,
        calendar: calendarStatus.success,
        instagram: hasMetaCredentials,
        facebook: hasMetaCredentials,
        tiktok: false // TikTok API is restricted, always manual
      },
      syncStatus: Object.fromEntries(syncStatusMap),
      stats,
      targets: Object.fromEntries(targets),
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Health API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
