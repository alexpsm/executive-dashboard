import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

// Backfill Instagram daily metrics for historical dates
// Instagram API only keeps ~30 days, so older data must be manually entered
// or fetched from known totals and distributed across days

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await request.json()
    const {
      month,           // e.g., "2026-01" or "2026-02"
      followers_total, // Total followers gained in the month
      reach_total,     // Total reach for the month (optional)
      impressions_total // Total impressions for the month (optional)
    } = body

    if (!month || followers_total === undefined) {
      return NextResponse.json({
        error: 'Required: month (YYYY-MM), followers_total',
        example: {
          month: '2026-01',
          followers_total: 500,
          reach_total: 50000,
          impressions_total: 100000
        }
      }, { status: 400 })
    }

    // Parse month
    const [year, monthNum] = month.split('-').map(Number)
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 })
    }

    // Calculate days in month
    const startDate = new Date(year, monthNum - 1, 1)
    const endDate = new Date(year, monthNum, 0) // Last day of month
    const daysInMonth = endDate.getDate()

    // Distribute totals evenly across days
    const dailyFollowers = Math.round(followers_total / daysInMonth)
    const dailyReach = reach_total ? Math.round(reach_total / daysInMonth) : 0
    const dailyImpressions = impressions_total ? Math.round(impressions_total / daysInMonth) : 0

    // Calculate remainder to add to last day (for accurate totals)
    const followersRemainder = followers_total - (dailyFollowers * daysInMonth)
    const reachRemainder = reach_total ? reach_total - (dailyReach * daysInMonth) : 0
    const impressionsRemainder = impressions_total ? impressions_total - (dailyImpressions * daysInMonth) : 0

    console.log(`Instagram Backfill: ${month} - ${daysInMonth} days`)
    console.log(`Daily: ${dailyFollowers} followers, ${dailyReach} reach, ${dailyImpressions} impressions`)

    const savedDays: string[] = []

    // Insert each day
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      // Add remainder to last day
      const isLastDay = day === daysInMonth
      const followers = dailyFollowers + (isLastDay ? followersRemainder : 0)
      const reach = dailyReach + (isLastDay ? reachRemainder : 0)
      const impressions = dailyImpressions + (isLastDay ? impressionsRemainder : 0)

      const { error } = await supabase
        .from('social_metrics')
        .upsert({
          platform: 'instagram',
          metric_date: date,
          followers,
          reach,
          impressions,
          api_source: 'manual'
        }, { onConflict: 'platform,metric_date' })

      if (error) {
        console.error(`Error saving ${date}:`, error.message)
      } else {
        savedDays.push(date)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Backfilled ${savedDays.length} days for Instagram ${month}`,
      month,
      daysInMonth,
      totals: {
        followers: followers_total,
        reach: reach_total || 0,
        impressions: impressions_total || 0
      },
      dailyAverage: {
        followers: dailyFollowers,
        reach: dailyReach,
        impressions: dailyImpressions
      },
      savedDays: savedDays.length
    })

  } catch (error: any) {
    console.error('Instagram backfill error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// GET shows usage info
export async function GET() {
  return NextResponse.json({
    info: 'POST to backfill historical Instagram daily metrics',
    usage: {
      method: 'POST',
      body: {
        month: 'YYYY-MM format (e.g., 2026-01)',
        followers_total: 'Total followers gained in the month',
        reach_total: '(Optional) Total reach for the month',
        impressions_total: '(Optional) Total impressions for the month'
      }
    },
    examples: [
      { month: '2026-01', followers_total: 500, reach_total: 50000, impressions_total: 100000 },
      { month: '2026-02', followers_total: 600, reach_total: 60000, impressions_total: 120000 }
    ],
    notes: [
      'Totals are distributed evenly across days in the month',
      'Remainder is added to the last day to ensure exact totals',
      'Existing data will be overwritten for that month',
      'api_source is set to "manual" to distinguish from API data'
    ]
  })
}
