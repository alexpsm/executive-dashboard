const { google } = require('googleapis')
const fs = require('fs')
const path = require('path')

const TOKEN_PATH = path.join(process.cwd(), '.google_tokens.json')

async function testGmail() {
    if (!fs.existsSync(TOKEN_PATH)) {
        console.log('No tokens found')
        return
    }

    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))

    const oauth2Client = new google.auth.OAuth2(
        '253708303699-10p52b9oqkjsp1cit9t2clm5vt38132v.apps.googleusercontent.com', // from .env.local
        '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'
    )

    oauth2Client.setCredentials(tokens)

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })

    try {
        console.log('Fetching user info...')
        const info = await oauth2.userinfo.get()
        console.log('User Email:', info.data.email)

        console.log('Fetching Gmail profile...')
        const profile = await gmail.users.getProfile({ userId: 'me' })
        console.log('Gmail Profile:', profile.data)

        console.log('Fetching messages...')
        const res = await gmail.users.messages.list({ userId: 'me', maxResults: 5 })
        console.log('Messages:', res.data)
    } catch (e) {
        console.error('ERROR DATA:', JSON.stringify(e.response?.data || e, null, 2))
    }
}

testGmail()
