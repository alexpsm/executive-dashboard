import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/client'
import { ollamaClient } from '@/lib/ai/ollama'
import { openaiClient } from '@/lib/ai/openai'

export async function GET() {
    try {
        const serviceSupabase = getServiceSupabase()

        // Check DB settings
        const { data: dbSettings, error: dbError } = await serviceSupabase
            .from('settings')
            .select('*')

        const config: Record<string, string> = {}
        dbSettings?.forEach((s: any) => config[s.key] = s.value)

        const provider = config['ai_provider'] || process.env.AI_PROVIDER || 'ollama'
        const hasOpenAIKey = !!(config['openai_api_key'] || process.env.OPENAI_API_KEY)

        // Test connections
        let ollamaStatus: any = { success: false, error: 'Not tested' }
        let openaiStatus: any = { success: false, error: 'Not tested' }

        try {
            ollamaStatus = await ollamaClient.testConnection()
        } catch (e: any) {
            ollamaStatus = { success: false, error: e.message }
        }

        if (hasOpenAIKey) {
            const key = config['openai_api_key'] || process.env.OPENAI_API_KEY || ''
            try {
                openaiStatus = await openaiClient.testConnection(key)
            } catch (e: any) {
                openaiStatus = { success: false, error: e.message }
            }
        }

        return NextResponse.json({
            success: true,
            debug: {
                configuredProvider: provider,
                hasOpenAIKey,
                envProvider: process.env.AI_PROVIDER,
                dbProvider: config['ai_provider'],
                ollamaStatus,
                openaiStatus,
                dbSettingsKeys: Object.keys(config)
            }
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
