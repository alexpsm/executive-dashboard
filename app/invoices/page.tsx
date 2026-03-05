'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import { RefreshCw, Plus, Search, DollarSign, Send, CheckCircle, Clock, AlertCircle, FileText, Trash2, X, UserPlus, Users } from 'lucide-react'
import { formatCurrency, formatDate, getDaysOverdue } from '@/lib/utils'

interface Invoice {
    id: string
    invoice_number: string
    amount: number
    status: string
    issue_date: string
    due_date: string
    paid_date: string | null
    clients?: { id: string; name: string; email: string }
}

interface Client { id: string; name: string }

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [syncing, setSyncing] = useState(false)
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [sendingReminders, setSendingReminders] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [createForm, setCreateForm] = useState({ invoice_number: '', amount: '', client_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'draft' })
    const [creating, setCreating] = useState(false)
    const [showClientModal, setShowClientModal] = useState(false)
    const [showManageClientsModal, setShowManageClientsModal] = useState(false)
    const [clientForm, setClientForm] = useState({ name: '', email: '', company: '' })
    const [creatingClient, setCreatingClient] = useState(false)

    const fetchData = async () => {
        try {
            const [invRes, cliRes] = await Promise.all([fetch('/api/invoices'), fetch('/api/clients')])
            const invData = await invRes.json()
            if (invData.invoices) setInvoices(invData.invoices)
            if (cliRes.ok) { const cliData = await cliRes.json(); if (cliData.clients) setClients(cliData.clients) }
        } catch (error) { console.error('Error fetching data:', error) } finally { setLoading(false) }
    }

    useEffect(() => { fetchData(); const interval = setInterval(fetchData, 10000); return () => clearInterval(interval) }, [])

    const handleSync = async () => {
        setSyncing(true)
        try {
            await fetch('/api/xero/sync', { method: 'POST' })
            await fetchData()
        } catch (error) {
            console.error('Sync error:', error)
        } finally {
            setSyncing(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setCreating(true)
        try {
            const res = await fetch('/api/invoices/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(createForm) })
            const data = await res.json()
            if (data.success) { setShowCreateModal(false); setCreateForm({ invoice_number: '', amount: '', client_id: '', issue_date: new Date().toISOString().split('T')[0], due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], status: 'draft' }); fetchData() } else { alert('Error: ' + data.error) }
        } catch (error) { alert('Failed to create invoice') } finally { setCreating(false) }
    }

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault(); setCreatingClient(true)
        try {
            const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientForm) })
            const data = await res.json()
            if (data.success) { setShowClientModal(false); setClientForm({ name: '', email: '', company: '' }); const cliRes = await fetch('/api/clients'); if (cliRes.ok) { const cliData = await cliRes.json(); if (cliData.clients) setClients(cliData.clients) } } else { alert('Error: ' + data.error) }
        } catch (error) { alert('Failed to create client') } finally { setCreatingClient(false) }
    }

    const handleDelete = async (id: string) => { if (!confirm('Delete this invoice?')) return; try { const res = await fetch(`/api/invoices/manage?id=${id}`, { method: 'DELETE' }); if (res.ok) setInvoices(invoices.filter(i => i.id !== id)) } catch (error) { console.error('Delete error:', error) } }
    const handleDeleteClient = async (id: string) => { if (!confirm('Delete this client?')) return; try { const res = await fetch(`/api/clients?id=${id}`, { method: 'DELETE' }); if (res.ok) setClients(clients.filter(c => c.id !== id)) } catch (error) { console.error('Delete error:', error) } }
    const handleSendReminders = async () => { setSendingReminders(true); try { const res = await fetch('/api/gmail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'invoice_reminders' }) }); const data = await res.json(); alert(data.success ? `Sent ${data.sent} reminder(s)` : `Error: ${data.error}`) } catch (error) { alert('Failed to send reminders') } finally { setSendingReminders(false) } }

    const filteredInvoices = invoices.filter(inv => { const matchesFilter = filter === 'all' || inv.status === filter; const matchesSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) || inv.clients?.name?.toLowerCase().includes(search.toLowerCase()); return matchesFilter && matchesSearch })
    const stats = { total: invoices.length, paid: invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0), pending: invoices.filter(i => i.status === 'sent').reduce((acc, i) => acc + i.amount, 0), overdue: invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.amount, 0), overdueCount: invoices.filter(i => i.status === 'overdue').length }
    const getStatusColor = (status: string) => { switch (status) { case 'paid': return 'bg-green-500/20 text-green-400'; case 'sent': return 'bg-blue-500/20 text-blue-400'; case 'overdue': return 'bg-red-500/20 text-red-400'; default: return 'bg-navy-700 text-gray-400' } }
    const getStatusIcon = (status: string) => { switch (status) { case 'paid': return <CheckCircle className="w-4 h-4" />; case 'sent': return <Clock className="w-4 h-4" />; case 'overdue': return <AlertCircle className="w-4 h-4" />; default: return <FileText className="w-4 h-4" /> } }

    if (loading) return (<div className="min-h-screen bg-navy-900"><Header onSync={handleSync} syncing={syncing} overdueCount={stats.overdueCount} /><div className="flex items-center justify-center h-96"><RefreshCw className="w-8 h-8 animate-spin text-gold-500" /></div></div>)

    return (
        <div className="min-h-screen bg-navy-900 text-cream-100">
            <Header onSync={handleSync} syncing={syncing} overdueCount={stats.overdueCount} />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div><h1 className="text-3xl font-bold text-white">Invoices</h1><p className="text-gray-400 mt-1">Track payments and send reminders</p></div>
                    <div className="flex gap-3">
                        {stats.overdueCount > 0 && <button onClick={handleSendReminders} disabled={sendingReminders} className="btn-primary flex items-center gap-2"><Send className={`w-4 h-4 ${sendingReminders ? 'animate-pulse' : ''}`} />{sendingReminders ? 'Sending...' : 'Send Reminders'}</button>}
                        <button onClick={() => setShowManageClientsModal(true)} className="btn-secondary flex items-center gap-2"><Users className="w-4 h-4" /> Clients</button>
                        <button onClick={() => setShowClientModal(true)} className="btn-secondary flex items-center gap-2"><UserPlus className="w-4 h-4" /> New Client</button>
                        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> New Invoice</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center"><CheckCircle className="w-5 h-5 text-green-400" /></div><div><p className="text-2xl font-bold text-green-400">{formatCurrency(stats.paid)}</p><p className="text-sm text-gray-400">Paid</p></div></div></div>
                    <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-blue-400" /></div><div><p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.pending)}</p><p className="text-sm text-gray-400">Pending</p></div></div></div>
                    <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center"><AlertCircle className="w-5 h-5 text-red-400" /></div><div><p className="text-2xl font-bold text-red-400">{formatCurrency(stats.overdue)}</p><p className="text-sm text-gray-400">Overdue ({stats.overdueCount})</p></div></div></div>
                    <div className="stat-card"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-gold-500" /></div><div><p className="text-2xl font-bold text-cream-100">{stats.total}</p><p className="text-sm text-gray-400">Total Invoices</p></div></div></div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" /><input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-xl bg-navy-800 border border-navy-700 text-cream-100 placeholder-gray-500 focus:outline-none focus:border-gold-500" /></div>
                    <div className="flex gap-2">{['all', 'draft', 'sent', 'paid', 'overdue'].map(status => (<button key={status} onClick={() => setFilter(status)} className={`px-4 py-2 rounded-lg transition-colors capitalize ${filter === status ? 'bg-gold-500 text-navy-900' : 'bg-navy-800 text-gray-400 hover:bg-navy-700'}`}>{status}</button>))}</div>
                </div>

                <div className="card-premium overflow-hidden">
                    <table className="w-full">
                        <thead><tr className="bg-navy-800"><th className="text-left py-3 px-4 font-medium text-gray-400 rounded-l-lg">Invoice</th><th className="text-left py-3 px-4 font-medium text-gray-400">Client</th><th className="text-left py-3 px-4 font-medium text-gray-400">Amount</th><th className="text-left py-3 px-4 font-medium text-gray-400">Status</th><th className="text-left py-3 px-4 font-medium text-gray-400">Due Date</th><th className="text-left py-3 px-4 font-medium text-gray-400 rounded-r-lg"></th></tr></thead>
                        <tbody className="divide-y divide-navy-700">
                            {filteredInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-navy-800/50 group">
                                    <td className="py-3 px-4 text-cream-100 font-medium">{invoice.invoice_number}</td>
                                    <td className="py-3 px-4 text-gray-400">{invoice.clients?.name || 'Unknown'}</td>
                                    <td className="py-3 px-4 font-semibold text-gold-500">{formatCurrency(invoice.amount)}</td>
                                    <td className="py-3 px-4"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>{getStatusIcon(invoice.status)}{invoice.status}</span></td>
                                    <td className="py-3 px-4 text-gray-400"><span className={invoice.status === 'overdue' ? 'text-red-400' : ''}>{formatDate(invoice.due_date)}{invoice.status === 'overdue' && <span className="block text-xs text-red-400">{getDaysOverdue(invoice.due_date)} days overdue</span>}</span></td>
                                    <td className="py-3 px-4"><button onClick={() => handleDelete(invoice.id)} className="text-gray-500 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredInvoices.length === 0 && <div className="text-center py-12"><FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-400">No invoices found</h3></div>}
                </div>

                {showCreateModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"><div className="bg-navy-800 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl border border-navy-700"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold text-cream-100">New Invoice</h2><button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button></div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">Invoice Number</label><input type="text" required value={createForm.invoice_number} onChange={(e) => setCreateForm({ ...createForm, invoice_number: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500" placeholder="INV-001" /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">Amount ($)</label><input type="number" required min="0" step="0.01" value={createForm.amount} onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500" placeholder="0.00" /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">Client</label><select value={createForm.client_id} onChange={(e) => setCreateForm({ ...createForm, client_id: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500"><option value="">Select client...</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-300 mb-1">Issue Date</label><input type="date" required value={createForm.issue_date} onChange={(e) => setCreateForm({ ...createForm, issue_date: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500" /></div><div><label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label><input type="date" required value={createForm.due_date} onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500" /></div></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">Status</label><select value={createForm.status} onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500"><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="overdue">Overdue</option></select></div>
                            <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create'}</button></div>
                        </form>
                    </div></div>
                )}

                {showClientModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"><div className="bg-navy-800 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-navy-700"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold text-cream-100">New Client</h2><button onClick={() => setShowClientModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button></div>
                        <form onSubmit={handleCreateClient} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">Name</label><input type="text" required value={clientForm.name} onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500" /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">Email</label><input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500" /></div>
                            <div><label className="block text-sm font-medium text-gray-300 mb-1">Company</label><input type="text" value={clientForm.company} onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })} className="w-full px-4 py-2 rounded-xl bg-navy-900 border border-navy-600 text-cream-100 focus:outline-none focus:border-gold-500" /></div>
                            <div className="flex justify-end gap-3 mt-6"><button type="button" onClick={() => setShowClientModal(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={creatingClient} className="btn-primary">{creatingClient ? 'Creating...' : 'Create'}</button></div>
                        </form>
                    </div></div>
                )}

                {showManageClientsModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"><div className="bg-navy-800 rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col border border-navy-700"><div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold text-cream-100">Manage Clients</h2><button onClick={() => setShowManageClientsModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button></div>
                        <div className="overflow-y-auto flex-1 pr-2"><table className="w-full"><thead><tr className="bg-navy-900 sticky top-0"><th className="text-left py-3 px-4 font-medium text-gray-400 rounded-l-lg">Name</th><th className="text-left py-3 px-4 font-medium text-gray-400">Company</th><th className="text-right py-3 px-4 font-medium text-gray-400 rounded-r-lg"></th></tr></thead><tbody className="divide-y divide-navy-700">{clients.map(c => (<tr key={c.id} className="hover:bg-navy-700/50 group"><td className="py-3 px-4 text-cream-100 font-medium">{c.name}</td><td className="py-3 px-4 text-gray-400">{(c as any).company || '-'}</td><td className="py-3 px-4 text-right"><button onClick={() => handleDeleteClient(c.id)} className="text-gray-500 hover:text-red-400 p-1 rounded-md hover:bg-red-500/10 transition-colors"><Trash2 className="w-4 h-4" /></button></td></tr>))}{clients.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-500">No clients found.</td></tr>}</tbody></table></div>
                        <div className="mt-6 pt-4 border-t border-navy-700 flex justify-end"><button onClick={() => setShowManageClientsModal(false)} className="btn-secondary">Close</button></div>
                    </div></div>
                )}
            </main>
        </div>
    )
}
