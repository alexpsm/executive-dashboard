import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/client'

// Manually set demographic percentages for platforms where API doesn't work
// POST body: { platform: 'instagram', age13_17: 5.2, age18_24: 28.5 }
export async function POST(request: Request) {
  const supabase = getServiceSupabase()

  try {
    const body = await request.json()
    const { platform, age13_17, age18_24 } = body

    if (!platform || age13_17 === undefined || age18_24 === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Required: platform, age13_17, age18_24'
      }, { status: 400 })
    }

    const genZPercent = age13_17 + age18_24

    // Get baseline followers from platform_baselines
    const { data: baseline } = await supabase
      .from('platform_baselines')
      .select('followers_jan1_2026')
      .eq('platform', platform)
      .single()

    const jan1Followers = baseline?.followers_jan1_2026 || 0

    // Update January baseline snapshot
    if (jan1Followers > 0) {
      const jan1GenZ = Math.round(jan1Followers * (genZPercent / 100))

      await supabase
        .from('demographic_snapshots')
        .upsert({
          platform,
          snapshot_month: '2026-01',
          total_followers: jan1Followers,
          gen_z_followers: jan1GenZ,
          age_13_17_percent: age13_17,
          age_18_24_percent: age18_24,
          gen_z_percent: genZPercent,
          is_baseline: true
        }, { onConflict: 'platform,snapshot_month' })
    }

    // Also update current demographics in audience_demographics table
    const todayStr = new Date().toISOString().split('T')[0]

    // Get current follower count
    let currentFollowers = 0
    if (platform === 'instagram') {
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
      const igAccountId = process.env.INSTAGRAM_ACCOUNT_ID
      if (accessToken && igAccountId) {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${igAccountId}?fields=followers_count&access_token=${accessToken}`
        )
        const data = await res.json()
        currentFollowers = data.followers_count || 0
      }
    } else if (platform === 'facebook') {
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
      const pageId = process.env.FACEBOOK_PAGE_ID
      if (accessToken && pageId) {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}?fields=followers_count&access_token=${accessToken}`
        )
        const data = await res.json()
        currentFollowers = data.followers_count || 0
      }
    }

    const currentGenZ = Math.round(currentFollowers * (genZPercent / 100))

    // Update audience_demographics
    await supabase
      .from('audience_demographics')
      .upsert({
        platform,
        metric_date: todayStr,
        age_13_17_percent: age13_17,
        age_18_24_percent: age18_24,
        gen_z_followers: currentGenZ,
        total_followers: currentFollowers,
        api_source: 'manual'
      }, { onConflict: 'platform,metric_date' })

    // Update/create current month snapshot
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    await supabase
      .from('demographic_snapshots')
      .upsert({
        platform,
        snapshot_month: currentMonth,
        total_followers: currentFollowers,
        gen_z_followers: currentGenZ,
        age_13_17_percent: age13_17,
        age_18_24_percent: age18_24,
        gen_z_percent: genZPercent,
        is_baseline: false
      }, { onConflict: 'platform,snapshot_month' })

    return NextResponse.json({
      success: true,
      message: `Demographics updated for ${platform}`,
      data: {
        platform,
        gen_z_percent: genZPercent,
        jan1_followers: jan1Followers,
        jan1_gen_z: jan1Followers > 0 ? Math.round(jan1Followers * (genZPercent / 100)) : 0,
        current_followers: currentFollowers,
        current_gen_z: currentGenZ
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    usage: 'POST with JSON body: { "platform": "instagram", "age13_17": 5.2, "age18_24": 28.5 }',
    example: 'curl -X POST -H "Content-Type: application/json" -d \'{"platform":"instagram","age13_17":5,"age18_24":28}\' http://localhost:3002/api/debug/set-demographics'
  })
}
