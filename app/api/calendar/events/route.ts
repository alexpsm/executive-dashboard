import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { googleCalendarClient } from '@/lib/integrations/google-calendar'

export async function GET() {
  try {
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .order('start_time', { ascending: true })
      .limit(100)

    if (error) throw error

    return NextResponse.json({
      success: true,
      events: events || []
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 })
    }

    // First fetch the event to get google_event_id
    const { data: event } = await supabase
      .from('calendar_events')
      .select('google_event_id')
      .eq('id', id)
      .single()

    // If it has a Google Event ID, delete it from Google Calendar
    if (event?.google_event_id) {
      await googleCalendarClient.deleteEvent(event.google_event_id)
    }

    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}