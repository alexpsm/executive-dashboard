import { NextRequest, NextResponse } from 'next/server'
import { getOAuth2Client, setTokens } from '@/lib/integrations/gmail-oauth'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const code = searchParams.get('code')
        const error = searchParams.get('error')

        if (error) {
            return NextResponse.redirect(new URL('/email?error=' + error, request.url))
        }

        if (!code) {
            return NextResponse.redirect(new URL('/email?error=no_code', request.url))
        }

        const oauth2Client = getOAuth2Client()
        const { tokens } = await oauth2Client.getToken(code)

        setTokens(tokens)

        // Redirect back to email page
        return NextResponse.redirect(new URL('/email?success=true', request.url))
    } catch (error: any) {
        console.error('OAuth callback error:', error)
        return NextResponse.redirect(new URL('/email?error=' + encodeURIComponent(error.message), request.url))
    }
}
