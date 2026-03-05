import { NextResponse } from 'next/server'
import { getAuthUrl, getTokens } from '@/lib/integrations/gmail-oauth'

export async function GET() {
    try {
        const tokens = getTokens()

        if (tokens) {
            return NextResponse.json({
                success: true,
                authenticated: true
            })
        }

        const authUrl = getAuthUrl()

        return NextResponse.json({
            success: true,
            authenticated: false,
            authUrl
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 })
    }
}
