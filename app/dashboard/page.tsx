'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Header from '@/components/Header'
import {
  Users, DollarSign, Target, Briefcase, Edit3, Check,
  Youtube, Instagram, Facebook, Video, Info, Settings
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { KPI_GOALS_2026 } from '@/lib/goals'

const METRIC_INFO: Record<string, string> = {
  'Total Views': 'All views on any YouTube content during 2026, including videos published before 2026',
  'Video Views': 'Views on regular videos (non-Shorts) during 2026, on any video regardless of publish date',
  'Shorts Views': 'Views on YouTube Shorts during 2026, on any Short regardless of publish date',
  'Ad Revenue': 'YTD estimated ad revenue from YouTube Partner Program',
  'Subscribers Gained': 'Net new subscribers in 2026 (gained minus lost)',
  'Impression CTR': 'Click-through rate from YouTube impressions to video views (from YouTube Studio)',
  'Engagement Rate': 'Average (likes + comments + shares) / views on videos published in 2026',
  'Avg Video Views': 'Average views per regular video published in 2026',
  'Followers Gained': 'Net new followers gained in 2026',
  'Avg Reach (Post)': 'Average unique accounts reached per feed post in 2026',
  'Avg Reach (Story)': 'Average unique accounts reached per story in 2026 (manual input)',
  'Est. Price/Post': 'Estimated sponsorship value per feed post (HypeAuditor data)',
  'Est. Price/Story': 'Estimated sponsorship value per story (HypeAuditor data)',
  'Reach Per Post': 'Average unique accounts reached per TikTok video',
  'Platform Revenue': 'YTD revenue from Facebook monetization (manual input - crucial KPI)',
  'FB Total Views': 'Total video + post impressions during 2026 (excludes stories - not available via API)',
  '3-Sec Views': 'Video views where the video played for at least 3 seconds',
  '1-Min Views': 'Estimated video views of 60+ seconds based on retention data',
}

interface DashboardStats {
  ytd_revenue: number
  revenue_goal: number
  total_audience: number
  total_gen_z: number
  audience_goal: number
  cost_savings: number
  b2b_digital_sales: number
  social: {
    youtube: any
    instagram: any
    tiktok: any
    facebook: any
  } | null
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Month selector — defaults to current month, used for all manual inputs
  const now = new Date()
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue)

  // Monthly history for B2B and Costs (loaded from /api/manual)
  const [b2bHistory, setB2bHistory] = useState<{ month: string; value: number }[]>([])
  const [costsHistory, setCostsHistory] = useState<{ month: string; value: number }[]>([])

  // Main KPI manual input states
  const [showKPIManual, setShowKPIManual] = useState(false)
  const [b2bValue, setB2bValue] = useState('')
  const [costsValue, setCostsValue] = useState('')

  // Social manual input toggle states
  const [showYouTubeManual, setShowYouTubeManual] = useState(false)
  const [showInstagramManual, setShowInstagramManual] = useState(false)
  const [showFacebookManual, setShowFacebookManual] = useState(false)
  const [showTikTokManual, setShowTikTokManual] = useState(false)

  // Social manual input values
  const [manualCtr, setManualCtr] = useState('')
  const [igStoryReach, setIgStoryReach] = useState('')
  const [igPricePost, setIgPricePost] = useState('')
  const [igPriceStory, setIgPriceStory] = useState('')
  const [fbRevenue, setFbRevenue] = useState('')
  const [fbStoryImpressions, setFbStoryImpressions] = useState('')
  const [tiktokFollowers, setTiktokFollowers] = useState('')
  const [tiktokEngagement, setTiktokEngagement] = useState('')
  const [tiktokReach, setTiktokReach] = useState('')
  const [tiktokPricePost, setTiktokPricePost] = useState('')

  // Generate month options: Jan 2026 → current month
  const monthOptions = (() => {
    const opts = []
    const year = new Date().getFullYear()
    const curMonth = new Date().getMonth() + 1
    for (let m = 1; m <= curMonth; m++) {
      const val = `${year}-${String(m).padStart(2, '0')}`
      const label = new Date(`${val}-01`).toLocaleString('default', { month: 'long', year: 'numeric' })
      opts.push({ val, label })
    }
    return opts.reverse()
  })()

  const fetchData = async () => {
    try {
      const [healthRes, b2bRes, costsRes] = await Promise.all([
        fetch('/api/health', { cache: 'no-store' }),
        fetch('/api/manual?metric_key=b2b_digital_sales'),
        fetch('/api/manual?metric_key=running_costs_saved'),
      ])
      const data = await healthRes.json()
      if (data.stats) setStats(data.stats)

      const b2bData = await b2bRes.json()
      if (b2bData.metrics) {
        setB2bHistory(b2bData.metrics
          .filter((m: any) => m.metric_date?.startsWith(String(new Date().getFullYear())))
          .map((m: any) => ({ month: m.metric_date.slice(0, 7), value: m.metric_value }))
        )
      }
      const costsData = await costsRes.json()
      if (costsData.metrics) {
        setCostsHistory(costsData.metrics
          .filter((m: any) => m.metric_date?.startsWith(String(new Date().getFullYear())))
          .map((m: any) => ({ month: m.metric_date.slice(0, 7), value: m.metric_value }))
        )
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const year = new Date().getFullYear()
      const month = new Date().getMonth() + 1
      const ytdDays = Math.ceil((Date.now() - new Date(`${year}-01-01`).getTime()) / 86400000) + 1

      // Phase 1: Monthly YTD aggregates (shorts breakdown, avg views, etc.) + main Instagram sync
      // Must run BEFORE daily so daily overwrites month-end rows with correct daily values
      await Promise.allSettled([
        fetch('/api/sync/instagram', { method: 'POST' }),                          // Populates content_posts for engagement calc
        fetch(`/api/sync/youtube/monthly?month=1&year=${year}`),                   // Jan shorts/avg data
        fetch(`/api/sync/youtube/monthly?month=2&year=${year}`),                   // Feb shorts/avg data
        fetch(`/api/sync/youtube/monthly?month=${month}&year=${year}`),            // Current month
        fetch(`/api/sync/facebook/daily?ytd=true`, { method: 'POST' }),            // Facebook full YTD
      ])

      // Phase 2: Full-year daily syncs — overwrites month-end rows with correct per-day values
      // YouTube: covers Jan 1 → today so health API sums correctly without double-counting
      await Promise.allSettled([
        fetch(`/api/sync/youtube/daily?days=${ytdDays}`, { method: 'POST' }),
        fetch(`/api/sync/instagram/daily?days=30`, { method: 'POST' }),
        fetch('/api/sync/tiktok/backfill', { method: 'POST' }),
      ])

      await fetchData()
    } catch (e) { console.error(e) }
    finally { setSyncing(false) }
  }

  const saveManualKPI = async (metricKey: string, value: number) => {
    setSaving(true)
    try {
      await fetch('/api/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [{ metric_key: metricKey, metric_value: value, metric_date: `${selectedMonth}-01` }] })
      })
      await fetchData()
    } catch (err) { console.error('Failed to save:', err) }
    setSaving(false)
  }

  const saveSocialMetric = async (platform: string, metricKey: string, value: number) => {
    setSaving(true)
    try {
      await fetch('/api/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: [{ platform, metric_key: metricKey, metric_value: value, metric_date: `${selectedMonth}-01` }] })
      })
      await fetchData()
    } catch (err) { console.error('Failed to save:', err) }
    setSaving(false)
  }

  const pct = (current: number, goal: number) =>
    goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0

  if (loading) {
    return <div className="loading-screen"><div className="loading-text">Loading Dashboard...</div></div>
  }

  const yt = stats?.social?.youtube || {}
  const ig = stats?.social?.instagram || {}
  const tt = stats?.social?.tiktok || {}
  const fb = stats?.social?.facebook || {}

  return (
    <div className="min-h-screen bg-mesh">
      <Header onSync={handleSync} syncing={syncing} />

      <main className="max-w-7xl mx-auto px-4 py-8 animate-page-load">

        {/* Hero */}
        <div className="flex items-center gap-6 mb-8">
          <Image src="/boxing_news_logo.png" alt="Boxing News" width={80} height={80} className="rounded-xl shadow-lg" />
          <div>
            <h1 className="text-3xl font-bold text-cream-100">Boxing News</h1>
            <p className="text-gray-400">Executive Dashboard — 2026 KPIs</p>
          </div>
        </div>

        {/* ── MAIN KPI GOALS ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-6 h-6 text-brand-red" />
            <h2 className="text-2xl font-bold text-cream-100">MAIN KPI GOALS</h2>
            <button onClick={() => setShowKPIManual(!showKPIManual)}
              className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1">
              <Settings className="w-3 h-3" /> Manual Input
            </button>
          </div>

          {showKPIManual && (
            <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-300 font-medium">Monthly Manual Entry</p>
                <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                  className="px-2 py-1 bg-navy-900 border border-navy-600 rounded text-cream-100 text-xs">
                  {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap gap-6">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs text-gray-400 mb-1">B2B Digital Sales (£)</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">£</span>
                    <input type="number" value={b2bValue} onChange={e => setB2bValue(e.target.value)}
                      className="flex-1 px-2 py-1 bg-navy-900 border border-navy-600 rounded text-cream-100 text-sm" placeholder="0" />
                    <button onClick={() => { saveManualKPI('b2b_digital_sales', parseFloat(b2bValue) || 0); setB2bValue('') }} disabled={saving || !b2bValue}
                      className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50"><Check className="w-4 h-4 text-green-500" /></button>
                  </div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-xs text-gray-400 mb-1">Running Costs Saved (£)</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">£</span>
                    <input type="number" value={costsValue} onChange={e => setCostsValue(e.target.value)}
                      className="flex-1 px-2 py-1 bg-navy-900 border border-navy-600 rounded text-cream-100 text-sm" placeholder="0" />
                    <button onClick={() => { saveManualKPI('running_costs_saved', parseFloat(costsValue) || 0); setCostsValue('') }} disabled={saving || !costsValue}
                      className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50"><Check className="w-4 h-4 text-green-500" /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">Cross-Platform Revenue</p>
                  <p className="stat-value">{formatCurrency(stats?.ytd_revenue || 0)}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: £100,000</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${pct(stats?.ytd_revenue || 0, KPI_GOALS_2026.REVENUE)}%` }} />
                  </div>
                  <p className="text-right text-xs font-bold text-green-500 mt-1">{pct(stats?.ytd_revenue || 0, KPI_GOALS_2026.REVENUE)}%</p>
                </div>
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">Gen Z Audience (13-24)</p>
                  <p className="stat-value">{(stats?.total_gen_z || 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: 1.15 Million</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-brand-red h-2 rounded-full transition-all duration-1000" style={{ width: `${pct(stats?.total_gen_z || 0, KPI_GOALS_2026.GEN_Z_AUDIENCE)}%` }} />
                  </div>
                  <p className="text-right text-xs font-bold text-brand-red mt-1">{pct(stats?.total_gen_z || 0, KPI_GOALS_2026.GEN_Z_AUDIENCE)}%</p>
                </div>
                <div className="w-10 h-10 bg-brand-red/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-red" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">B2B Digital Sales</p>
                  <p className="stat-value">{formatCurrency(stats?.b2b_digital_sales || 0)}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: £50,000</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${pct(stats?.b2b_digital_sales || 0, KPI_GOALS_2026.B2B_DIGITAL_SALES)}%` }} />
                  </div>
                  <p className="text-right text-xs font-bold text-blue-500 mt-1">{pct(stats?.b2b_digital_sales || 0, KPI_GOALS_2026.B2B_DIGITAL_SALES)}%</p>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="stat-label">Running Costs Saved</p>
                  <p className="stat-value">{formatCurrency(stats?.cost_savings || 0)}</p>
                  <p className="text-xs text-gray-500 mb-2">Target: £75,000</p>
                  <div className="w-full bg-navy-800 rounded-full h-2">
                    <div className="bg-gold-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${pct(stats?.cost_savings || 0, KPI_GOALS_2026.COST_SAVINGS)}%` }} />
                  </div>
                  <p className="text-right text-xs font-bold text-gold-500 mt-1">{pct(stats?.cost_savings || 0, KPI_GOALS_2026.COST_SAVINGS)}%</p>
                </div>
                <div className="w-10 h-10 bg-gold-500/20 rounded-lg flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-gold-500" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── SOCIAL MEDIA GOALS ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-gold-500" />
            <h2 className="text-2xl font-bold text-cream-100">SOCIAL MEDIA GOALS</h2>
          </div>

          {/* YOUTUBE */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4 p-4 bg-navy-800 rounded-xl border border-red-900/30">
              <div className="bg-red-600 p-2 rounded-lg"><Youtube className="w-5 h-5 text-white" /></div>
              <h3 className="text-xl font-bold text-white">YouTube</h3>
              <button onClick={() => setShowYouTubeManual(!showYouTubeManual)}
                className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" /> Manual Input
              </button>
            </div>
            {showYouTubeManual && (
              <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-300 font-medium">Manual Data Entry (from YouTube Studio)</p>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="px-2 py-1 bg-navy-900 border border-navy-600 rounded text-cream-100 text-xs">
                    {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400">Impression CTR:</label>
                    <input type="number" step="0.1" value={manualCtr} onChange={e => setManualCtr(e.target.value)}
                      placeholder="5.2" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                    <span className="text-gray-400 text-sm">%</span>
                    <button onClick={() => { saveSocialMetric('youtube', 'youtube_ctr', parseFloat(manualCtr)); setManualCtr('') }}
                      disabled={saving || !manualCtr} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Views" current={yt.views || 0} target={KPI_GOALS_2026.YOUTUBE.VIEWS + KPI_GOALS_2026.YOUTUBE.SHORTS_VIEWS} unit="" info={METRIC_INFO['Total Views']} />
              <MetricCard label="Video Views" current={(yt.views || 0) - (yt.shorts_views || 0)} target={KPI_GOALS_2026.YOUTUBE.VIEWS} unit="" info={METRIC_INFO['Video Views']} />
              <MetricCard label="Shorts Views" current={yt.shorts_views || 0} target={KPI_GOALS_2026.YOUTUBE.SHORTS_VIEWS} unit="" info={METRIC_INFO['Shorts Views']} />
              <MetricCard label="Ad Revenue" current={yt.ad_revenue || 0} target={KPI_GOALS_2026.YOUTUBE.REVENUE} unit="£" info={METRIC_INFO['Ad Revenue']} />
              <MetricCard label="Subscribers Gained" current={yt.subscribers_gained || yt.followers || 0} target={KPI_GOALS_2026.YOUTUBE.SUBSCRIBERS} unit="" info={METRIC_INFO['Subscribers Gained']} />
              <MetricCard label="Impression CTR" current={yt.ctr || 0} target={KPI_GOALS_2026.YOUTUBE.CTR_PERCENT} unit="%" info={METRIC_INFO['Impression CTR']} />
              <MetricCard label="Engagement Rate" current={yt.engagement_rate || 0} target={KPI_GOALS_2026.YOUTUBE.ENGAGEMENT_RATE} unit="%" info={METRIC_INFO['Engagement Rate']} />
              <MetricCard label="Avg Video Views" current={yt.avg_video_views || 0} target={KPI_GOALS_2026.YOUTUBE.AVG_VIDEO_VIEWS} unit="" info={METRIC_INFO['Avg Video Views']} />
            </div>
          </section>

          {/* INSTAGRAM */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4 p-4 bg-navy-800 rounded-xl border border-pink-900/30">
              <div className="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-2 rounded-lg"><Instagram className="w-5 h-5 text-white" /></div>
              <h3 className="text-xl font-bold text-white">Instagram</h3>
              <button onClick={() => setShowInstagramManual(!showInstagramManual)}
                className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" /> Manual Input
              </button>
            </div>
            {showInstagramManual && (
              <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-300 font-medium">Manual Data Entry (HypeAuditor & Instagram Insights)</p>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="px-2 py-1 bg-navy-900 border border-navy-600 rounded text-cream-100 text-xs">
                    {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Avg Story Reach:</label>
                    <input type="number" value={igStoryReach} onChange={e => setIgStoryReach(e.target.value)}
                      placeholder="50000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                    <button onClick={() => { saveSocialMetric('instagram', 'instagram_avg_reach_story', parseFloat(igStoryReach)); setIgStoryReach('') }}
                      disabled={saving || !igStoryReach} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Est. Price/Post (£):</label>
                    <input type="number" value={igPricePost} onChange={e => setIgPricePost(e.target.value)}
                      placeholder="500" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                    <button onClick={() => { saveSocialMetric('instagram', 'instagram_price_per_post', parseFloat(igPricePost)); setIgPricePost('') }}
                      disabled={saving || !igPricePost} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Est. Price/Story (£):</label>
                    <input type="number" value={igPriceStory} onChange={e => setIgPriceStory(e.target.value)}
                      placeholder="200" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                    <button onClick={() => { saveSocialMetric('instagram', 'instagram_price_per_story', parseFloat(igPriceStory)); setIgPriceStory('') }}
                      disabled={saving || !igPriceStory} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Followers Gained" current={ig.followers_gained || ig.followers || 0} target={KPI_GOALS_2026.INSTAGRAM.FOLLOWERS} unit="" info={METRIC_INFO['Followers Gained']} />
              <MetricCard label="Engagement Rate" current={ig.engagement_rate || ig.engagement || 0} target={KPI_GOALS_2026.INSTAGRAM.ENGAGEMENT_RATE} unit="%" />
              <MetricCard label="Avg Reach (Post)" current={ig.avg_reach_post || 0} target={KPI_GOALS_2026.INSTAGRAM.AVG_REACH_POST} unit="" info={METRIC_INFO['Avg Reach (Post)']} />
              <MetricCard label="Avg Reach (Story)" current={ig.avg_reach_story || ig.story_reach || 0} target={KPI_GOALS_2026.INSTAGRAM.AVG_REACH_STORY} unit="" info={METRIC_INFO['Avg Reach (Story)']} />
              <MetricCard label="Est. Price/Post" current={ig.estimated_price_post || 0} target={KPI_GOALS_2026.INSTAGRAM.PRICE_PER_POST} unit="£" info={METRIC_INFO['Est. Price/Post']} />
              <MetricCard label="Est. Price/Story" current={ig.estimated_price_story || 0} target={KPI_GOALS_2026.INSTAGRAM.PRICE_PER_STORY} unit="£" info={METRIC_INFO['Est. Price/Story']} />
            </div>
          </section>

          {/* TIKTOK */}
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4 p-4 bg-navy-800 rounded-xl border border-gray-700">
              <div className="bg-black border border-gray-600 p-2 rounded-lg"><Video className="w-5 h-5 text-white" /></div>
              <h3 className="text-xl font-bold text-white">TikTok</h3>
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Connected via API</span>
              <button onClick={() => setShowTikTokManual(!showTikTokManual)}
                className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" /> Manual Input
              </button>
            </div>
            {showTikTokManual && (
              <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-300 font-medium">Manual Data Entry (from TikTok Analytics)</p>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="px-2 py-1 bg-navy-900 border border-navy-600 rounded text-cream-100 text-xs">
                    {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Followers Gained:</label>
                    <input type="number" value={tiktokFollowers} onChange={e => setTiktokFollowers(e.target.value)}
                      placeholder="10000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                    <button onClick={() => { saveSocialMetric('tiktok', 'tiktok_followers_gained', parseFloat(tiktokFollowers)); setTiktokFollowers('') }}
                      disabled={saving || !tiktokFollowers} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Engagement Rate (%):</label>
                    <input type="number" step="0.1" value={tiktokEngagement} onChange={e => setTiktokEngagement(e.target.value)}
                      placeholder="5.0" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                    <button onClick={() => { saveSocialMetric('tiktok', 'tiktok_engagement_rate', parseFloat(tiktokEngagement)); setTiktokEngagement('') }}
                      disabled={saving || !tiktokEngagement} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Reach Per Post:</label>
                    <input type="number" value={tiktokReach} onChange={e => setTiktokReach(e.target.value)}
                      placeholder="100000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                    <button onClick={() => { saveSocialMetric('tiktok', 'tiktok_reach_per_post', parseFloat(tiktokReach)); setTiktokReach('') }}
                      disabled={saving || !tiktokReach} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Est. Price/Post (£):</label>
                    <input type="number" value={tiktokPricePost} onChange={e => setTiktokPricePost(e.target.value)}
                      placeholder="500" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                    <button onClick={() => { saveSocialMetric('tiktok', 'tiktok_price_per_post', parseFloat(tiktokPricePost)); setTiktokPricePost('') }}
                      disabled={saving || !tiktokPricePost} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Followers Gained" current={tt.followers_gained || tt.followers || 0} target={KPI_GOALS_2026.TIKTOK.NEW_FOLLOWERS} unit="" />
              <MetricCard label="Engagement Rate" current={tt.engagement_rate || tt.engagement || 0} target={KPI_GOALS_2026.TIKTOK.ENGAGEMENT_RATE} unit="%" />
              <MetricCard label="Reach Per Post" current={tt.reach || 0} target={KPI_GOALS_2026.TIKTOK.REACH_PER_POST} unit="" info={METRIC_INFO['Reach Per Post']} />
              <MetricCard label="Est. Price/Post" current={tt.estimated_price_post || 0} target={KPI_GOALS_2026.TIKTOK.PRICE_PER_POST} unit="£" />
            </div>
          </section>

          {/* FACEBOOK */}
          <section className="mb-4">
            <div className="flex items-center gap-3 mb-4 p-4 bg-navy-800 rounded-xl border border-blue-900/30">
              <div className="bg-blue-600 p-2 rounded-lg"><Facebook className="w-5 h-5 text-white" /></div>
              <h3 className="text-xl font-bold text-white">Facebook</h3>
              <button onClick={() => setShowFacebookManual(!showFacebookManual)}
                className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1">
                <Settings className="w-3 h-3" /> Manual Input
              </button>
            </div>
            {showFacebookManual && (
              <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-blue-900/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-300 font-medium">Manual Data Entry (Facebook Insights)</p>
                  <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                    className="px-2 py-1 bg-navy-900 border border-navy-600 rounded text-cream-100 text-xs">
                    {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Platform Revenue (£):</label>
                    <input type="number" value={fbRevenue} onChange={e => setFbRevenue(e.target.value)}
                      placeholder="5000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                    <button onClick={() => { saveSocialMetric('facebook', 'facebook_platform_revenue', parseFloat(fbRevenue)); setFbRevenue('') }}
                      disabled={saving || !fbRevenue} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-400 whitespace-nowrap">Story Impressions:</label>
                    <input type="number" value={fbStoryImpressions} onChange={e => setFbStoryImpressions(e.target.value)}
                      placeholder="500000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-28" />
                    <button onClick={() => { saveSocialMetric('facebook', 'facebook_story_impressions', parseFloat(fbStoryImpressions)); setFbStoryImpressions('') }}
                      disabled={saving || !fbStoryImpressions} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Followers Gained" current={fb.followers_gained || fb.followers || 0} target={KPI_GOALS_2026.FACEBOOK.FOLLOWERS} unit="" />
              <MetricCard label="Platform Revenue" current={fb.platform_revenue || 0} target={KPI_GOALS_2026.FACEBOOK.REVENUE} unit="£" info={METRIC_INFO['Platform Revenue']} highlight />
              <MetricCard label="Total Views" current={fb.total_views || 0} target={KPI_GOALS_2026.FACEBOOK.TOTAL_VIEWS} unit="" info={METRIC_INFO['FB Total Views']} />
              <MetricCard label="3-Sec Views" current={fb.views_3s || 0} target={KPI_GOALS_2026.FACEBOOK.VIEWS_3S} unit="" info={METRIC_INFO['3-Sec Views']} />
              <MetricCard label="1-Min Views" current={fb.views_1min || 0} target={KPI_GOALS_2026.FACEBOOK.VIEWS_1MIN} unit="" info={METRIC_INFO['1-Min Views']} />
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}

function MetricCard({ label, current, target, unit, info, highlight }: {
  label: string
  current: number
  target: number
  unit: string
  info?: string
  highlight?: boolean
}) {
  const progress = Math.min(Math.round((current / (target || 1)) * 100), 100)
  const formattedCurrent = unit === '£' ? formatCurrency(current) : current.toLocaleString() + unit
  const formattedTarget = unit === '£' ? formatCurrency(target) : target.toLocaleString() + unit

  return (
    <div className={`bg-navy-800 p-4 rounded-lg border transition-colors ${highlight ? 'border-blue-500/50 bg-blue-900/20' : 'border-navy-700 hover:border-gold-500/50'}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
        {info && (
          <div className="relative group">
            <Info className="w-3.5 h-3.5 text-gray-500 hover:text-gold-500 cursor-help transition-colors" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-xs text-gray-300 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-navy-600" />
              {info}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-xl font-bold text-white">{formattedCurrent}</span>
        <span className="text-xs text-gray-500">/ {formattedTarget}</span>
      </div>
      <div className="w-full bg-navy-900 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-gold-500'}`}
          style={{ width: `${progress}%` }} />
      </div>
      <p className="text-right text-[10px] text-gold-500 mt-1">{progress}% Reached</p>
    </div>
  )
}
