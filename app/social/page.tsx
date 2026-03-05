'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
    LayoutDashboard, Youtube, Instagram, Facebook, Video, ArrowUp, ArrowDown, ExternalLink, Calendar, Settings, Info
} from 'lucide-react'
import { KPI_GOALS_2026 } from '@/lib/goals'
import { formatCurrency } from '@/lib/utils'

// Metric explanations for info tooltips
const METRIC_INFO: Record<string, string> = {
    // YouTube
    'Total Views': 'All views on any YouTube content during 2026, including videos published before 2026',
    'Video Views': 'Views on regular videos (non-Shorts) during 2026, on any video regardless of publish date',
    'Shorts Views': 'Views on YouTube Shorts during 2026, on any Short regardless of publish date',
    'Ad Revenue': 'YTD estimated ad revenue from YouTube Partner Program',
    'Subscribers Gained': 'Net new subscribers in 2026 (gained minus lost)',
    'Impression CTR': 'Click-through rate from YouTube impressions to video views (from YouTube Studio)',
    'Engagement Rate': 'Average (likes + comments + shares) / views on videos published in 2026',
    'Avg Video Views': 'Average views per regular video published in 2026',
    'Avg Shorts Views': 'Average views per Short published in 2026',

    // Instagram
    'Followers Gained': 'Net new followers gained in 2026',
    'Avg Reach (Post)': 'Average unique accounts reached per feed post in 2026',
    'Avg Reach (Story)': 'Average unique accounts reached per story in 2026',
    'Est. Price/Post': 'Estimated sponsorship value per feed post based on engagement',
    'Est. Price/Story': 'Estimated sponsorship value per story based on reach',

    // TikTok
    'Reach Per Post': 'Average unique accounts reached per TikTok video',

    // Facebook
    'Platform Revenue': 'YTD revenue from Facebook monetization (manual input - not available via API)',
    'FB Total Views': 'Total video + post impressions during 2026 (excludes stories - not available via API)',
    '3-Sec Views': 'Video views where the video played for at least 3 seconds',
    '1-Min Views': 'Estimated video views of 60+ seconds based on retention data',
}

export default function SocialHub() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [showManualInput, setShowManualInput] = useState(false)
    const [manualCtr, setManualCtr] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchStats = () => {
        fetch('/api/health')
            .then(res => res.json())
            .then(data => {
                if (data.stats && data.stats.social) {
                    setStats(data.stats.social)
                }
                setLoading(false)
            })
            .catch(err => console.error(err))
    }

    useEffect(() => {
        fetchStats()
    }, [])

    const saveManualCtr = async () => {
        if (!manualCtr || isNaN(parseFloat(manualCtr))) return
        setSaving(true)
        try {
            const res = await fetch('/api/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metrics: [{
                        platform: 'youtube',
                        metric_key: 'youtube_ctr',
                        metric_value: parseFloat(manualCtr)
                    }]
                })
            })
            if (res.ok) {
                setShowManualInput(false)
                setManualCtr('')
                fetchStats() // Refresh data
            }
        } catch (err) {
            console.error('Failed to save CTR:', err)
        }
        setSaving(false)
    }

    const getProgress = (current: number, goal: number) => {
        if (!goal) return 0
        return Math.min(Math.round((current / (goal || 1)) * 100), 100)
    }

    if (loading) return <div className="min-h-screen bg-navy-900 flex items-center justify-center text-white">Loading Social Data...</div>

    const youtube = stats?.youtube || {}
    const instagram = stats?.instagram || {}
    const tiktok = stats?.tiktok || {}
    const facebook = stats?.facebook || {}

    return (
        <div className="min-h-screen bg-navy-900 text-cream-100">
            <Header />
            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Social Hub 2026</h1>
                        <p className="text-gray-400">Granular tracking of audience, engagement, and content performance.</p>
                    </div>

                </div>

                {/* YOUTUBE SECTION */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-navy-800 rounded-xl border border-red-900/30">
                        <div className="bg-red-600 p-2 rounded-lg"><Youtube className="w-6 h-6 text-white" /></div>
                        <h2 className="text-2xl font-bold text-white">YouTube</h2>
                        <button
                            onClick={() => setShowManualInput(!showManualInput)}
                            className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1"
                            title="Manual input for CTR (from YouTube Studio)"
                        >
                            <Settings className="w-3 h-3" />
                            Manual
                        </button>
                        <span className="text-sm bg-navy-900 px-3 py-1 rounded-full text-red-400 font-mono">2026 Goals</span>
                    </div>

                    {showManualInput && (
                        <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                            <p className="text-xs text-gray-400 mb-2">
                                Enter Impression CTR from YouTube Studio → Analytics → Reach tab
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    value={manualCtr}
                                    onChange={(e) => setManualCtr(e.target.value)}
                                    placeholder="e.g., 5.2"
                                    className="bg-navy-900 border border-navy-600 rounded px-3 py-1.5 text-white text-sm w-24 focus:border-gold-500 focus:outline-none"
                                />
                                <span className="text-gray-400 text-sm">%</span>
                                <button
                                    onClick={saveManualCtr}
                                    disabled={saving || !manualCtr}
                                    className="bg-gold-500 hover:bg-gold-600 disabled:bg-gray-600 text-navy-900 px-3 py-1.5 rounded text-sm font-medium transition-colors"
                                >
                                    {saving ? 'Saving...' : 'Save CTR'}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard label="Total Views" current={youtube.views || 0} target={KPI_GOALS_2026.YOUTUBE.VIEWS + KPI_GOALS_2026.YOUTUBE.SHORTS_VIEWS} unit="" info={METRIC_INFO['Total Views']} />
                        <MetricCard label="Video Views" current={(youtube.views || 0) - (youtube.shorts_views || 0)} target={KPI_GOALS_2026.YOUTUBE.VIEWS} unit="" info={METRIC_INFO['Video Views']} />
                        <MetricCard label="Shorts Views" current={youtube.shorts_views || 0} target={KPI_GOALS_2026.YOUTUBE.SHORTS_VIEWS} unit="" info={METRIC_INFO['Shorts Views']} />
                        <MetricCard label="Ad Revenue" current={youtube.ad_revenue || 0} target={KPI_GOALS_2026.YOUTUBE.REVENUE} unit="£" info={METRIC_INFO['Ad Revenue']} />

                        <MetricCard label="Subscribers Gained" current={youtube.subscribers_gained || youtube.followers || 0} target={KPI_GOALS_2026.YOUTUBE.SUBSCRIBERS} unit="" info={METRIC_INFO['Subscribers Gained']} />
                        <MetricCard label="Impression CTR" current={youtube.ctr || 0} target={KPI_GOALS_2026.YOUTUBE.CTR_PERCENT} unit="%" info={METRIC_INFO['Impression CTR']} />
                        <MetricCard label="Engagement Rate" current={youtube.engagement_rate || 0} target={KPI_GOALS_2026.YOUTUBE.ENGAGEMENT_RATE} unit="%" info={METRIC_INFO['Engagement Rate']} />
                        <MetricCard label="Avg Video Views" current={youtube.avg_video_views || 0} target={KPI_GOALS_2026.YOUTUBE.AVG_VIDEO_VIEWS} unit="" info={METRIC_INFO['Avg Video Views']} />
                        <MetricCard label="Avg Shorts Views" current={youtube.avg_shorts_views || 0} target={KPI_GOALS_2026.YOUTUBE.AVG_SHORTS_VIEWS} unit="" info={METRIC_INFO['Avg Shorts Views']} />
                    </div>
                </section>

                {/* INSTAGRAM SECTION */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-navy-800 rounded-xl border border-pink-900/30">
                        <div className="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-2 rounded-lg"><Instagram className="w-6 h-6 text-white" /></div>
                        <h2 className="text-2xl font-bold text-white">Instagram</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard label="Followers Gained" current={instagram.followers_gained || instagram.followers || 0} target={KPI_GOALS_2026.INSTAGRAM.FOLLOWERS} unit="" info={METRIC_INFO['Followers Gained']} />
                        <MetricCard label="Engagement Rate" current={instagram.engagement_rate || instagram.engagement || 0} target={KPI_GOALS_2026.INSTAGRAM.ENGAGEMENT_RATE} unit="%" info={METRIC_INFO['Engagement Rate']} />
                        <MetricCard label="Avg Reach (Post)" current={instagram.avg_reach_post || 0} target={KPI_GOALS_2026.INSTAGRAM.AVG_REACH_POST} unit="" info={METRIC_INFO['Avg Reach (Post)']} />
                        <MetricCard label="Avg Reach (Story)" current={instagram.avg_reach_story || instagram.story_reach || 0} target={KPI_GOALS_2026.INSTAGRAM.AVG_REACH_STORY} unit="" info={METRIC_INFO['Avg Reach (Story)']} />
                        <MetricCard label="Est. Price/Post" current={instagram.estimated_price_post || 0} target={KPI_GOALS_2026.INSTAGRAM.PRICE_PER_POST} unit="£" info={METRIC_INFO['Est. Price/Post']} />
                        <MetricCard label="Est. Price/Story" current={instagram.estimated_price_story || 0} target={KPI_GOALS_2026.INSTAGRAM.PRICE_PER_STORY} unit="£" info={METRIC_INFO['Est. Price/Story']} />
                    </div>
                </section>

                {/* TIKTOK SECTION */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-navy-800 rounded-xl border border-gray-700">
                        <div className="bg-black border border-gray-600 p-2 rounded-lg"><Video className="w-6 h-6 text-white" /></div>
                        <h2 className="text-2xl font-bold text-white">TikTok</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard label="Followers Gained" current={tiktok.followers_gained || tiktok.followers || 0} target={KPI_GOALS_2026.TIKTOK.NEW_FOLLOWERS} unit="" info={METRIC_INFO['Followers Gained']} />
                        <MetricCard label="Engagement Rate" current={tiktok.engagement_rate || tiktok.engagement || 0} target={KPI_GOALS_2026.TIKTOK.ENGAGEMENT_RATE} unit="%" info={METRIC_INFO['Engagement Rate']} />
                        <MetricCard label="Reach Per Post" current={tiktok.reach || 0} target={KPI_GOALS_2026.TIKTOK.REACH_PER_POST} unit="" info={METRIC_INFO['Reach Per Post']} />
                    </div>
                </section>

                {/* FACEBOOK SECTION */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-navy-800 rounded-xl border border-blue-900/30">
                        <div className="bg-blue-600 p-2 rounded-lg"><Facebook className="w-6 h-6 text-white" /></div>
                        <h2 className="text-2xl font-bold text-white">Facebook</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard label="Followers Gained" current={facebook.followers_gained || facebook.followers || 0} target={KPI_GOALS_2026.FACEBOOK.FOLLOWERS} unit="" info={METRIC_INFO['Followers Gained']} />
                        <MetricCard label="Platform Revenue" current={facebook.revenue || 0} target={KPI_GOALS_2026.FACEBOOK.REVENUE} unit="£" info={METRIC_INFO['Platform Revenue']} />
                        <MetricCard label="Total Views" current={facebook.total_views || 0} target={KPI_GOALS_2026.FACEBOOK.TOTAL_VIEWS} unit="" info="Total video + post impressions during 2026 (excludes stories - not available via API)" />
                        <MetricCard label="3-Sec Views" current={facebook.views_3s || 0} target={KPI_GOALS_2026.FACEBOOK.VIEWS_3S} unit="" info={METRIC_INFO['3-Sec Views']} />
                        <MetricCard label="1-Min Views" current={facebook.views_1min || 0} target={KPI_GOALS_2026.FACEBOOK.VIEWS_1MIN} unit="" info={METRIC_INFO['1-Min Views']} />
                    </div>
                </section>

            </main>
        </div>
    )
}

function MetricCard({ label, current, target, unit, info }: { label: string, current: number, target: number, unit: string, info?: string }) {
    const progress = Math.min(Math.round((current / (target || 1)) * 100), 100)
    const formattedCurrent = unit === '£' ? formatCurrency(current) : current.toLocaleString() + unit
    const formattedTarget = unit === '£' ? formatCurrency(target) : target.toLocaleString() + unit

    return (
        <div className="bg-navy-800 p-4 rounded-lg border border-navy-700 hover:border-gold-500/50 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
                <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
                {info && (
                    <div className="relative group">
                        <Info className="w-3.5 h-3.5 text-gray-500 hover:text-gold-500 cursor-help transition-colors" />
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-xs text-gray-300 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-navy-600"></div>
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
                <div
                    className={`h-1.5 rounded-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-gold-500'}`}
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-right text-[10px] text-gold-500 mt-1">{progress}% Reached</p>
        </div>
    )
}
