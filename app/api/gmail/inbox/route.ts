import { NextResponse } from 'next/server'
import { listEmailsOAuth, getTokens } from '@/lib/integrations/gmail-oauth'

export async function GET() {
    try {
        const tokens = getTokens()

        if (!tokens) {
            return NextResponse.json({
                success: false,
                authenticated: false,
                error: 'Not authenticated. Please sign in with Google.'
            }, { status: 401 })
        }

        const result = await listEmailsOAuth(20)

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error || 'Failed to fetch emails'
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            authenticated: true,
            messages: result.messages || [],
            count: result.messages?.length || 0
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
