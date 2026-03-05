import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/client'

export async function GET() {
    try {
        const supabase = getServiceSupabase()
        const { data, error } = await supabase
            .from('settings')
            .select('*')

        if (error) throw error

        // Convert array to object for easier frontend consumption
        const settings: Record<string, string> = {}
        data.forEach(item => {
            settings[item.key] = item.value || ''
        })

        return NextResponse.json({ success: true, settings })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { settings } = body
        const supabase = getServiceSupabase()

        // Upsert each setting
        for (const [key, value] of Object.entries(settings)) {
            const { error } = await supabase
                .from('settings')
                .upsert({
                    key,
                    value: value as string,
                    updated_at: new Date().toISOString()
                })

            if (error) {
                console.error(`Error saving setting ${key}:`, error)
                throw new Error(`Failed to save setting ${key}: ${error.message}`)
            }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
