'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { RefreshCw, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, Users, Plus, X, Trash2, List } from 'lucide-react'
import { formatDate, formatTime } from '@/lib/utils'

interface CalendarEvent {
    id: string
    title: string
    description: string | null
    start_time: string
    end_time: string
    location: string | null
    attendees: string[]
    google_event_id: string | null
}

export default function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [currentDate, setCurrentDate] = useState(new Date())

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showManageEventsModal, setShowManageEventsModal] = useState(false)
    const [createForm, setCreateForm] = useState({
        summary: '',
        description: '',
        start_time: '',
        end_time: '',
        location: ''
    })
    const [creating, setCreating] = useState(false)

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/calendar/events')
            const data = await res.json()
            if (data.events) setEvents(data.events)
        } catch (error) {
            console.error('Error fetching events:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEvents()
        const interval = setInterval(fetchEvents, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleSync = async () => {
        setSyncing(true)
        try {
            await fetch('/api/calendar/sync', { method: 'POST' })
            await fetchEvents()
        } catch (error) {
            console.error('Sync error:', error)
        } finally {
            setSyncing(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const res = await fetch('/api/calendar/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(createForm)
            })
            const data = await res.json()

            if (data.success) {
                alert('Event created in Google Calendar! Syncing now...')
                setShowCreateModal(false)
                setCreateForm({
                    summary: '',
                    description: '',
                    start_time: '',
                    end_time: '',
                    location: ''
                })
                await handleSync()
            } else {
                alert('Error creating event: ' + data.error)
            }
        } catch (error) {
            console.error('Create error:', error)
            alert('Failed to create event')
        } finally {
            setCreating(false)
        }
    }


    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return
        try {
            const res = await fetch(`/api/calendar/events?id=${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                setEvents(events.filter(e => e.id !== id))
            } else {
                const data = await res.json()
                alert('Failed to delete event: ' + (data.error || 'Unknown error'))
            }
        } catch (error) {
            console.error('Delete event error:', error)
            alert('Failed to delete event')
        }
    }

    // Get days in current month
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDay = firstDay.getDay()
        return { daysInMonth, startingDay }
    }

    const { daysInMonth, startingDay } = getDaysInMonth(currentDate)
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))

    // Get events for a specific day
    const getEventsForDay = (day: number) => {
        return events.filter(event => {
            const eventDate = new Date(event.start_time)
            return eventDate.getDate() === day &&
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()
        })
    }

    // Upcoming events (next 7 days)
    const upcomingEvents = events.filter(event => {
        const eventDate = new Date(event.start_time)
        const now = new Date()
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        return eventDate >= now && eventDate <= weekFromNow
    }).slice(0, 5)

    const today = new Date()
    const isToday = (day: number) => {
        return day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-cream-100">
                <Header onSync={handleSync} syncing={syncing} />
                <div className="flex items-center justify-center h-96">
                    <RefreshCw className="w-8 h-8 animate-spin text-gold-500" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-cream-100">
            <Header onSync={handleSync} syncing={syncing} />

            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-navy-900">Calendar</h1>
                        <p className="text-gray-500 mt-1">Your schedule synced from Google Calendar</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowManageEventsModal(true)}
                            className="bg-white text-navy-900 border border-cream-300 hover:bg-cream-50 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
                        >
                            <List className="w-4 h-4" />
                            Manage Events
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Event
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calendar Grid */}
                    <div className="lg:col-span-2 card-premium">
                        {/* Month Navigation */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={prevMonth}
                                className="p-2 hover:bg-cream-200 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-semibold text-navy-900">{monthName}</h2>
                            <button
                                onClick={nextMonth}
                                className="p-2 hover:bg-cream-200 rounded-lg transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Days of Week */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Empty cells for days before month starts */}
                            {Array.from({ length: startingDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="min-h-24 p-2 bg-cream-50 rounded-lg" />
                            ))}

                            {/* Days of the month */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const dayEvents = getEventsForDay(day)

                                return (
                                    <div
                                        key={day}
                                        className={`min-h-24 p-2 rounded-lg transition-colors ${isToday(day)
                                            ? 'bg-gold-100 border-2 border-gold-500'
                                            : 'bg-cream-50 hover:bg-cream-100'
                                            }`}
                                    >
                                        <span className={`text-sm font-medium ${isToday(day) ? 'text-gold-700' : 'text-navy-900'}`}>
                                            {day}
                                        </span>
                                        <div className="mt-1 space-y-1">
                                            {dayEvents.slice(0, 2).map(event => (
                                                <div
                                                    key={event.id}
                                                    className="text-xs bg-gold-500 text-navy-900 px-1 py-0.5 rounded truncate"
                                                    title={event.title}
                                                >
                                                    {event.title}
                                                </div>
                                            ))}
                                            {dayEvents.length > 2 && (
                                                <span className="text-xs text-gray-500">+{dayEvents.length - 2} more</span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Upcoming Events Sidebar */}
                    <div className="card-premium">
                        <h3 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-gold-500" />
                            Upcoming Events
                        </h3>

                        <div className="space-y-4">
                            {upcomingEvents.map(event => (
                                <div key={event.id} className="p-4 bg-cream-50 rounded-xl">
                                    <h4 className="font-medium text-navy-900">{event.title}</h4>

                                    <div className="mt-2 space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatDate(event.start_time)} at {formatTime(event.start_time)}</span>
                                        </div>

                                        {event.location && (
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <MapPin className="w-4 h-4" />
                                                <span className="truncate">{event.location}</span>
                                            </div>
                                        )}

                                        {event.attendees && event.attendees.length > 0 && (
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Users className="w-4 h-4" />
                                                <span>{event.attendees.length} attendees</span>
                                            </div>
                                        )}
                                    </div>

                                    {event.google_event_id && (
                                        <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                            Google Calendar
                                        </span>
                                    )}
                                </div>
                            ))}

                            {upcomingEvents.length === 0 && (
                                <div className="text-center py-8">
                                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No upcoming events</p>
                                    <p className="text-sm text-gray-400 mt-1">
                                        Click "Sync All" to import from Google Calendar
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-navy-900">Create New Event</h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                                    <input
                                        type="text"
                                        required
                                        value={createForm.summary}
                                        onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                                        placeholder="Meeting with Client"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={createForm.start_time}
                                            onChange={(e) => setCreateForm({ ...createForm, start_time: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={createForm.end_time}
                                            onChange={(e) => setCreateForm({ ...createForm, end_time: e.target.value })}
                                            className="w-full px-4 py-2 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={createForm.location}
                                        onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                                        placeholder="Online / Office"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        rows={3}
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="btn-primary"
                                    >
                                        {creating ? 'Creating...' : 'Create in Google Calendar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Manage Events Modal */}
                {showManageEventsModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-navy-900">Manage Events</h2>
                                <button onClick={() => setShowManageEventsModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 pr-2">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-cream-100 sticky top-0">
                                            <th className="text-left py-3 px-4 font-medium text-gray-600 rounded-l-lg">Event</th>
                                            <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                                            <th className="text-right py-3 px-4 font-medium text-gray-600 rounded-r-lg">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-cream-100">
                                        {events.map(event => (
                                            <tr key={event.id} className="hover:bg-cream-50 group">
                                                <td className="py-3 px-4 text-navy-900 font-medium">
                                                    <div>{event.title}</div>
                                                    {event.location && <div className="text-xs text-gray-500">{event.location}</div>}
                                                </td>
                                                <td className="py-3 px-4 text-gray-600 text-sm">
                                                    <div>{formatDate(event.start_time)}</div>
                                                    <div className="text-xs text-gray-500">{formatTime(event.start_time)} - {formatTime(event.end_time)}</div>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteEvent(event.id)}
                                                        className="text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors"
                                                        title="Delete Event"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {events.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="text-center py-8 text-gray-500">
                                                    No events found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 pt-4 border-t border-cream-200 flex justify-end">
                                <button
                                    onClick={() => setShowManageEventsModal(false)}
                                    className="btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
