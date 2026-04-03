'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import {
    Youtube, Instagram, Facebook, Video, Info, Settings, Check, X
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
    'Avg Reach (Story)': 'Average unique accounts reached per story in 2026 (manual input)',
    'Est. Price/Post': 'Estimated sponsorship value per feed post (HypeAuditor data)',
    'Est. Price/Story': 'Estimated sponsorship value per story (HypeAuditor data)',

    // TikTok
    'Reach Per Post': 'Average unique accounts reached per TikTok video',

    // Facebook
    'Platform Revenue': 'YTD revenue from Facebook monetization (manual input - crucial KPI)',
    'FB Total Views': 'Total video + post impressions during 2026 (excludes stories - not available via API)',
    '3-Sec Views': 'Video views where the video played for at least 3 seconds',
    '1-Min Views': 'Estimated video views of 60+ seconds based on retention data',
}

export default function SocialHub() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // Manual input states
    const [showYouTubeManual, setShowYouTubeManual] = useState(false)
    const [showInstagramManual, setShowInstagramManual] = useState(false)
    const [showFacebookManual, setShowFacebookManual] = useState(false)
    const [showTikTokManual, setShowTikTokManual] = useState(false)

    // Input values
    const [manualCtr, setManualCtr] = useState('')
    const [igStoryReach, setIgStoryReach] = useState('')
    const [igPricePost, setIgPricePost] = useState('')
    const [igPriceStory, setIgPriceStory] = useState('')
    const [fbRevenue, setFbRevenue] = useState('')
    const [tiktokFollowers, setTiktokFollowers] = useState('')
    const [tiktokEngagement, setTiktokEngagement] = useState('')
    const [tiktokReach, setTiktokReach] = useState('')

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

    const saveMetric = async (platform: string, metricKey: string, value: number) => {
        setSaving(true)
        try {
            await fetch('/api/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metrics: [{
                        platform,
                        metric_key: metricKey,
                        metric_value: value
                    }]
                })
            })
            fetchStats()
        } catch (err) {
            console.error('Failed to save:', err)
        }
        setSaving(false)
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
                            onClick={() => setShowYouTubeManual(!showYouTubeManual)}
                            className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1"
                        >
                            <Settings className="w-3 h-3" />
                            Manual Input
                        </button>
                    </div>

                    {showYouTubeManual && (
                        <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                            <p className="text-sm text-gray-300 mb-3 font-medium">Manual Data Entry (from YouTube Studio)</p>
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400">Impression CTR:</label>
                                    <input type="number" step="0.1" value={manualCtr} onChange={(e) => setManualCtr(e.target.value)}
                                        placeholder="5.2" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                                    <span className="text-gray-400 text-sm">%</span>
                                    <button onClick={() => { saveMetric('youtube', 'youtube_ctr', parseFloat(manualCtr)); setManualCtr('') }}
                                        disabled={saving || !manualCtr} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
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
                    </div>
                </section>

                {/* INSTAGRAM SECTION */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-navy-800 rounded-xl border border-pink-900/30">
                        <div className="bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600 p-2 rounded-lg"><Instagram className="w-6 h-6 text-white" /></div>
                        <h2 className="text-2xl font-bold text-white">Instagram</h2>
                        <button
                            onClick={() => setShowInstagramManual(!showInstagramManual)}
                            className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1"
                        >
                            <Settings className="w-3 h-3" />
                            Manual Input
                        </button>
                    </div>

                    {showInstagramManual && (
                        <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                            <p className="text-sm text-gray-300 mb-3 font-medium">Manual Data Entry (HypeAuditor & Instagram Insights)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">Avg Story Reach:</label>
                                    <input type="number" value={igStoryReach} onChange={(e) => setIgStoryReach(e.target.value)}
                                        placeholder="50000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                                    <button onClick={() => { saveMetric('instagram', 'instagram_avg_reach_story', parseFloat(igStoryReach)); setIgStoryReach('') }}
                                        disabled={saving || !igStoryReach} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">Est. Price/Post (£):</label>
                                    <input type="number" value={igPricePost} onChange={(e) => setIgPricePost(e.target.value)}
                                        placeholder="500" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                                    <button onClick={() => { saveMetric('instagram', 'instagram_price_per_post', parseFloat(igPricePost)); setIgPricePost('') }}
                                        disabled={saving || !igPricePost} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">Est. Price/Story (£):</label>
                                    <input type="number" value={igPriceStory} onChange={(e) => setIgPriceStory(e.target.value)}
                                        placeholder="200" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                                    <button onClick={() => { saveMetric('instagram', 'instagram_price_per_story', parseFloat(igPriceStory)); setIgPriceStory('') }}
                                        disabled={saving || !igPriceStory} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard label="Followers Gained" current={instagram.followers_gained || instagram.followers || 0} target={KPI_GOALS_2026.INSTAGRAM.FOLLOWERS} unit="" info={METRIC_INFO['Followers Gained']} />
                        <MetricCard label="Engagement Rate" current={instagram.engagement_rate || instagram.engagement || 0} target={KPI_GOALS_2026.INSTAGRAM.ENGAGEMENT_RATE} unit="%" />
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
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">Manual Only (API Restricted)</span>
                        <button
                            onClick={() => setShowTikTokManual(!showTikTokManual)}
                            className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1"
                        >
                            <Settings className="w-3 h-3" />
                            Manual Input
                        </button>
                    </div>

                    {showTikTokManual && (
                        <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-navy-700">
                            <p className="text-sm text-gray-300 mb-3 font-medium">Manual Data Entry (from TikTok Analytics)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">Followers Gained:</label>
                                    <input type="number" value={tiktokFollowers} onChange={(e) => setTiktokFollowers(e.target.value)}
                                        placeholder="10000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                                    <button onClick={() => { saveMetric('tiktok', 'tiktok_followers_gained', parseFloat(tiktokFollowers)); setTiktokFollowers('') }}
                                        disabled={saving || !tiktokFollowers} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">Engagement Rate (%):</label>
                                    <input type="number" step="0.1" value={tiktokEngagement} onChange={(e) => setTiktokEngagement(e.target.value)}
                                        placeholder="5.0" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-20" />
                                    <button onClick={() => { saveMetric('tiktok', 'tiktok_engagement_rate', parseFloat(tiktokEngagement)); setTiktokEngagement('') }}
                                        disabled={saving || !tiktokEngagement} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">Reach Per Post:</label>
                                    <input type="number" value={tiktokReach} onChange={(e) => setTiktokReach(e.target.value)}
                                        placeholder="100000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                                    <button onClick={() => { saveMetric('tiktok', 'tiktok_reach_per_post', parseFloat(tiktokReach)); setTiktokReach('') }}
                                        disabled={saving || !tiktokReach} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard label="Followers Gained" current={tiktok.followers_gained || tiktok.followers || 0} target={KPI_GOALS_2026.TIKTOK.NEW_FOLLOWERS} unit="" />
                        <MetricCard label="Engagement Rate" current={tiktok.engagement_rate || tiktok.engagement || 0} target={KPI_GOALS_2026.TIKTOK.ENGAGEMENT_RATE} unit="%" />
                        <MetricCard label="Reach Per Post" current={tiktok.reach || 0} target={KPI_GOALS_2026.TIKTOK.REACH_PER_POST} unit="" info={METRIC_INFO['Reach Per Post']} />
                    </div>
                </section>

                {/* FACEBOOK SECTION */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6 p-4 bg-navy-800 rounded-xl border border-blue-900/30">
                        <div className="bg-blue-600 p-2 rounded-lg"><Facebook className="w-6 h-6 text-white" /></div>
                        <h2 className="text-2xl font-bold text-white">Facebook</h2>
                        <button
                            onClick={() => setShowFacebookManual(!showFacebookManual)}
                            className="ml-auto text-sm bg-navy-900 px-3 py-1 rounded-full text-gray-400 hover:text-white hover:bg-navy-700 transition-colors flex items-center gap-1"
                        >
                            <Settings className="w-3 h-3" />
                            Manual Input
                        </button>
                    </div>

                    {showFacebookManual && (
                        <div className="mb-4 p-4 bg-navy-800/50 rounded-lg border border-blue-900/50">
                            <p className="text-sm text-gray-300 mb-3 font-medium">Manual Data Entry (Platform Revenue is crucial for KPIs)</p>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 whitespace-nowrap">Platform Revenue (£):</label>
                                    <input type="number" value={fbRevenue} onChange={(e) => setFbRevenue(e.target.value)}
                                        placeholder="5000" className="bg-navy-900 border border-navy-600 rounded px-2 py-1 text-white text-sm w-24" />
                                    <button onClick={() => { saveMetric('facebook', 'facebook_platform_revenue', parseFloat(fbRevenue)); setFbRevenue('') }}
                                        disabled={saving || !fbRevenue} className="p-1 bg-green-500/20 rounded hover:bg-green-500/30 disabled:opacity-50">
                                        <Check className="w-4 h-4 text-green-500" />
                                    </button>
                                </div>
                                <p className="text-xs text-blue-400">Facebook monetization data is not available via API - enter from Creator Studio</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <MetricCard label="Followers Gained" current={facebook.followers_gained || facebook.followers || 0} target={KPI_GOALS_2026.FACEBOOK.FOLLOWERS} unit="" />
                        <MetricCard label="Platform Revenue" current={facebook.revenue || facebook.platform_revenue || 0} target={KPI_GOALS_2026.FACEBOOK.REVENUE} unit="£" info={METRIC_INFO['Platform Revenue']} highlight />
                        <MetricCard label="Total Views" current={facebook.total_views || 0} target={KPI_GOALS_2026.FACEBOOK.TOTAL_VIEWS} unit="" info={METRIC_INFO['FB Total Views']} />
                        <MetricCard label="3-Sec Views" current={facebook.views_3s || 0} target={KPI_GOALS_2026.FACEBOOK.VIEWS_3S} unit="" info={METRIC_INFO['3-Sec Views']} />
                        <MetricCard label="1-Min Views" current={facebook.views_1min || 0} target={KPI_GOALS_2026.FACEBOOK.VIEWS_1MIN} unit="" info={METRIC_INFO['1-Min Views']} />
                    </div>
                </section>

            </main>
        </div>
    )
}

function MetricCard({ label, current, target, unit, info, highlight }: { label: string, current: number, target: number, unit: string, info?: string, highlight?: boolean }) {
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
