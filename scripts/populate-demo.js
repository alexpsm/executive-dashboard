const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function populateDemo() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Populating Demo Clients and Invoices...')

    // 1. Clients
    const clients = [
        { name: 'Matchroom Boxing', company: 'Matchroom', status: 'won', source: 'Direct' },
        { name: 'Queensberry Promotions', company: 'Queensberry', status: 'qualified', source: 'Referral' },
        { name: 'DAZN', company: 'DAZN', status: 'proposal', source: 'Website' }
    ]
    const { data: dbClients, error: cErr } = await supabase.from('clients').insert(clients).select()
    if (cErr) console.error('Client Error:', cErr.message)
    console.log(`Inserted ${dbClients?.length || 0} clients.`)

    // 2. Invoices
    if (dbClients) {
        const invoices = [
            {
                invoice_number: 'INV-2026-001',
                client_id: dbClients[0].id,
                amount: 15000,
                status: 'paid',
                issue_date: '2026-01-15',
                due_date: '2026-02-15'
            },
            {
                invoice_number: 'INV-2026-002',
                client_id: dbClients[1].id,
                amount: 8500,
                status: 'sent',
                issue_date: '2026-02-01',
                due_date: '2026-03-01'
            }
        ]
        const { error: invErr } = await supabase.from('invoices').upsert(invoices, { onConflict: 'invoice_number' })
        if (invErr) console.error('Invoice Error:', invErr.message)
        else console.log('Inserted demo invoices.')
    }
}

populateDemo()
