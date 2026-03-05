import { google } from 'googleapis'

// OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const REDIRECT_URI = APP_URL.replace(/\/$/, '') + '/api/auth/google/callback'

console.log('[Google OAuth] Configured Redirect URI:', REDIRECT_URI)

import fs from 'fs'
import path from 'path'

// Token storage (persisted to file)
const TOKEN_PATH = path.join(process.cwd(), '.google_tokens.json')

let storedTokens: {
    access_token: string
    refresh_token: string
    expiry_date: number
} | null = null

export function getOAuth2Client() {
    return new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    )
}

export function getAuthUrl() {
    const oauth2Client = getOAuth2Client()

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'select_account consent',
        scope: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email'
        ]
    })
}

export function setTokens(tokens: any) {
    storedTokens = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date || Date.now() + 3600000
    }
    try {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(storedTokens, null, 2))
    } catch (e) {
        console.error('Failed to save tokens:', e)
    }
}

export function getTokens() {
    if (!storedTokens) {
        try {
            if (fs.existsSync(TOKEN_PATH)) {
                const data = fs.readFileSync(TOKEN_PATH, 'utf-8')
                storedTokens = JSON.parse(data)
            }
        } catch (e) {
            console.error('Failed to load tokens:', e)
        }
    }
    return storedTokens
}

export function clearTokens() {
    storedTokens = null
    try {
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH)
        }
    } catch (e) {
        console.error('Failed to clear tokens:', e)
    }
}

export async function getAuthenticatedGmail() {
    const tokens = getTokens()

    if (!tokens) {
        return null
    }

    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials(tokens)

    // Check if token is expired and refresh if needed
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        try {
            const { credentials } = await oauth2Client.refreshAccessToken()
            setTokens(credentials)
            oauth2Client.setCredentials(credentials)
        } catch (error) {
            console.error('Failed to refresh token:', error)
            clearTokens()
            return null
        }
    }

    return google.gmail({ version: 'v1', auth: oauth2Client })
}

// Helper to extract body from message payload
function getBody(payload: any): string {
    if (!payload) return ''

    let body = ''

    // If there's a body directly
    if (payload.body && payload.body.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8')
    }

    // Checking parts
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === 'text/plain') {
                if (part.body && part.body.data) {
                    body = Buffer.from(part.body.data, 'base64').toString('utf-8')
                    break;
                }
            } else if (part.mimeType === 'text/html') {
                // If we haven't found plain text, take HTML (but prefer plain)
                if (!body && part.body && part.body.data) {
                    body = Buffer.from(part.body.data, 'base64').toString('utf-8')
                }
            } else if (part.parts) {
                // Recursive check for nested parts
                const nestedBody = getBody(part)
                if (nestedBody) {
                    body = nestedBody
                    break;
                }
            }
        }
    }

    return body
}

export async function listEmailsOAuth(maxResults = 20, includeBody = false) {
    const gmail = await getAuthenticatedGmail()

    if (!gmail) {
        return { success: false, error: 'Not authenticated. Please sign in with Google.' }
    }

    try {
        const response = await gmail.users.messages.list({
            userId: 'me',
            maxResults
        })

        const messages = response.data.messages || []

        // Get full message details
        const fullMessages = await Promise.all(
            messages.slice(0, maxResults).map(async (msg) => {
                const detail = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id!,
                    format: includeBody ? 'full' : 'metadata',
                    metadataHeaders: includeBody ? undefined : ['From', 'Subject', 'Date']
                })

                const headers = detail.data.payload?.headers || []

                let body = ''
                if (includeBody) {
                    body = getBody(detail.data.payload)
                }

                return {
                    id: msg.id,
                    from: headers.find(h => h.name === 'From')?.value || '',
                    subject: headers.find(h => h.name === 'Subject')?.value || '',
                    date: headers.find(h => h.name === 'Date')?.value || '',
                    snippet: detail.data.snippet,
                    body: body || detail.data.snippet // Fallback to snippet if body extraction fails
                }
            })
        )

        return { success: true, messages: fullMessages }
    } catch (error: any) {
        console.error('Gmail listEmails error full:', JSON.stringify(error.response?.data || error, null, 2))
        if (error.message.includes('invalid_grant')) {
            clearTokens()
            return { success: false, error: 'Session expired. Please sign in again.' }
        }
        return { success: false, error: error.message }
    }
}

export async function sendEmailOAuth(to: string, subject: string, body: string) {
    const gmail = await getAuthenticatedGmail()

    if (!gmail) {
        return { success: false, error: 'Not authenticated. Please sign in with Google.' }
    }

    try {
        const message = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            body
        ].join('\r\n')

        const raw = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')

        const response = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw }
        })

        return { success: true, messageId: response.data.id }
    } catch (error: any) {
        console.error('Gmail sendEmail error:', error.message)
        return { success: false, error: error.message }
    }
}
