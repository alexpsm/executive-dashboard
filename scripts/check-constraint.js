const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkConstraint() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    // Try to insert 'tiktok' and see the error detail
    const { error } = await supabase.from('social_metrics').insert({ platform: 'tiktok', metric_date: '2026-02-06' })
    console.log('Error Detail:', error)
}

checkConstraint()
