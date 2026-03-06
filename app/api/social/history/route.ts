import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Generate all dates in a range
function generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
    }

    return dates
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get('days') || '30')

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const endDate = new Date().toISOString().split('T')[0]
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        // Get daily metrics for the specified period
        // Each row is one day's data for a platform
        const { data, error } = await supabase
            .from('social_metrics')
            .select('*')
            .in('platform', ['youtube', 'instagram', 'facebook', 'tiktok'])
            .gte('metric_date', startDate)
            .lte('metric_date', endDate)
            .order('metric_date', { ascending: true })

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        // Generate all dates in the range
        const allDates = generateDateRange(startDate, endDate)

        // Create a map with all dates initialized
        const byDate = new Map<string, any>()
        for (const date of allDates) {
            byDate.set(date, { date, youtube: null, instagram: null, facebook: null, tiktok: null })
        }

        // Fill in actual data where available
        for (const row of data || []) {
            const date = row.metric_date
            if (byDate.has(date)) {
                byDate.get(date)[row.platform] = row
            }
        }

        // Calculate totals for the period
        const totals = {
            youtube: { views: 0, followers: 0, revenue: 0 },
            instagram: { followers: 0, reach: 0 },
            facebook: { views: 0, followers: 0 },
            tiktok: { followers: 0 }
        }

        for (const row of data || []) {
            const platform = row.platform as keyof typeof totals
            if (totals[platform]) {
                if ('views' in totals[platform]) {
                    (totals[platform] as any).views += row.views || 0
                }
                if ('followers' in totals[platform]) {
                    (totals[platform] as any).followers += row.followers || 0
                }
                if ('revenue' in totals[platform]) {
                    (totals[platform] as any).revenue += row.yt_ad_revenue || 0
                }
                if ('reach' in totals[platform]) {
                    (totals[platform] as any).reach += row.reach || 0
                }
            }
        }

        return NextResponse.json({
            success: true,
            days,
            startDate,
            endDate: new Date().toISOString().split('T')[0],
            totals,
            daily: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
        })

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
