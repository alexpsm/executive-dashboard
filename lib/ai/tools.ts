import { createClient } from '@supabase/supabase-js'
import { mondayClient } from '../integrations/monday'
import { googleCalendarClient } from '../integrations/google-calendar'
import { clickupClient } from '../integrations/clickup'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const toolHandlers: Record<string, Function> = {
    get_clients: async (args: any) => {
        let query = supabase.from('clients').select('*')
        if (args.status && args.status !== 'all') {
            query = query.eq('status', args.status)
        }
        const { data, error } = await query
        return error ? { error: error.message } : data
    },

    get_deals: async (args: any) => {
        let query = supabase.from('deals').select('*')
        if (args.stage && args.stage !== 'all') {
            query = query.eq('stage', args.stage)
        }
        const { data, error } = await query
        return error ? { error: error.message } : data
    },

    create_deal: async (args: any) => {
        const { data, error } = await supabase.from('deals').insert({
            name: args.name,
            deal_value: args.deal_value || 0,
            stage: args.stage || 'Lead',
            probability: args.probability || 0,
            platform: args.platform || 'General',
            source: 'ai_assistant'
        }).select().single()
        return error ? { error: error.message } : { success: true, deal: data }
    },

    get_dashboard_stats: async () => {
        const { data, error } = await supabase.from('dashboard_stats').select('*').single()
        return error ? { error: error.message } : data
    },

    get_social_metrics: async (args: any) => {
        const platform = args.platform?.toLowerCase()
        let query = supabase.from('social_metrics').select('*').order('metric_date', { ascending: false }).limit(20)
        if (platform && platform !== 'all') {
            query = query.eq('platform', platform)
        }
        const { data, error } = await query
        return error ? { error: error.message } : data
    },

    sync_monday_deals: async () => {
        const result = await mondayClient.getDeals()
        if (!result.success || !result.deals) return { error: result.error }

        let synced = 0
        for (const deal of result.deals) {
            const { error } = await supabase.from('deals').upsert({
                external_id: deal.external_id,
                name: deal.name,
                stage: deal.stage,
                deal_value: deal.deal_value,
                probability: deal.probability,
                platform: deal.platform,
                source: 'monday'
            }, { onConflict: 'external_id' })
            if (!error) synced++
        }
        return { success: true, synced }
    },

    get_calendar_events: async (args: any) => {
        const days = args.days || 7
        const result = await googleCalendarClient.listEvents(days)
        return result.success ? result.events : { error: result.error }
    },

    get_clickup_tasks: async () => {
        const result = await clickupClient.getTasks()
        return result.success ? result.tasks : { error: result.error }
    },

    update_manual_metric: async (args: any) => {
        const { platform, date, metric, value } = args
        // For manual metrics like HypeAuditor, we can store them in social_metrics or a new table
        // The user mentioned HypeAuditor and running costs.
        // Let's use social_metrics for platform-specific and roi_metrics for running costs.

        if (metric === 'running_costs') {
            const { error } = await supabase.from('roi_metrics').upsert({
                metric_date: date || new Date().toISOString().split('T')[0],
                time_saved_hours: value // Or we could add a new column 'running_costs'
            }, { onConflict: 'metric_date' })
            return error ? { error: error.message } : { success: true }
        }

        // Default to social_metrics
        const { error } = await supabase.from('social_metrics').upsert({
            platform: platform || 'internal',
            metric_date: date || new Date().toISOString().split('T')[0],
            [metric]: value
        }, { onConflict: 'platform, metric_date' })

        return error ? { error: error.message } : { success: true }
    }
}
