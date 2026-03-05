'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Youtube, Instagram, Facebook, Video, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

interface SocialStats {
  youtube?: {
    views?: number
    subscribers_gained?: number
    followers?: number
    ad_revenue?: number
  }
  instagram?: {
    followers_gained?: number
    followers?: number
    engagement_rate?: number
  }
  facebook?: {
    followers_gained?: number
    followers?: number
    views_3s?: number
  }
  tiktok?: {
    followers_gained?: number
    followers?: number
  }
}

const formatNumber = (num: number) => {
  if (!num) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

const formatCurrency = (num: number) => {
  if (!num) return '£0'
  return `£${num.toLocaleString()}`
}

export default function SocialSummary() {
  const [stats, setStats] = useState<SocialStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/health')
        const data = await res.json()
        if (data.stats?.social) {
          setStats(data.stats.social)
        }
      } catch (error) {
        console.error('Failed to fetch social stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="card-dark animate-pulse">
        <div className="h-6 bg-navy-800 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 bg-navy-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  const platforms = [
    {
      name: 'YouTube',
      icon: Youtube,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      metrics: [
        { label: 'Views YTD', value: formatNumber(stats?.youtube?.views || 0) },
        { label: 'Revenue', value: formatCurrency(stats?.youtube?.ad_revenue || 0) }
      ]
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/20',
      metrics: [
        { label: 'Followers', value: `+${formatNumber(stats?.instagram?.followers_gained || stats?.instagram?.followers || 0)}` },
        { label: 'Engagement', value: `${(stats?.instagram?.engagement_rate || 0).toFixed(2)}%` }
      ]
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      metrics: [
        { label: 'Followers', value: `+${formatNumber(stats?.facebook?.followers_gained || stats?.facebook?.followers || 0)}` },
        { label: '3s Views', value: formatNumber(stats?.facebook?.views_3s || 0) }
      ]
    },
    {
      name: 'TikTok',
      icon: Video,
      color: 'text-gray-100',
      bgColor: 'bg-gray-800',
      borderColor: 'border-gray-600',
      metrics: [
        { label: 'Followers', value: `+${formatNumber(stats?.tiktok?.followers_gained || stats?.tiktok?.followers || 0)}` },
        { label: 'Status', value: 'Manual' }
      ]
    }
  ]

  return (
    <div className="card-dark text-cream-100">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-red" /> Social Summary
        </h2>
        <Link
          href="/social"
          className="text-xs text-gold-500 hover:text-gold-400 flex items-center gap-1"
        >
          View details <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {platforms.map(platform => (
          <div
            key={platform.name}
            className={`p-3 rounded-lg ${platform.bgColor} border ${platform.borderColor}`}
          >
            <div className={`flex items-center gap-1.5 mb-2 ${platform.color}`}>
              <platform.icon className="w-4 h-4" />
              <span className="text-xs font-semibold">{platform.name}</span>
            </div>
            <div className="space-y-1">
              {platform.metrics.map((metric, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400">{metric.label}</span>
                  <span className="text-xs font-mono font-bold text-cream-100">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Row */}
      <div className="mt-4 pt-3 border-t border-navy-700 flex items-center justify-between text-xs">
        <span className="text-gray-500">2026 YTD Performance</span>
        <span className="text-green-400 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> All platforms syncing
        </span>
      </div>
    </div>
  )
}
