'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { RefreshCw, Send, Mail, Inbox, AlertCircle, CheckCircle, Plus, Search, LogIn, Sparkles, Bot, X } from 'lucide-react'

interface Email {
    id: string
    from: string
    subject: string
    date: string
    snippet?: string
}

interface ComposeEmail {
    to: string
    subject: string
    body: string
}

function EmailContent() {
    const searchParams = useSearchParams()
    const [emails, setEmails] = useState<Email[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [sending, setSending] = useState(false)
    const [showCompose, setShowCompose] = useState(false)
    const [compose, setCompose] = useState<ComposeEmail>({ to: '', subject: '', body: '' })
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [search, setSearch] = useState('')
    const [authenticated, setAuthenticated] = useState(false)
    const [authUrl, setAuthUrl] = useState('')
    const [summary, setSummary] = useState('')
    const [summarizing, setSummarizing] = useState(false)
    const [drafting, setDrafting] = useState(false)

    const checkAuth = async () => {
        try {
            const res = await fetch('/api/auth/google')
            const data = await res.json()

            if (data.authenticated) {
                setAuthenticated(true)
                return true
            } else {
                setAuthUrl(data.authUrl || '')
                setAuthenticated(false)
                return false
            }
        } catch (error) {
            console.error('Error checking auth:', error)
            return false
        }
    }

    const fetchEmails = async () => {
        try {
            const res = await fetch('/api/gmail/inbox')
            const data = await res.json()

            if (data.success && data.messages) {
                setEmails(data.messages)
                setAuthenticated(true)
            } else if (data.authenticated === false) {
                setAuthenticated(false)
                await checkAuth()
            }
        } catch (error) {
            console.error('Error fetching emails:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        // Check for success/error from OAuth callback
        const success = searchParams.get('success')
        const error = searchParams.get('error')

        if (success) {
            setMessage({ type: 'success', text: 'Successfully connected to Gmail!' })
            setAuthenticated(true)
        } else if (error) {
            setMessage({ type: 'error', text: `Authentication failed: ${error}` })
        }

        fetchEmails()
    }, [searchParams])

    const handleSync = async () => {
        setSyncing(true)
        try {
            // Run sequentially to avoid server/file-lock issues in dev mode
            await fetch('/api/clickup/sync', { method: 'POST' })
            await fetch('/api/calendar/sync', { method: 'POST' })
            await fetchEmails()
        } catch (error) {
            console.error('Sync error:', error)
        } finally {
            setSyncing(false)
        }
    }

    const handleSignIn = () => {
        if (authUrl) {
            window.location.href = authUrl
        } else {
            checkAuth().then(() => {
                if (authUrl) {
                    window.location.href = authUrl
                }
            })
        }
    }

    const handleSendEmail = async () => {
        if (!compose.to || !compose.subject || !compose.body) {
            setMessage({ type: 'error', text: 'Please fill in all fields' })
            return
        }

        setSending(true)
        try {
            const res = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(compose)
            })
            const data = await res.json()

            if (data.success) {
                setMessage({ type: 'success', text: 'Email sent successfully!' })
                setCompose({ to: '', subject: '', body: '' })
                setShowCompose(false)
                await fetchEmails()
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to send email' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send email' })
        } finally {
            setSending(false)
        }
    }

    const handleSendReminders = async () => {
        setSending(true)
        try {
            const res = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'invoice_reminders' })
            })
            const data = await res.json()

            if (data.success) {
                setMessage({ type: 'success', text: `Sent ${data.sent} invoice reminder(s)` })
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to send reminders' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send reminders' })
        } finally {
            setSending(false)
        }
    }

    const handleAIDraft = async () => {
        if (!compose.subject) {
            setMessage({ type: 'error', text: 'Please enter a subject to help the AI draft the email' })
            return
        }

        setDrafting(true)
        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'user', content: `Write a professional email with subject: "${compose.subject}". ${compose.to ? `The recipient is ${compose.to}.` : ''} Please draft only the body of the email.` }
                    ]
                })
            })
            const data = await res.json()
            if (data.success) {
                setCompose({ ...compose, body: data.response })
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to draft email' })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to connect to AI assistant' })
        } finally {
            setDrafting(false)
        }
    }

    const handleSummarize = async () => {
        if (!authenticated) return

        setSummarizing(true)
        setMessage(null)
        setSummary('')

        try {
            // First, format the current emails into a context string
            const emailContext = emails.length > 0
                ? emails.map(e => `- From: ${e.from}\n  Subject: ${e.subject}\n  Date: ${e.date}\n  Preview: ${e.snippet || 'No preview'}`).join('\n\n')
                : 'No emails available'

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: `Here are my recent emails:\n\n${emailContext}\n\nPlease provide a concise summary of these emails. Highlight any urgent tasks, important requests from clients, follow-ups needed, or action items. Group related emails together if applicable.`
                        }
                    ]
                })
            })
            const data = await res.json()

            if (data.success) {
                setSummary(data.response)
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to generate summary' })
            }
        } catch (error) {
            console.error('handleSummarize: error', error)
            setMessage({ type: 'error', text: 'Failed to connect to AI assistant' })
        } finally {
            setSummarizing(false)
        }
    }

    const filteredEmails = emails.filter(email =>
        email.subject?.toLowerCase().includes(search.toLowerCase()) ||
        email.from?.toLowerCase().includes(search.toLowerCase())
    )

    const formatDate = (dateStr: string) => {
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateStr
        }
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
                        <h1 className="text-3xl font-bold text-navy-900">Email</h1>
                        <p className="text-gray-500 mt-1">Send emails and manage communications</p>
                    </div>
                    <div className="flex gap-3">
                        {authenticated ? (
                            <>
                                <button
                                    onClick={async () => {
                                        await fetch('/api/auth/google/logout', { method: 'POST' });
                                        setAuthenticated(false);
                                        window.location.reload();
                                    }}
                                    className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Disconnect
                                </button>
                                <button
                                    onClick={handleSendReminders}
                                    disabled={sending}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
                                    Reminders
                                </button>
                                <button
                                    onClick={handleSummarize}
                                    disabled={summarizing || !authenticated}
                                    className="btn-secondary flex items-center gap-2"
                                >
                                    <Sparkles className={`w-4 h-4 ${summarizing ? 'animate-pulse text-gold-500' : ''}`} />
                                    AI Summary
                                </button>
                                <button
                                    onClick={() => setShowCompose(true)}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Compose
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={async () => {
                                        await fetch('/api/auth/google/logout', { method: 'POST' });
                                        setAuthenticated(false);
                                        window.location.reload();
                                    }}
                                    className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Disconnect
                                </button>
                                <button
                                    onClick={handleSignIn}
                                    className="btn-primary flex items-center gap-2"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Sign in with Google
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Message Alert */}
                {message && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)} className="ml-auto text-sm underline">Dismiss</button>
                    </div>
                )}

                {/* Not Authenticated Banner */}
                {!authenticated && (
                    <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl text-center">
                        <Mail className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                        <h3 className="text-lg font-semibold text-navy-900 mb-2">Connect Your Gmail</h3>
                        <p className="text-gray-600 mb-4">Sign in with your Google account to view and send emails.</p>
                        <button
                            onClick={handleSignIn}
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <LogIn className="w-4 h-4" />
                            Sign in with Google
                        </button>
                    </div>
                )}

                {/* AI Summary */}
                {summary && (
                    <div className="mb-8 card-dark animate-fade-in relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => setSummary('')}
                                className="p-2 hover:bg-navy-900 rounded-lg text-cream-300 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gold-500 rounded-xl flex items-center justify-center shrink-0">
                                <Bot className="w-6 h-6 text-navy-900" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">AI Inbox Summary</h3>
                                <div className="text-cream-100 text-sm leading-relaxed whitespace-pre-line pr-8">
                                    {summary}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {authenticated && (
                    <>
                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="stat-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Inbox className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-navy-900">{emails.length}</p>
                                        <p className="text-sm text-gray-500">Recent Emails</p>
                                    </div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-green-600">Connected</p>
                                        <p className="text-sm text-gray-500">Gmail Account</p>
                                    </div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-gold-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold text-navy-900">Ready</p>
                                        <p className="text-sm text-gray-500">Invoice Reminders</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compose Modal */}
                        {showCompose && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                                <div className="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl">
                                    <h2 className="text-xl font-semibold text-navy-900 mb-4">Compose Email</h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                            <input
                                                type="email"
                                                value={compose.to}
                                                onChange={(e) => setCompose({ ...compose, to: e.target.value })}
                                                placeholder="recipient@example.com"
                                                className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                            <input
                                                type="text"
                                                value={compose.subject}
                                                onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                                                placeholder="Email subject"
                                                className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="block text-sm font-medium text-gray-700">Message</label>
                                                <button
                                                    onClick={handleAIDraft}
                                                    disabled={drafting || !compose.subject}
                                                    className="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <Bot className={`w-3 h-3 ${drafting ? 'animate-bounce' : ''}`} />
                                                    {drafting ? 'Drafting...' : 'Draft with AI'}
                                                </button>
                                            </div>
                                            <textarea
                                                value={compose.body}
                                                onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                                                placeholder="Write your message..."
                                                rows={8}
                                                className="w-full px-4 py-3 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500 resize-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <button
                                            onClick={() => setShowCompose(false)}
                                            className="btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSendEmail}
                                            disabled={sending}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            <Send className={`w-4 h-4 ${sending ? 'animate-spin' : ''}`} />
                                            {sending ? 'Sending...' : 'Send Email'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search */}
                        <div className="relative mb-6">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search emails..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-cream-300 focus:outline-none focus:border-gold-500"
                            />
                        </div>

                        {/* Email List */}
                        <div className="card-premium">
                            <h2 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
                                <Inbox className="w-5 h-5 text-gold-500" />
                                Recent Emails
                            </h2>

                            <div className="divide-y divide-cream-200">
                                {filteredEmails.map(email => (
                                    <div key={email.id} className="py-4 hover:bg-cream-50 px-4 -mx-4 cursor-pointer transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-navy-900 truncate">{email.from || 'Unknown Sender'}</p>
                                                <p className="text-sm text-gray-600 truncate">{email.subject || 'No Subject'}</p>
                                                {email.snippet && (
                                                    <p className="text-xs text-gray-400 truncate mt-1">{email.snippet}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(email.date)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredEmails.length === 0 && (
                                <div className="text-center py-12">
                                    <Mail className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-600 mb-2">No emails found</h3>
                                    <p className="text-gray-400">
                                        {emails.length === 0
                                            ? 'Your inbox is empty'
                                            : 'No emails match your search'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    )
}

export default function EmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-cream-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
            </div>
        }>
            <EmailContent />
        </Suspense>
    )
}
