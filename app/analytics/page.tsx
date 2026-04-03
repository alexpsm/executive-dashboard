'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts'
import { BarChart3, Youtube, Instagram, Facebook, Video } from 'lucide-react'
import { format } from 'date-fns'
import { KPI_GOALS_2026 } from '@/lib/goals'

type TimeRange = '7' | '14' | '30'

const fmtNum = (n: number) => {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
    return n.toLocaleString()
}

export default function SocialAnalytics() {
    const [data, setData] = useState<any[]>([])
    const [range, setRange] = useState<TimeRange>('14')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/social/history?days=${range}`)
            .then(res => res.json())
            .then(res => {
                if (res.success && res.daily) setData(res.daily)
                setLoading(false)
            })
            .catch(err => { console.error(err); setLoading(false) })
    }, [range])

    const getPlatformData = (platform: string) =>
        data.map(item => ({ metric_date: item.date, ...(item[platform] || {}) }))

    if (loading) return (
        <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading Analytics...</div>
    )

    return (
        <div className="min-h-screen bg-navy-900 text-cream-100">
            <Header />
            <main className="max-w-7xl mx-auto px-4 py-8">

                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-gold-500" /> Social Analytics
                        </h1>
                        <p className="text-gray-400">2026 KPI Progress — Time-series with pace tracking</p>
                    </div>
                    <div className="flex bg-navy-800 p-1 rounded-xl border border-navy-700">
                        {(['7', '14', '30'] as TimeRange[]).map(r => (
                            <button key={r} onClick={() => setRange(r)}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${range === r
                                    ? 'bg-gold-500 text-navy-900 shadow-lg'
                                    : 'text-gray-400 hover:text-white'}`}>
                                {r} Days
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12">

                    {/* YOUTUBE */}
                    <PlatformSection
                        title="YouTube Performance"
                        icon={<Youtube className="w-6 h-6 text-red-500" />}
                        iconBg="bg-red-500/20"
                        data={getPlatformData('youtube')}
                        range={range}
                        charts={[
                            { key: 'views',         label: 'Daily Views',        color: '#ef4444', yearlyGoal: KPI_GOALS_2026.YOUTUBE.VIEWS },
                            { key: 'followers',     label: 'Net Subscribers',    color: '#f87171', yearlyGoal: KPI_GOALS_2026.YOUTUBE.SUBSCRIBERS },
                            { key: 'yt_ad_revenue', label: 'Ad Revenue (£)',     color: '#10b981', yearlyGoal: KPI_GOALS_2026.YOUTUBE.REVENUE },
                            { key: 'engagement',    label: 'Engagement Rate %',  color: '#fb923c', targetRate: KPI_GOALS_2026.YOUTUBE.ENGAGEMENT_RATE },
                        ]}
                    />

                    {/* INSTAGRAM */}
                    <PlatformSection
                        title="Instagram Growth"
                        icon={<Instagram className="w-6 h-6 text-pink-500" />}
                        iconBg="bg-pink-500/20"
                        data={getPlatformData('instagram')}
                        range={range}
                        charts={[
                            { key: 'followers',     label: 'Daily Followers Gained', color: '#ec4899', yearlyGoal: KPI_GOALS_2026.INSTAGRAM.FOLLOWERS },
                            { key: 'engagement',    label: 'Engagement Rate %',      color: '#f472b6', targetRate: KPI_GOALS_2026.INSTAGRAM.ENGAGEMENT_RATE },
                            { key: 'avg_reach_post',label: 'Avg Reach per Post',     color: '#a855f7', yearlyGoal: KPI_GOALS_2026.INSTAGRAM.AVG_REACH_POST },
                        ]}
                    />

                    {/* TIKTOK */}
                    <PlatformSection
                        title="TikTok Performance"
                        icon={<Video className="w-6 h-6 text-white" />}
                        iconBg="bg-gray-700"
                        data={getPlatformData('tiktok')}
                        range={range}
                        charts={[
                            { key: 'followers_gained', label: 'Daily Followers Gained', color: '#ffffff', yearlyGoal: KPI_GOALS_2026.TIKTOK.NEW_FOLLOWERS },
                            { key: 'views',            label: 'Daily Views',             color: '#9ca3af' },
                            { key: 'engagement',       label: 'Engagement Rate %',       color: '#2dd4bf', targetRate: KPI_GOALS_2026.TIKTOK.ENGAGEMENT_RATE },
                        ]}
                    />

                    {/* FACEBOOK */}
                    <PlatformSection
                        title="Facebook Scale"
                        icon={<Facebook className="w-6 h-6 text-blue-500" />}
                        iconBg="bg-blue-500/20"
                        data={getPlatformData('facebook')}
                        range={range}
                        charts={[
                            { key: 'impressions', label: 'Total Views (Daily)',      color: '#3b82f6', yearlyGoal: KPI_GOALS_2026.FACEBOOK.TOTAL_VIEWS },
                            { key: 'views',       label: '3-Second Video Views',     color: '#60a5fa', yearlyGoal: KPI_GOALS_2026.FACEBOOK.VIEWS_3S },
                            { key: 'followers',   label: 'Daily Followers Gained',   color: '#93c5fd', yearlyGoal: KPI_GOALS_2026.FACEBOOK.FOLLOWERS },
                        ]}
                    />

                </div>
            </main>
        </div>
    )
}

interface ChartMetric {
    key: string
    label: string
    color: string
    /** Cumulative metric: annual total goal. Pace = sum(period) / (goal/365*days) */
    yearlyGoal?: number
    /** Rate/average metric: fixed target value. Pace = avg(period) / target */
    targetRate?: number
}

interface PlatformSectionProps {
    title: string
    icon: React.ReactNode
    iconBg: string
    data: any[]
    charts: ChartMetric[]
    range: string
    note?: string
}

function PlatformSection({ title, icon, iconBg, data, charts, range, note }: PlatformSectionProps) {
    return (
        <section>
            <div className="flex items-center justify-between gap-3 mb-6 p-4 bg-navy-800/50 rounded-xl border border-navy-700/50">
                <div className="flex items-center gap-3">
                    <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                </div>
                {note && (
                    <span className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">{note}</span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {charts.map(metric => {
                    const days = parseInt(range)
                    const values = data.map(d => Number(d[metric.key]) || 0)
                    const nonZeroValues = values.filter(v => v > 0)

                    // Cumulative metric: sum vs period target
                    let periodTarget = 0
                    let periodActual = 0
                    let refLineY = 0
                    let paceLabel = ''

                    if (metric.yearlyGoal) {
                        const dailyTarget = metric.yearlyGoal / 365
                        refLineY = dailyTarget
                        periodTarget = dailyTarget * days
                        periodActual = values.reduce((s, v) => s + v, 0)
                        paceLabel = `${days}d target`
                    } else if (metric.targetRate) {
                        refLineY = metric.targetRate
                        periodTarget = metric.targetRate
                        // Use average of non-zero values, or last value if available
                        periodActual = nonZeroValues.length > 0
                            ? nonZeroValues.reduce((s, v) => s + v, 0) / nonZeroValues.length
                            : 0
                        paceLabel = 'target'
                    }

                    const hasPace = periodTarget > 0
                    const pace = hasPace ? Math.round((periodActual / periodTarget) * 100) : 0
                    const paceColor = pace >= 100 ? '#10b981' : pace >= 75 ? '#f59e0b' : '#ef4444'

                    return (
                        <div key={metric.key} className="bg-navy-800 p-6 rounded-2xl border border-navy-700 shadow-xl">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                {metric.label}
                            </h3>

                            {hasPace && (
                                <div className="mb-5 p-3 bg-navy-900/60 rounded-lg border border-navy-700/50">
                                    <div className="flex items-center justify-between text-xs mb-2 gap-2 flex-wrap">
                                        <span className="text-gray-500">{paceLabel}: <span className="text-gray-300 font-medium">{fmtNum(periodTarget)}</span></span>
                                        <span className="text-gray-500">actual: <span className="text-gray-300 font-medium">{fmtNum(periodActual)}</span></span>
                                        <span className="font-bold" style={{ color: paceColor }}>{pace}% of pace</span>
                                    </div>
                                    <div className="w-full bg-navy-700 rounded-full h-1.5">
                                        <div className="h-1.5 rounded-full transition-all duration-700"
                                            style={{ width: `${Math.min(pace, 100)}%`, backgroundColor: paceColor }} />
                                    </div>
                                </div>
                            )}

                            <div className="h-[220px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data}>
                                        <defs>
                                            <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="metric_date" stroke="#64748b" fontSize={11}
                                            tickFormatter={str => format(new Date(str), 'MMM d')} minTickGap={25} />
                                        <YAxis stroke="#64748b" fontSize={11}
                                            domain={refLineY > 0
                                                ? [0, (dataMax: number) => Math.max(dataMax * 1.1, refLineY * 1.2)]
                                                : [0, 'auto']}
                                            tickFormatter={v => {
                                                if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
                                                if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
                                                if (v >= 1e3) return `${(v / 1e3).toFixed(1)}k`
                                                return Math.round(v).toString()
                                            }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                            labelStyle={{ color: '#f8fafc', marginBottom: '4px' }}
                                            itemStyle={{ color: metric.color }}
                                            labelFormatter={label => format(new Date(label), 'MMMM d, yyyy')} />
                                        {refLineY > 0 && (
                                            <ReferenceLine
                                                y={refLineY}
                                                stroke="#f59e0b"
                                                strokeDasharray="5 3"
                                                strokeWidth={1.5}
                                                label={{ value: metric.yearlyGoal ? 'daily target' : 'goal', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }}
                                            />
                                        )}
                                        <Area type="monotone" dataKey={metric.key} stroke={metric.color} strokeWidth={2.5}
                                            fillOpacity={1} fill={`url(#grad-${metric.key})`}
                                            animationDuration={1200} connectNulls={true} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
