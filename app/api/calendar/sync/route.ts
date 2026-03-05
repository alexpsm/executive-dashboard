import { NextResponse } from 'next/server'
import { googleCalendarClient } from '@/lib/integrations/google-calendar'
import { getServiceSupabase } from '@/lib/supabase/client'

export async function POST() {
  try {
    const supabase = getServiceSupabase()
    
    // Get events from Google Calendar
    const now = new Date()
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    const result = await googleCalendarClient.getEvents({
      timeMin: now.toISOString(),
      timeMax: nextMonth.toISOString(),
      maxResults: 50
    })
    
    if (!result.success || !result.events) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to fetch calendar events'
      }, { status: 400 })
    }

    let synced = 0
    let errors = 0

    for (const event of result.events) {
      try {
        // Check if event exists
        const { data: existing } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_event_id', event.id)
          .single()

        const eventData = {
          google_event_id: event.id,
          title: event.summary,
          description: event.description || null,
          start_time: event.start,
          end_time: event.end,
          location: event.location || null,
          attendees: event.attendees || []
        }

        if (existing) {
          await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', existing.id)
        } else {
          await supabase
            .from('calendar_events')
            .insert(eventData)
        }

        synced++
      } catch (err) {
        console.error(`Error syncing event ${event.id}:`, err)
        errors++
      }
    }

    // Log the sync
    await supabase.from('automation_logs').insert({
      action_type: 'calendar_sync',
      details: `Synced ${synced} events, ${errors} errors`,
      success: errors === 0
    })

    // Update ROI metrics
    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('roi_metrics')
      .select('*')
      .eq('metric_date', today)
      .single()

    if (existing) {
      await supabase
        .from('roi_metrics')
        .update({
          events_synced: (existing.events_synced || 0) + synced,
          time_saved_hours: (existing.time_saved_hours || 0) + (synced * 0.02)
        })
        .eq('metric_date', today)
    } else {
      await supabase.from('roi_metrics').insert({
        metric_date: today,
        events_synced: synced,
        time_saved_hours: synced * 0.02
      })
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      message: `Synced ${synced} events from Google Calendar`
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
