const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkConstraints() {
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "SELECT conname FROM pg_constraint WHERE conrelid = 'deals'::regclass;"
    })
    console.log('Constraints:', data || error)
}

// Since I might not have RPC 'execute_sql', I'll try to just catch the error and see the detail
async function probe() {
    // Try to insert two rows with same name but different external_id
    const name = "Test Deal " + Date.now()
    const { error: e1 } = await supabase.from('deals').insert({ name, external_id: 'test1' })
    const { error: e2 } = await supabase.from('deals').insert({ name, external_id: 'test2' })

    console.log('Insert 1:', e1)
    console.log('Insert 2 (duplicate name):', e2)
}

probe()
