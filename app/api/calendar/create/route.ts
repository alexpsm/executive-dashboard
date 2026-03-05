import { NextResponse } from 'next/server'
import { googleCalendarClient } from '@/lib/integrations/google-calendar'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { summary, description, start_time, end_time, location, attendees } = body

        if (!summary || !start_time || !end_time) {
            return NextResponse.json(
                { success: false, error: 'Summary, Start Time, and End Time are required' },
                { status: 400 }
            )
        }

        const result = await googleCalendarClient.createEvent({
            summary,
            description,
            startTime: new Date(start_time).toISOString(),
            endTime: new Date(end_time).toISOString(),
            location,
            attendees
        })

        if (result.success) {
            return NextResponse.json({ success: true, event: result.event })
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
