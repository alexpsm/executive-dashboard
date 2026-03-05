'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts'
import {
    BarChart3, Youtube, Instagram, Facebook, Video, Calendar
} from 'lucide-react'
import { format } from 'date-fns'

type TimeRange = '7' | '14' | '30'

export default function SocialAnalytics() {
    const [data, setData] = useState<any[]>([])
    const [range, setRange] = useState<TimeRange>('14')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        fetch(`/api/social/history?days=${range}`)
            .then(res => res.json())
            .then(res => {
                if (res.success && res.daily) {
                    setData(res.daily)
                }
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [range])

    // Extract platform-specific data from the grouped daily format
    // Each item in data is { date, youtube: {...}, instagram: {...}, ... }
    const getPlatformData = (platform: string) => {
        return data
            .filter(item => item[platform] !== null && item[platform] !== undefined)
            .map(item => ({
                metric_date: item.date,
                ...item[platform]
            }))
    }

    if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading Analytics...</div>

    return (
        <div className="min-h-screen bg-navy-900 text-cream-100">
            <Header />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-gold-500" /> Social Analytics
                        </h1>
                        <p className="text-gray-400">Time-series tracking of your social growth and engagement.</p>
                    </div>

                    <div className="flex bg-navy-800 p-1 rounded-xl border border-navy-700">
                        {(['7', '14', '30'] as TimeRange[]).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${range === r
                                    ? 'bg-gold-500 text-navy-900 shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                {r} Days
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    {/* YOUTUBE SECTION */}
                    <AnalyticsSection
                        title="YouTube Performance"
                        icon={<Youtube className="text-red-500" />}
                        data={getPlatformData('youtube')}
                        platforms={['youtube']}
                        metrics={[
                            { key: 'views', label: 'Total Views', color: '#ef4444' },
                            { key: 'followers', label: 'Net Subscribers', color: '#f87171' },
                            { key: 'yt_ad_revenue', label: 'Ad Revenue (£)', color: '#10b981' },
                            { key: 'engagement', label: 'Engagement Rate %', color: '#fb923c' }
                        ]}
                    />

                    {/* INSTAGRAM SECTION */}
                    <AnalyticsSection
                        title="Instagram Growth"
                        icon={<Instagram className="text-pink-500" />}
                        data={getPlatformData('instagram')}
                        platforms={['instagram']}
                        metrics={[
                            { key: 'followers', label: 'Daily Followers Gained', color: '#ec4899' },
                            { key: 'engagement', label: 'Engagement Rate %', color: '#f472b6' },
                            { key: 'avg_reach_post', label: 'Avg Reach (Post)', color: '#a855f7' },
                            { key: 'story_reach', label: 'Avg Reach (Story)', color: '#c084fc' }
                        ]}
                    />

                    {/* TIKTOK SECTION */}
                    <AnalyticsSection
                        title="TikTok Viral"
                        icon={<Video className="text-white" />}
                        data={getPlatformData('tiktok')}
                        platforms={['tiktok']}
                        metrics={[
                            { key: 'followers', label: 'Daily Followers Gained', color: '#ffffff' },
                            { key: 'views', label: 'Daily Views', color: '#9ca3af' },
                            { key: 'engagement', label: 'Engagement Rate %', color: '#2dd4bf' }
                        ]}
                    />

                    {/* FACEBOOK SECTION */}
                    <AnalyticsSection
                        title="Facebook Scale"
                        icon={<Facebook className="text-blue-500" />}
                        data={getPlatformData('facebook')}
                        platforms={['facebook']}
                        metrics={[
                            { key: 'impressions', label: 'Total Views (Daily)', color: '#3b82f6' },
                            { key: 'views', label: '3-Second Video Views', color: '#60a5fa' },
                            { key: 'followers', label: 'Daily Followers Gained', color: '#93c5fd' }
                        ]}
                    />
                </div>
            </main>
        </div>
    )
}

function AnalyticsSection({ title, icon, data, metrics }: any) {
    return (
        <section>
            <div className="flex items-center gap-3 mb-6 p-4 bg-navy-800/50 rounded-xl border border-navy-700/50">
                <div className="p-2 bg-navy-800 rounded-lg">{icon}</div>
                <h2 className="text-2xl font-bold text-white">{title}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {metrics.map((metric: any) => (
                    <div key={metric.key} className="bg-navy-800 p-6 rounded-2xl border border-navy-700 shadow-xl">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">{metric.label}</h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data}>
                                    <defs>
                                        <linearGradient id={`color-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis
                                        dataKey="metric_date"
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickFormatter={(str) => format(new Date(str), 'MMM d')}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        fontSize={12}
                                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                        labelStyle={{ color: '#f8fafc', marginBottom: '4px' }}
                                        itemStyle={{ color: metric.color }}
                                        labelFormatter={(label) => format(new Date(label), 'MMMM d, yyyy')}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey={metric.key}
                                        stroke={metric.color}
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill={`url(#color-${metric.key})`}
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
