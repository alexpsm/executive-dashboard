'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Header from '@/components/Header'
import DealsKanban from '@/components/DealsKanban'
import CompetitorStatus from '@/components/CompetitorStatus'
import SocialSummary from '@/components/SocialSummary'
import {
  TrendingUp, Users, DollarSign, Target,
  Briefcase
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { KPI_GOALS_2026 } from '@/lib/goals'

interface DashboardStats {
  ytd_revenue: number
  revenue_goal: number
  active_deals: number
  pipeline_value: number
  total_audience: number
  total_gen_z: number  // Gen Z audience from demographics (ages 13-24)
  audience_goal: number
  monthly_time_saved: number
  cost_savings: number
  overdue_invoices?: number
}


interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: string
  due_date: string
  clients?: { name: string }
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [dealsKey, setDealsKey] = useState(0) // Used to trigger DealsKanban refresh

  const fetchData = async () => {
    try {
      const [healthRes, invoicesRes] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/invoices', { cache: 'no-store' })
      ])

      const healthData = await healthRes.json()
      if (healthData.stats) setStats(healthData.stats)

      const invoicesData = await invoicesRes.json()
      if (invoicesData.invoices) setInvoices(invoicesData.invoices)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      // Sync all data sources (Monday is now included in sync/all)
      await fetch('/api/sync/all', { method: 'POST' })
      await fetchData()
      // Trigger DealsKanban to refresh
      setDealsKey(prev => prev + 1)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  const getProgress = (current: number, goal: number) => {
    if (!goal) return 0
    return Math.min(Math.round((current / goal) * 100), 100)
  }

  if (loading) {
    return <div className="loading-screen"><div className="loading-text">Loading Dashboard...</div></div>
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Header onSync={handleSync} syncing={syncing} overdueCount={stats?.overdue_invoices || 0} overdueProjects={0} />

      <main className="max-w-7xl mx-auto px-4 py-8 animate-page-load">

        {/* Hero Section with Large Logo */}
        <div className="flex items-center gap-6 mb-8">
          <Image
            src="/boxing_news_logo.png"
            alt="Boxing News"
            width={80}
            height={80}
            className="rounded-xl shadow-lg"
          />
          <div>
            <h1 className="text-3xl font-bold text-cream-100">Boxing News</h1>
            <p className="text-gray-400">Executive Dashboard - 2026 KPIs</p>
          </div>
        </div>

        {/* 1. 2026 KPI SEGMENT */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-6 h-6 text-brand-red" />
            <h2 className="text-2xl font-bold text-cream-100">MAIN KPI GOALS</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Revenue */}
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">Cross-Platform Revenue</p>
                  <p className="stat-value">{formatCurrency(stats?.ytd_revenue || 0)}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: £100,000</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getProgress(stats?.ytd_revenue || 0, KPI_GOALS_2026.REVENUE)}%` }}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-green-500 mt-1">{getProgress(stats?.ytd_revenue || 0, KPI_GOALS_2026.REVENUE)}%</p>
                </div>
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>

            {/* Gen Z Growth */}
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">Gen Z Audience (13-24)</p>
                  <p className="stat-value">{(stats?.total_gen_z || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: 1.15 Million</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-brand-red h-2 rounded-full transition-all duration-1000" style={{ width: `${getProgress(stats?.total_gen_z || 0, KPI_GOALS_2026.GEN_Z_AUDIENCE)}%` }}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-brand-red mt-1">{getProgress(stats?.total_gen_z || 0, KPI_GOALS_2026.GEN_Z_AUDIENCE)}%</p>
                </div>
                <div className="w-10 h-10 bg-brand-red/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-red" />
                </div>
              </div>
            </div>

            {/* Pipeline - B2B Digital Sales */}
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">B2B Digital Sales</p>
                  <p className="stat-value">{formatCurrency(stats?.pipeline_value || 0)}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: £50,000</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getProgress(stats?.pipeline_value || 0, KPI_GOALS_2026.B2B_DIGITAL_SALES)}%` }}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-blue-500 mt-1">{getProgress(stats?.pipeline_value || 0, KPI_GOALS_2026.B2B_DIGITAL_SALES)}%</p>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Cost Savings */}
            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">Running Costs Saved</p>
                  <p className="stat-value">{formatCurrency(stats?.cost_savings || 0)}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: £75,000</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-gold-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${getProgress(stats?.cost_savings || 0, KPI_GOALS_2026.COST_SAVINGS)}%` }}></div>
                  </div>
                  <p className="text-right text-xs font-bold text-gold-500 mt-1">{getProgress(stats?.cost_savings || 0, KPI_GOALS_2026.COST_SAVINGS)}%</p>
                </div>
                <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-gold-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 2. DEALS WORKSPACE */}
          <div className="lg:col-span-2 space-y-8">
            <div className="card-premium">
              <DealsKanban key={dealsKey} />
            </div>

            {/* 3. SOCIAL SUMMARY */}
            <SocialSummary />
          </div>

          {/* 4. REVENUE & OUTREACH */}
          <div className="space-y-8">
            {/* Competitor Status */}
            <CompetitorStatus />

            {/* Invoices */}
            <div className="card-premium">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-cream-100">Pending Revenue</h3>
                <span className="text-xs text-gold-500">Xero Connected</span>
              </div>
              <div className="space-y-3">
                {invoices.slice(0, 4).map(inv => (
                  <div key={inv.id} className="p-3 border border-navy-800 rounded-xl hover:border-gold-500/30 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gold-500">{formatCurrency(inv.amount)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'overdue' ? 'bg-brand-red/20 text-brand-red' : 'bg-green-500/20 text-green-400'}`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{inv.clients?.name} • Due {inv.due_date}</p>
                  </div>
                ))}
                {invoices.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No pending invoices.</p>}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
