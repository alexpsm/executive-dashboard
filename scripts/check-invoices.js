const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function checkInvoices() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    const { data } = await supabase.from('invoices').select('invoice_number, status, amount')
    console.log('Invoices:', data)
}

checkInvoices()
