const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function inspectDB() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('--- Database Inspection ---')

    const { count: socialCount, error: socialErr } = await supabase.from('social_metrics').select('*', { count: 'exact', head: true })
    console.log(`Social Metrics Count: ${socialCount}`)
    if (socialErr) console.error('Social Error:', socialErr.message)

    const { count: dealsCount, error: dealsErr } = await supabase.from('deals').select('*', { count: 'exact', head: true })
    console.log(`Deals Count: ${dealsCount}`)
    if (dealsErr) console.error('Deals Error:', dealsErr.message)

    const { data: latestSocial, error: lErr } = await supabase.from('social_metrics').select('*').limit(1)
    console.log('Latest Social Sample:', latestSocial)
    if (lErr) console.error('Latest Social Error:', lErr.message)

    const { data: settings } = await supabase.from('settings').select('*')
    console.log('Settings Keys:', settings?.map(s => s.key))
}

inspectDB()
