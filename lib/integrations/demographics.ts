// Demographic Snapshot Management
// This module handles saving and retrieving monthly demographic snapshots
// for accurate Gen Z audience tracking

import { getServiceSupabase } from '@/lib/supabase/client'

export interface DemographicSnapshot {
  platform: string
  snapshot_month: string
  total_followers: number
  gen_z_followers: number
  age_13_17_percent: number
  age_18_24_percent: number
  gen_z_percent: number
  age_25_34_percent?: number
  age_35_44_percent?: number
  age_45_54_percent?: number
  age_55_64_percent?: number
  age_65_plus_percent?: number
  is_baseline?: boolean
}

export interface GenZGrowthResult {
  platform: string
  baseline_month: string
  baseline_gen_z: number
  current_month: string
  current_gen_z: number
  gen_z_gained: number
  growth_percent: number
}

// Get current month string (YYYY-MM format)
export function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

// Save or update a demographic snapshot for a platform
export async function saveDemographicSnapshot(data: {
  platform: string
  total_followers: number
  demographics: {
    age13_17: number
    age18_24: number
    age25_34?: number
    age35_44?: number
    age45_54?: number
    age55_64?: number
    age65plus?: number
  }
}): Promise<boolean> {
  const supabase = getServiceSupabase()
  const snapshot_month = getCurrentMonth()

  const genZPercent = data.demographics.age13_17 + data.demographics.age18_24
  const genZFollowers = Math.round(data.total_followers * (genZPercent / 100))

  const snapshot: DemographicSnapshot = {
    platform: data.platform,
    snapshot_month,
    total_followers: data.total_followers,
    gen_z_followers: genZFollowers,
    age_13_17_percent: data.demographics.age13_17,
    age_18_24_percent: data.demographics.age18_24,
    gen_z_percent: genZPercent,
    age_25_34_percent: data.demographics.age25_34 || 0,
    age_35_44_percent: data.demographics.age35_44 || 0,
    age_45_54_percent: data.demographics.age45_54 || 0,
    age_55_64_percent: data.demographics.age55_64 || 0,
    age_65_plus_percent: data.demographics.age65plus || 0,
  }

  const { error } = await supabase
    .from('demographic_snapshots')
    .upsert(snapshot, { onConflict: 'platform,snapshot_month' })

  if (error) {
    console.error(`Failed to save ${data.platform} demographic snapshot:`, error.message)
    return false
  }

  console.log(`Saved ${data.platform} demographic snapshot: ${snapshot_month}, Gen Z=${genZFollowers} (${genZPercent.toFixed(1)}%)`)
  return true
}

// Get the baseline snapshot (January 2026 or first available)
export async function getBaselineSnapshot(platform: string): Promise<DemographicSnapshot | null> {
  const supabase = getServiceSupabase()

  // First try to get the marked baseline
  let { data, error } = await supabase
    .from('demographic_snapshots')
    .select('*')
    .eq('platform', platform)
    .eq('is_baseline', true)
    .single()

  if (!error && data) {
    return data as DemographicSnapshot
  }

  // Fall back to January 2026
  const result = await supabase
    .from('demographic_snapshots')
    .select('*')
    .eq('platform', platform)
    .eq('snapshot_month', '2026-01')
    .single()

  if (!result.error && result.data) {
    return result.data as DemographicSnapshot
  }

  // Fall back to earliest available snapshot
  const earliest = await supabase
    .from('demographic_snapshots')
    .select('*')
    .eq('platform', platform)
    .order('snapshot_month', { ascending: true })
    .limit(1)
    .single()

  return earliest.data as DemographicSnapshot | null
}

// Get the latest snapshot for a platform
export async function getLatestSnapshot(platform: string): Promise<DemographicSnapshot | null> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('demographic_snapshots')
    .select('*')
    .eq('platform', platform)
    .order('snapshot_month', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return data as DemographicSnapshot
}

// Calculate Gen Z growth for a platform (YTD)
export async function calculateGenZGrowth(platform: string): Promise<GenZGrowthResult | null> {
  const baseline = await getBaselineSnapshot(platform)
  const current = await getLatestSnapshot(platform)

  if (!baseline || !current) {
    return null
  }

  const genZGained = current.gen_z_followers - baseline.gen_z_followers
  const growthPercent = baseline.gen_z_followers > 0
    ? ((genZGained / baseline.gen_z_followers) * 100)
    : 0

  return {
    platform,
    baseline_month: baseline.snapshot_month,
    baseline_gen_z: baseline.gen_z_followers,
    current_month: current.snapshot_month,
    current_gen_z: current.gen_z_followers,
    gen_z_gained: genZGained,
    growth_percent: growthPercent
  }
}

// Calculate total Gen Z gained across all platforms (YTD)
export async function calculateTotalGenZGained(): Promise<{
  total_gen_z_gained: number
  total_current_gen_z: number
  platforms: GenZGrowthResult[]
}> {
  const platforms = ['youtube', 'instagram', 'facebook', 'tiktok']
  const results: GenZGrowthResult[] = []

  for (const platform of platforms) {
    const growth = await calculateGenZGrowth(platform)
    if (growth) {
      results.push(growth)
    }
  }

  const totalGained = results.reduce((sum, r) => sum + r.gen_z_gained, 0)
  const totalCurrent = results.reduce((sum, r) => sum + r.current_gen_z, 0)

  return {
    total_gen_z_gained: totalGained,
    total_current_gen_z: totalCurrent,
    platforms: results
  }
}

// Get all snapshots for a platform (for charts/history)
export async function getSnapshotHistory(platform: string): Promise<DemographicSnapshot[]> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('demographic_snapshots')
    .select('*')
    .eq('platform', platform)
    .order('snapshot_month', { ascending: true })

  if (error) {
    console.error(`Failed to get ${platform} snapshot history:`, error.message)
    return []
  }

  return data as DemographicSnapshot[]
}
