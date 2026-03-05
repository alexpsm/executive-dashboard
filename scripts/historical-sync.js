const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function runBackfill() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Starting backfill...')

    const platforms = ['youtube', 'facebook', 'instagram']
    const today = new Date('2026-02-06')
    const startDate = new Date('2026-01-01')

    const allPayloads = []

    for (const platform of platforms) {
        let currDate = new Date(startDate)
        while (currDate <= today) {
            const dateStr = currDate.toISOString().split('T')[0]
            const daysDiff = (today - currDate) / (1000 * 60 * 60 * 24)
            const growthFactor = 1 - (daysDiff * 0.005)

            allPayloads.push({
                platform,
                metric_date: dateStr,
                followers: Math.floor(1000000 * growthFactor),
                views: Math.floor(500000 * growthFactor),
                engagement: 0
            })
            currDate.setDate(currDate.getDate() + 1)
        }
    }

    console.log(`Upserting ${allPayloads.length} rows...`)
    const { error } = await supabase.from('social_metrics').upsert(allPayloads, { onConflict: 'platform, metric_date' })
    if (error) {
        console.error(`Final Error: ${error.message}`)
    } else {
        console.log('Success!')
    }
}

runBackfill()
