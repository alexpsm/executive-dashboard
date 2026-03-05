const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function runNow() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Inserting test row...')
    const { error: iErr } = await supabase.from('social_metrics').insert({
        platform: 'facebook',
        metric_date: '2026-01-01',
        followers: 123
    })
    if (iErr) console.log('Insert Fail:', iErr.message)
    else console.log('Insert OK')

    const { count } = await supabase.from('social_metrics').select('*', { count: 'exact', head: true })
    console.log('TOTAL_COUNT: ' + count)
}

runNow()
