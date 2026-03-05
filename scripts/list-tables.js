const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function listTables() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log('Listing visible tables...')

    // We can use a query to a table we know exists, or try to use Postgres catalog via RPC or just probe
    const knownTables = ['clients', 'deals', 'projects', 'invoices', 'social_metrics', 'roi_metrics', 'settings']

    for (const table of knownTables) {
        const { error } = await supabase.from(table).select('*').limit(1)
        console.log(`${table} Select: ${error ? 'FAIL (' + error.code + ')' : 'OK'}`)

        if (table === 'social_metrics') {
            const { error: uErr } = await supabase.from(table).upsert({ platform: 'youtube', metric_date: '2026-02-06', followers: 10 }).select()
            console.log(`${table} Upsert: ${uErr ? 'FAIL (' + uErr.code + ')' : 'OK'}`)
        }
    }
}

listTables()
