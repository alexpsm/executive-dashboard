import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

// GET - fetch competitor metrics (optionally filtered by month)
export async function GET(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') // e.g., '2026-02'

  // Get all available months
  const { data: monthsData } = await supabase
    .from('competitor_metrics')
    .select('metric_month')
    .order('metric_month', { ascending: false })

  const availableMonths = [...new Set(monthsData?.map(r => r.metric_month).filter(Boolean))]

  // Default to current month or latest available
  const currentMonth = new Date().toISOString().slice(0, 7)
  const selectedMonth = month || (availableMonths.includes(currentMonth) ? currentMonth : availableMonths[0])

  // Fetch data for selected month
  let query = supabase
    .from('competitor_metrics')
    .select('*')
    .order('competitor_name', { ascending: true })

  if (selectedMonth) {
    query = query.eq('metric_month', selectedMonth)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // Group by competitor
  const competitors: Record<string, any> = {}
  data?.forEach((row: any) => {
    if (!competitors[row.competitor_name]) {
      competitors[row.competitor_name] = {
        name: row.competitor_name,
        instagram: null,
        youtube: null,
        tiktok: null,
      }
    }
    competitors[row.competitor_name][row.platform] = row
  })

  return NextResponse.json({
    success: true,
    competitors: Object.values(competitors),
    raw: data,
    selectedMonth,
    availableMonths,
  })
}

// POST - update competitor metrics for a specific month
export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const body = await request.json()
  const { competitor_name, platform, metrics, metric_month } = body

  if (!competitor_name || !platform) {
    return NextResponse.json(
      { success: false, error: 'competitor_name and platform are required' },
      { status: 400 }
    )
  }

  // Default to current month if not specified
  const month = metric_month || new Date().toISOString().slice(0, 7)

  const updateData: Record<string, any> = {
    competitor_name,
    platform,
    metric_month: month,
    updated_at: new Date().toISOString(),
    ...metrics,
  }

  console.log('Competitors API - Upserting:', JSON.stringify(updateData, null, 2))

  const { error } = await supabase
    .from('competitor_metrics')
    .upsert(updateData, { onConflict: 'competitor_name,platform,metric_month' })

  if (error) {
    console.error('Competitors API - Upsert error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, month })
}
