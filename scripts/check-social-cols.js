const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkSocialCols() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    // First ensure we have at least one row or just check empty
    const { data, error } = await supabase.from('social_metrics').select('*').limit(1)
    if (error) {
        console.log('Error:', error.message)
    } else {
        console.log('Columns:', Object.keys(data[0] || {}))
    }
}

checkSocialCols()
