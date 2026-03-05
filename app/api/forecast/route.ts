import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

const PLATFORMS = ['facebook', 'youtube', 'instagram', 'tiktok', 'website', 'x', 'recharge']
const MONTHS_2026 = [
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'
]

// GET - fetch financial forecast data
export async function GET(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month')
  const view = searchParams.get('view') || 'month' // 'month' or 'year'

  // Default to current month
  const currentMonth = new Date().toISOString().slice(0, 7)
  const selectedMonth = month || currentMonth

  if (view === 'year') {
    // Fetch all data for the year
    const { data, error } = await supabase
      .from('financial_forecast')
      .select('*')
      .gte('metric_month', '2026-01')
      .lte('metric_month', '2026-12')
      .order('metric_month', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Organize by month -> platform
    const yearData: Record<string, Record<string, any>> = {}
    MONTHS_2026.forEach(m => {
      yearData[m] = {}
      PLATFORMS.forEach(p => {
        yearData[m][p] = data?.find(d => d.metric_month === m && d.platform === p) || {
          platform: p,
          metric_month: m,
          forecast_cost_of_sales: 0,
          forecast_gross_profit: 0,
          forecast_other_op_costs: 0,
          actual_cost_of_sales: 0,
          actual_gross_profit: 0,
          actual_other_op_costs: 0,
        }
      })
    })

    // Calculate yearly totals
    const yearlyTotals = {
      forecast_cost_of_sales: 0,
      forecast_gross_profit: 0,
      forecast_other_op_costs: 0,
      actual_cost_of_sales: 0,
      actual_gross_profit: 0,
      actual_other_op_costs: 0,
    }
    data?.forEach((d: any) => {
      yearlyTotals.forecast_cost_of_sales += parseFloat(d.forecast_cost_of_sales) || 0
      yearlyTotals.forecast_gross_profit += parseFloat(d.forecast_gross_profit) || 0
      yearlyTotals.forecast_other_op_costs += parseFloat(d.forecast_other_op_costs) || 0
      yearlyTotals.actual_cost_of_sales += parseFloat(d.actual_cost_of_sales) || 0
      yearlyTotals.actual_gross_profit += parseFloat(d.actual_gross_profit) || 0
      yearlyTotals.actual_other_op_costs += parseFloat(d.actual_other_op_costs) || 0
    })

    return NextResponse.json({
      success: true,
      view: 'year',
      yearData,
      yearlyTotals,
      months: MONTHS_2026,
    })
  }

  // Monthly view - fetch data for selected month
  const { data, error } = await supabase
    .from('financial_forecast')
    .select('*')
    .eq('metric_month', selectedMonth)
    .order('platform', { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // Ensure all platforms exist in response
  const platformData: Record<string, any> = {}
  PLATFORMS.forEach(p => {
    platformData[p] = data?.find(d => d.platform === p) || {
      platform: p,
      metric_month: selectedMonth,
      forecast_cost_of_sales: 0,
      forecast_gross_profit: 0,
      forecast_other_op_costs: 0,
      actual_cost_of_sales: 0,
      actual_gross_profit: 0,
      actual_other_op_costs: 0,
    }
  })

  // Calculate totals
  // Recharge is money coming back, so it REDUCES total cost of sales (subtract instead of add)
  const revenueGeneratingPlatforms = Object.entries(platformData).filter(([key]) => key !== 'recharge')
  const rechargeData = platformData['recharge'] || { forecast_cost_of_sales: 0, actual_cost_of_sales: 0, forecast_other_op_costs: 0, actual_other_op_costs: 0 }

  // Sum all platforms except recharge
  const nonRechargeCoS = revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.forecast_cost_of_sales) || 0), 0)
  const nonRechargeCoSActual = revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.actual_cost_of_sales) || 0), 0)
  const nonRechargeOtherOp = revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.forecast_other_op_costs) || 0), 0)
  const nonRechargeOtherOpActual = revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.actual_other_op_costs) || 0), 0)

  // Sum gross profit from non-recharge platforms
  const nonRechargeGP = revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.forecast_gross_profit) || 0), 0)
  const nonRechargeGPActual = revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.actual_gross_profit) || 0), 0)

  const totals = {
    // Cost of Sales: subtract recharge (money coming back)
    forecast_cost_of_sales: nonRechargeCoS - (parseFloat(rechargeData.forecast_cost_of_sales) || 0),
    actual_cost_of_sales: nonRechargeCoSActual - (parseFloat(rechargeData.actual_cost_of_sales) || 0),
    // Gross Profit: add recharge CoS (money recovered increases profit)
    forecast_gross_profit: nonRechargeGP + (parseFloat(rechargeData.forecast_cost_of_sales) || 0),
    actual_gross_profit: nonRechargeGPActual + (parseFloat(rechargeData.actual_cost_of_sales) || 0),
    // Other Op Costs: subtract recharge (money coming back)
    forecast_other_op_costs: nonRechargeOtherOp - (parseFloat(rechargeData.forecast_other_op_costs) || 0),
    actual_other_op_costs: nonRechargeOtherOpActual - (parseFloat(rechargeData.actual_other_op_costs) || 0),
    // Revenue: excludes recharge entirely (no revenue from cost center)
    forecast_revenue: revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.forecast_cost_of_sales) || 0) + (parseFloat(p.forecast_gross_profit) || 0), 0),
    actual_revenue: revenueGeneratingPlatforms.reduce((sum, [, p]: [string, any]) => sum + (parseFloat(p.actual_cost_of_sales) || 0) + (parseFloat(p.actual_gross_profit) || 0), 0),
  }

  return NextResponse.json({
    success: true,
    view: 'month',
    platforms: platformData,
    totals,
    selectedMonth,
    months: MONTHS_2026,
  })
}

// POST - update financial forecast for a platform
export async function POST(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const body = await request.json()
  const { platform, metric_month, ...fields } = body

  if (!platform || !PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { success: false, error: 'Valid platform is required' },
      { status: 400 }
    )
  }

  if (!metric_month || !MONTHS_2026.includes(metric_month)) {
    return NextResponse.json(
      { success: false, error: 'Valid month (2026-01 to 2026-12) is required' },
      { status: 400 }
    )
  }

  const updateData: Record<string, any> = {
    platform,
    metric_month,
    updated_at: new Date().toISOString(),
  }

  // Only include fields that are provided
  const allowedFields = ['forecast_cost_of_sales', 'forecast_gross_profit', 'forecast_other_op_costs', 'actual_cost_of_sales', 'actual_gross_profit', 'actual_other_op_costs', 'notes']
  allowedFields.forEach(field => {
    if (fields[field] !== undefined) {
      updateData[field] = fields[field]
    }
  })

  const { error } = await supabase
    .from('financial_forecast')
    .upsert(updateData, { onConflict: 'platform,metric_month' })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, month: metric_month })
}
