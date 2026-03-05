'use client'

import { useState, useEffect } from 'react'
import { Swords, Crown, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface PlatformRanking {
  platform: string
  metrics: { name: string; rank: number; total: number }[]
  winsCount: number
  totalMetrics: number
}

export default function CompetitorStatus() {
  const [platformRankings, setPlatformRankings] = useState<PlatformRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState('')

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        // Get current month (use local time, not UTC to avoid timezone issues)
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const monthStr = `${year}-${month}`
        setCurrentMonth(now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))

        const res = await fetch(`/api/competitors?month=${monthStr}`)
        const data = await res.json()

        if (data.success && data.competitors) {
          const boxingNews = data.competitors.find((c: any) => c.name === 'Boxing News')
          const allCompetitors = data.competitors

          if (boxingNews) {
            const newPlatformRankings: PlatformRanking[] = []

            // Helper to calculate rank for a metric
            const getRank = (competitors: any[], platformKey: string, metricKey: string) => {
              const sorted = competitors
                .filter((c: any) => c[platformKey]?.[metricKey])
                .sort((a: any, b: any) => (b[platformKey]?.[metricKey] || 0) - (a[platformKey]?.[metricKey] || 0))
              const rank = sorted.findIndex((c: any) => c.name === 'Boxing News') + 1
              return { rank, total: sorted.length }
            }

            // Instagram metrics
            if (boxingNews.instagram) {
              const metrics: { name: string; rank: number; total: number }[] = []

              if (boxingNews.instagram.ig_followers) {
                const { rank, total } = getRank(allCompetitors, 'instagram', 'ig_followers')
                metrics.push({ name: 'Followers', rank, total })
              }
              if (boxingNews.instagram.ig_engagement_rate) {
                const { rank, total } = getRank(allCompetitors, 'instagram', 'ig_engagement_rate')
                metrics.push({ name: 'Engagement', rank, total })
              }
              if (boxingNews.instagram.ig_est_reach) {
                const { rank, total } = getRank(allCompetitors, 'instagram', 'ig_est_reach')
                metrics.push({ name: 'Reach', rank, total })
              }

              if (metrics.length > 0) {
                const winsCount = metrics.filter(m => m.rank === 1).length
                newPlatformRankings.push({ platform: 'Instagram', metrics, winsCount, totalMetrics: metrics.length })
              }
            }

            // YouTube metrics
            if (boxingNews.youtube) {
              const metrics: { name: string; rank: number; total: number }[] = []

              if (boxingNews.youtube.yt_subscribers) {
                const { rank, total } = getRank(allCompetitors, 'youtube', 'yt_subscribers')
                metrics.push({ name: 'Subscribers', rank, total })
              }
              if (boxingNews.youtube.yt_video_engagement_rate) {
                const { rank, total } = getRank(allCompetitors, 'youtube', 'yt_video_engagement_rate')
                metrics.push({ name: 'Video Eng.', rank, total })
              }
              if (boxingNews.youtube.yt_videos_avg_views) {
                const { rank, total } = getRank(allCompetitors, 'youtube', 'yt_videos_avg_views')
                metrics.push({ name: 'Avg Views', rank, total })
              }

              if (metrics.length > 0) {
                const winsCount = metrics.filter(m => m.rank === 1).length
                newPlatformRankings.push({ platform: 'YouTube', metrics, winsCount, totalMetrics: metrics.length })
              }
            }

            // TikTok metrics
            if (boxingNews.tiktok) {
              const metrics: { name: string; rank: number; total: number }[] = []

              if (boxingNews.tiktok.tt_followers) {
                const { rank, total } = getRank(allCompetitors, 'tiktok', 'tt_followers')
                metrics.push({ name: 'Followers', rank, total })
              }
              if (boxingNews.tiktok.tt_engagement_rate) {
                const { rank, total } = getRank(allCompetitors, 'tiktok', 'tt_engagement_rate')
                metrics.push({ name: 'Engagement', rank, total })
              }
              if (boxingNews.tiktok.tt_avg_views_90d) {
                const { rank, total } = getRank(allCompetitors, 'tiktok', 'tt_avg_views_90d')
                metrics.push({ name: 'Avg Views', rank, total })
              }

              if (metrics.length > 0) {
                const winsCount = metrics.filter(m => m.rank === 1).length
                newPlatformRankings.push({ platform: 'TikTok', metrics, winsCount, totalMetrics: metrics.length })
              }
            }

            setPlatformRankings(newPlatformRankings)
          }
        }
      } catch (error) {
        console.error('Failed to fetch competitor rankings:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRankings()
  }, [])

  const getWinsColor = (wins: number, total: number) => {
    const ratio = wins / total
    if (ratio >= 0.66) return 'text-gold-500'
    if (ratio >= 0.33) return 'text-green-400'
    return 'text-gray-400'
  }

  const getWinsBg = (wins: number, total: number) => {
    const ratio = wins / total
    if (ratio >= 0.66) return 'bg-gold-500/20'
    if (ratio >= 0.33) return 'bg-green-500/20'
    return 'bg-navy-800/50'
  }

  if (loading) {
    return (
      <div className="card-premium border-gold-500/20 animate-pulse">
        <div className="h-6 bg-navy-800 rounded w-2/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-navy-800 rounded"></div>
          <div className="h-10 bg-navy-800 rounded"></div>
          <div className="h-10 bg-navy-800 rounded"></div>
        </div>
      </div>
    )
  }

  // Calculate overall wins
  const totalWins = platformRankings.reduce((sum, p) => sum + p.winsCount, 0)
  const totalMetrics = platformRankings.reduce((sum, p) => sum + p.totalMetrics, 0)
  const isLeading = totalMetrics > 0 && totalWins >= totalMetrics / 2

  return (
    <div className="card-premium border-gold-500/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-cream-100 flex items-center gap-2">
          <Swords className="w-4 h-4 text-gold-500" /> Competitor Ranking
        </h3>
        <span className="text-xs text-gray-500">{currentMonth}</span>
      </div>

      {/* Overall Status */}
      <div className={`p-3 rounded-lg mb-4 ${isLeading ? 'bg-gold-500/10 border border-gold-500/20' : 'bg-navy-800/50 border border-navy-700'}`}>
        <div className="flex items-center gap-2">
          {totalMetrics > 0 ? (
            <>
              {isLeading ? (
                <Crown className="w-5 h-5 text-gold-500" />
              ) : (
                <TrendingUp className="w-5 h-5 text-blue-400" />
              )}
              <span className={`font-medium ${isLeading ? 'text-gold-500' : 'text-gray-300'}`}>
                Leading in {totalWins} of {totalMetrics} metrics
              </span>
            </>
          ) : (
            <span className="text-gray-500 text-sm">No ranking data for this month</span>
          )}
        </div>
      </div>

      {/* Platform Rankings */}
      {platformRankings.length > 0 ? (
        <div className="space-y-2">
          {platformRankings.map((p, i) => (
            <div key={i} className="p-2 bg-navy-800/30 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-300">{p.platform}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${getWinsBg(p.winsCount, p.totalMetrics)} ${getWinsColor(p.winsCount, p.totalMetrics)}`}>
                  {p.winsCount === 0 ? 'No wins' : p.winsCount === p.totalMetrics ? 'All wins' : `${p.winsCount}/${p.totalMetrics} wins`}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {p.metrics.map((m, j) => (
                  <span
                    key={j}
                    className={`text-xs px-1.5 py-0.5 rounded ${m.rank === 1 ? 'bg-gold-500/20 text-gold-500' : m.rank <= 2 ? 'bg-green-500/10 text-green-400' : 'bg-navy-800 text-gray-500'}`}
                    title={`#${m.rank} of ${m.total}`}
                  >
                    {m.name}: #{m.rank}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-2">
          Add competitor data for {currentMonth} to see rankings
        </p>
      )}

      {/* Link to full analysis */}
      <Link
        href="/competitors"
        className="mt-4 flex items-center justify-center gap-1 text-xs text-gold-500 hover:text-gold-400 transition-colors"
      >
        View full analysis <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  )
}
