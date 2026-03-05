const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testROI() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Testing ROI...')
    const { error } = await supabase.from('roi_metrics').upsert({
        metric_date: '2026-02-06',
        time_saved_hours: 5
    }, { onConflict: 'metric_date' })

    if (error) console.log('ROI Error:', error.message)
    else console.log('ROI OK')
}

testROI()
