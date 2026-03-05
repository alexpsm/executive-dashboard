import { google } from 'googleapis'

class GmailClient {
  private async getCredentials() {
    try {
      const { getServiceSupabase } = await import('@/lib/supabase/client')
      const supabase = getServiceSupabase()

      const { data } = await supabase.from('settings').select('*').in('key', ['google_client_email', 'google_private_key', 'gmail_sender_email'])

      let clientEmail = process.env.GOOGLE_CLIENT_EMAIL
      let privateKey = process.env.GOOGLE_PRIVATE_KEY
      let senderEmail = process.env.GMAIL_SENDER_EMAIL

      if (data) {
        const emailSetting = data.find(s => s.key === 'google_client_email')
        const keySetting = data.find(s => s.key === 'google_private_key')
        const senderSetting = data.find(s => s.key === 'gmail_sender_email')

        if (emailSetting?.value) clientEmail = emailSetting.value
        if (keySetting?.value) privateKey = keySetting.value
        if (senderSetting?.value) senderEmail = senderSetting.value
      }

      return {
        clientEmail,
        privateKey: privateKey?.replace(/\\n/g, '\n'), // Ensure newlines are handled
        senderEmail
      }
    } catch (e) {
      return {
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        privateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        senderEmail: process.env.GMAIL_SENDER_EMAIL
      }
    }
  }

  private async getAuth() {
    const { clientEmail, privateKey, senderEmail } = await this.getCredentials()

    if (!clientEmail || !privateKey) {
      throw new Error('Google credentials not configured in Settings')
    }

    // For Gmail, we need to impersonate a user if using domain-wide delegation
    // Or use the service account's own email if it has Gmail access
    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly'
      ],
      subject: senderEmail // This impersonates the sender email
    })
  }

  private async getGmail() {
    const auth = await this.getAuth()
    return google.gmail({ version: 'v1', auth })
  }

  async sendEmail(params: {
    to: string
    subject: string
    body: string
    isHtml?: boolean
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const gmail = await this.getGmail()
      const raw = createMimeMessage(params.to, params.subject, params.body, params.isHtml ?? true)

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw }
      })

      return { success: true, messageId: response.data.id || undefined }
    } catch (error: any) {
      console.error('Gmail sendEmail error:', error.message)
      if (error.message.includes('invalid_grant')) {
        return {
          success: false,
          error: 'Gmail authentication failed. Make sure domain-wide delegation is configured.'
        }
      }
      return { success: false, error: error.message }
    }
  }

  async listEmails(params?: {
    maxResults?: number
    query?: string
  }): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      const gmail = await this.getGmail()

      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: params?.maxResults || 10,
        q: params?.query
      })

      const messages = response.data.messages || []

      // Get full message details
      const fullMessages = await Promise.all(
        messages.slice(0, 10).map(async (msg) => {
          const detail = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'Subject', 'Date']
          })

          const headers = detail.data.payload?.headers || []
          return {
            id: msg.id,
            snippet: detail.data.snippet,
            from: headers.find(h => h.name === 'From')?.value,
            subject: headers.find(h => h.name === 'Subject')?.value,
            date: headers.find(h => h.name === 'Date')?.value
          }
        })
      )

      return { success: true, messages: fullMessages }
    } catch (error: any) {
      console.error('Gmail listEmails error:', error.message)
      return { success: false, error: error.message }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const gmail = await this.getGmail()
      await gmail.users.getProfile({ userId: 'me' })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}


function createMimeMessage(to: string, subject: string, body: string, isHtml = true): string {
  const boundary = 'boundary_' + Date.now()
  const mimeType = isHtml ? 'text/html' : 'text/plain'

  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: ${mimeType}; charset=utf-8`,
    '',
    body
  ].join('\r\n')

  // Base64url encode
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}


// Helper function to create HTML email body
export function createEmailBody(params: {
  greeting: string
  body: string
  signature?: string
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <p>${params.greeting}</p>
      <div style="margin: 20px 0;">
        ${params.body}
      </div>
      ${params.signature ? `<p style="margin-top: 30px;">${params.signature}</p>` : ''}
    </div>
  `
}
