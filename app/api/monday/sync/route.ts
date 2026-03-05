import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mondayClient } from '@/lib/integrations/monday'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST() {
    try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. Fetch from Monday
        const result = await mondayClient.getDeals()
        if (!result.success || !result.deals) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }

        const deals = result.deals
        let syncedCount = 0
        const errors = []

        // 2. Upsert into Supabase
        for (const deal of deals) {
            const { error } = await supabase
                .from('deals')
                .upsert({
                    external_id: deal.external_id,
                    name: deal.name,
                    stage: deal.stage,
                    deal_value: deal.deal_value,
                    probability: deal.probability,
                    platform: deal.platform,
                    due_date: deal.due_date,
                    source: 'monday',
                    notes: `Board: ${deal.board_name}${deal.group_name ? ` | Group: ${deal.group_name}` : ''}`
                }, { onConflict: 'external_id' })

            if (!error) syncedCount++
            else errors.push({ id: deal.external_id, err: error.message })
        }

        return NextResponse.json({
            success: true,
            synced: syncedCount,
            total: deals.length,
            errors: errors.slice(0, 5) // Return first 5 errors
        })

    } catch (error: any) {
        console.error('Monday Sync API Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
