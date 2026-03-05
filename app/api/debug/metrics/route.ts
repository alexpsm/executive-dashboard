import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const today = new Date().toISOString().split('T')[0]

  // Get all social_metrics for ALL platforms, ordered by date
  const { data: metrics, error } = await supabase
    .from('social_metrics')
    .select('*')
    .order('metric_date', { ascending: false })
    .limit(20)

  // Check sync status
  const { data: syncStatus } = await supabase
    .from('api_sync_status')
    .select('*')
    .eq('api_name', 'youtube_data')
    .single()

  return NextResponse.json({
    today,
    count: metrics?.length || 0,
    latestDate: metrics?.[0]?.metric_date,
    metrics: metrics?.slice(0, 5),
    syncStatus
  })
}

// DELETE - Clear specific platform data
export async function DELETE(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')

  if (platform) {
    // Delete specific platform
    const { error } = await supabase
      .from('social_metrics')
      .delete()
      .eq('platform', platform)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: `${platform} metrics cleared` })
  }

  // Delete ALL social_metrics
  const { error } = await supabase
    .from('social_metrics')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'All social metrics cleared' })
}

// PATCH - Update metrics for a platform (manual input)
export async function PATCH(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const body = await request.json()
  const { platform, ...metrics } = body

  if (!platform) {
    return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  // Upsert the metrics
  const { data, error } = await supabase
    .from('social_metrics')
    .upsert({
      platform,
      metric_date: today,
      ...metrics,
      api_source: 'manual'
    }, { onConflict: 'platform,metric_date' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
