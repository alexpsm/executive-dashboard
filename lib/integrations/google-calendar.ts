import { google, calendar_v3 } from 'googleapis'

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  location?: string
  attendees?: string[]
  htmlLink?: string
}

class GoogleCalendarClient {
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
        privateKey: privateKey?.replace(/\\n/g, '\n'),
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

  private async getCalendar() {
    const { clientEmail, privateKey, senderEmail } = await this.getCredentials()

    if (!clientEmail || !privateKey) {
      throw new Error('Google Calendar credentials not configured in Settings')
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
      subject: senderEmail // Optional/dependent on setup
    })

    return google.calendar({ version: 'v3', auth })
  }

  async getEvents(params?: {
    timeMin?: string
    timeMax?: string
    maxResults?: number
    calendarId?: string
  }): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
    try {
      const calendar = await this.getCalendar()
      const calendarId = params?.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary'

      const now = new Date()
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const response = await calendar.events.list({
        calendarId,
        timeMin: params?.timeMin || now.toISOString(),
        timeMax: params?.timeMax || nextMonth.toISOString(),
        maxResults: params?.maxResults || 50,
        singleEvents: true,
        orderBy: 'startTime'
      })

      const events: CalendarEvent[] = (response.data.items || []).map((event: calendar_v3.Schema$Event) => ({
        id: event.id || '',
        summary: event.summary || 'Untitled',
        description: event.description || undefined,
        start: event.start?.dateTime || event.start?.date || '',
        end: event.end?.dateTime || event.end?.date || '',
        location: event.location || undefined,
        attendees: event.attendees?.map(a => a.email || '').filter(Boolean),
        htmlLink: event.htmlLink || undefined
      }))

      return { success: true, events }
    } catch (error: any) {
      console.error('Google Calendar getEvents error:', error.message)
      return { success: false, error: error.message }
    }
  }

  async listEvents(days = 7): Promise<{ success: boolean; events?: CalendarEvent[]; error?: string }> {
    return this.getEvents({
      timeMax: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  async createEvent(event: {
    summary: string
    description?: string
    startTime: string
    endTime: string
    location?: string
    attendees?: string[]
    calendarId?: string
  }): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> {
    try {
      const calendar = await this.getCalendar()
      const calendarId = event.calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary'

      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.startTime, timeZone: 'UTC' },
          end: { dateTime: event.endTime, timeZone: 'UTC' },
          location: event.location,
          attendees: event.attendees?.map(email => ({ email }))
        }
      })

      return {
        success: true,
        event: {
          id: response.data.id || '',
          summary: response.data.summary || '',
          start: response.data.start?.dateTime || '',
          end: response.data.end?.dateTime || '',
          htmlLink: response.data.htmlLink || undefined
        }
      }
    } catch (error: any) {
      console.error('Google Calendar createEvent error:', error.message)
      return { success: false, error: error.message }
    }
  }

  async deleteEvent(eventId: string, calendarId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const calendar = await this.getCalendar()
      await calendar.events.delete({
        calendarId: calendarId || process.env.GOOGLE_CALENDAR_ID || 'primary',
        eventId
      })
      return { success: true }
    } catch (error: any) {
      console.error('Google Calendar deleteEvent error:', error.message)
      return { success: false, error: error.message }
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const calendar = await this.getCalendar()
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary'

      await calendar.calendarList.get({ calendarId })
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const googleCalendarClient = new GoogleCalendarClient()
export type { CalendarEvent }
