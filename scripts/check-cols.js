const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkCols() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    const { data, error } = await supabase.from('deals').select('*').limit(1)
    if (error) console.log('Error:', error.message)
    else console.log('Deals Columns:', Object.keys(data[0] || {}))
}

checkCols()
