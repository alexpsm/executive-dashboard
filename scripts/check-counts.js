const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkMore() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    const { count: roi } = await supabase.from('roi_metrics').select('*', { count: 'exact', head: true })
    const { count: clients } = await supabase.from('clients').select('*', { count: 'exact', head: true })
    const { count: invoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true })

    console.log(`COUNTS|ROI:${roi}|C:${clients}|I:${invoices}`)
}

checkMore()
