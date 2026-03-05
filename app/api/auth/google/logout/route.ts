import { NextResponse } from 'next/server'
import { clearTokens } from '@/lib/integrations/gmail-oauth'

export async function POST() {
    clearTokens()
    return NextResponse.json({ success: true })
}
