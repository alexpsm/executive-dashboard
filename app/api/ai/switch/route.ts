import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { provider } = body

        if (!provider || !['ollama', 'openai'].includes(provider)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid provider. Must be "ollama" or "openai"'
            }, { status: 400 })
        }

        const supabase = getServiceSupabase()

        const { error } = await supabase
            .from('settings')
            .upsert({
                key: 'ai_provider',
                value: provider,
                updated_at: new Date().toISOString()
            })

        if (error) throw error

        return NextResponse.json({
            success: true,
            message: `AI provider switched to ${provider}`
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
