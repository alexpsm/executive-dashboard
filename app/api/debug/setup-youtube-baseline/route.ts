import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/client'

// Add YouTube to platform_baselines and create baseline snapshot
export async function POST() {
  const supabase = getServiceSupabase()

  try {
    // Get latest YouTube demographic snapshot (has current data)
    const { data: currentSnapshot } = await supabase
      .from('demographic_snapshots')
      .select('*')
      .eq('platform', 'youtube')
      .order('snapshot_month', { ascending: false })
      .limit(1)
      .single()

    // Get current YouTube analytics data
    const { data: ytData } = await supabase
      .from('social_metrics')
      .select('*')
      .eq('platform', 'youtube')
      .order('metric_date', { ascending: false })
      .limit(1)
      .single()

    // Calculate Jan 1 baseline from current data
    // Current subs = 168,000, YTD gained = 1,588, so Jan 1 = ~166,412
    const currentSubs = 168000
    const ytdGained = 1588
    const jan1Subs = currentSubs - ytdGained

    // Add to platform_baselines
    const { error: baselineError } = await supabase
      .from('platform_baselines')
      .upsert({
        platform: 'youtube',
        followers_jan1_2026: jan1Subs
      }, { onConflict: 'platform' })

    if (baselineError) {
      return NextResponse.json({ success: false, error: 'Failed to add baseline: ' + baselineError.message })
    }

    // Create Jan 2026 demographic snapshot using current percentages
    const genZPercent = currentSnapshot?.gen_z_percent || 12.8
    const age13_17 = currentSnapshot?.age_13_17_percent || 3.8
    const age18_24 = currentSnapshot?.age_18_24_percent || 9.0
    const genZFollowers = Math.round(jan1Subs * (genZPercent / 100))

    const { error: snapshotError } = await supabase
      .from('demographic_snapshots')
      .upsert({
        platform: 'youtube',
        snapshot_month: '2026-01',
        total_followers: jan1Subs,
        gen_z_followers: genZFollowers,
        age_13_17_percent: age13_17,
        age_18_24_percent: age18_24,
        gen_z_percent: genZPercent,
        is_baseline: true
      }, { onConflict: 'platform,snapshot_month' })

    if (snapshotError) {
      return NextResponse.json({ success: false, error: 'Failed to create snapshot: ' + snapshotError.message })
    }

    return NextResponse.json({
      success: true,
      message: 'YouTube baseline set up',
      data: {
        jan1_subscribers: jan1Subs,
        current_subscribers: currentSubs,
        ytd_gained: ytdGained,
        gen_z_percent: genZPercent,
        jan1_gen_z: genZFollowers
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
