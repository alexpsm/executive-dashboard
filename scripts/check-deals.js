const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkDeals() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Checking deals...')
    const { data } = await supabase.from('deals').select('name, stage')
    console.log('Deals:', data)
}

checkDeals()
