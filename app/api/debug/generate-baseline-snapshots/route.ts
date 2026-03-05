import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/client'

// Generate baseline demographic snapshots for January 2026
// Uses Jan 1 follower counts from platform_baselines + current demographic percentages
export async function POST() {
  const supabase = getServiceSupabase()

  try {
    // Get platform baselines (Jan 1 follower counts)
    const { data: baselines, error: baselineError } = await supabase
      .from('platform_baselines')
      .select('*')

    if (baselineError) {
      return NextResponse.json({ success: false, error: 'Failed to get baselines: ' + baselineError.message })
    }

    // Get current demographics from audience_demographics table
    const { data: demographics, error: demoError } = await supabase
      .from('audience_demographics')
      .select('*')
      .order('metric_date', { ascending: false })

    if (demoError) {
      return NextResponse.json({ success: false, error: 'Failed to get demographics: ' + demoError.message })
    }

    // Build maps
    const baselineMap = new Map<string, number>()
    baselines?.forEach((b: any) => {
      baselineMap.set(b.platform, b.followers_jan1_2026 || 0)
    })

    // Get latest demographics per platform
    const latestDemo = new Map<string, any>()
    demographics?.forEach((d: any) => {
      if (!latestDemo.has(d.platform)) {
        latestDemo.set(d.platform, d)
      }
    })

    const results: any[] = []

    // Generate baseline snapshot for each platform
    for (const platform of ['youtube', 'instagram', 'facebook', 'tiktok']) {
      const jan1Followers = baselineMap.get(platform) || 0
      const demo = latestDemo.get(platform)

      if (jan1Followers === 0) {
        results.push({ platform, status: 'skipped', reason: 'No Jan 1 baseline followers' })
        continue
      }

      // Use current demographic percentages (best approximation)
      const age13_17 = demo?.age_13_17_percent || 0
      const age18_24 = demo?.age_18_24_percent || 0
      const genZPercent = age13_17 + age18_24
      const genZFollowers = Math.round(jan1Followers * (genZPercent / 100))

      // Upsert baseline snapshot
      const { error: upsertError } = await supabase
        .from('demographic_snapshots')
        .upsert({
          platform,
          snapshot_month: '2026-01',
          total_followers: jan1Followers,
          gen_z_followers: genZFollowers,
          age_13_17_percent: age13_17,
          age_18_24_percent: age18_24,
          gen_z_percent: genZPercent,
          is_baseline: true
        }, { onConflict: 'platform,snapshot_month' })

      if (upsertError) {
        results.push({ platform, status: 'error', error: upsertError.message })
      } else {
        results.push({
          platform,
          status: 'created',
          data: {
            total_followers: jan1Followers,
            gen_z_percent: genZPercent,
            gen_z_followers: genZFollowers
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Baseline snapshots generated',
      results
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST to this endpoint to generate January 2026 baseline demographic snapshots',
    method: 'Uses Jan 1 follower counts from platform_baselines + current demographic percentages'
  })
}
