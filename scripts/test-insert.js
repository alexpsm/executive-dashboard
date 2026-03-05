const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testInsert() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Testing insert into social_metrics...')

    const payload = {
        platform: 'youtube',
        metric_date: '2026-02-06',
        followers: 1200000,
        views: 600000,
        reach: 20000,
        engagement: 0.08
    }

    const { data, error } = await supabase.from('social_metrics').upsert(payload, { onConflict: 'platform, metric_date' }).select()

    if (error) {
        console.error('Insert Error:', error)
    } else {
        console.log('Insert Success:', data)
    }
}

testInsert()
