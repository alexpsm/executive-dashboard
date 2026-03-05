const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function fixDeals() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Fixing deal stages...')
    const { error } = await supabase.from('deals').update({ stage: 'Won' }).neq('stage', 'Won')
    if (error) console.error(error.message)
    else console.log('Fixed deals.')
}

fixDeals()
