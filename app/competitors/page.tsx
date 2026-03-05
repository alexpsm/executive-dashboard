'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Header from '@/components/Header'
import { Instagram, Youtube, Video, Save, RefreshCw, Crown, TrendingUp, TrendingDown, Minus, Edit2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface CompetitorData {
  name: string
  instagram: any
  youtube: any
  tiktok: any
}

type Platform = 'instagram' | 'youtube' | 'tiktok'

// EditableCell component moved OUTSIDE to prevent re-creation on parent re-render
const EditableCell = memo(({
  competitorName,
  field,
  value,
  editValue,
  editMode,
  format,
  onEdit
}: {
  competitorName: string
  field: string
  value: number
  editValue: number | undefined
  editMode: boolean
  format: 'number' | 'currency' | 'percent'
  onEdit: (name: string, field: string, value: string) => void
}) => {
  const displayValue = format === 'currency' ? formatCurrencyStatic(value) :
                       format === 'percent' ? formatPercentStatic(value) :
                       formatNumberStatic(value)

  if (!editMode) {
    return <span className="font-mono">{displayValue}</span>
  }

  return (
    <input
      type="number"
      value={editValue ?? (value || '')}
      onChange={(e) => onEdit(competitorName, field, e.target.value)}
      className="w-full bg-navy-900 border border-navy-600 rounded px-2 py-1 text-sm font-mono text-center"
      placeholder="—"
    />
  )
})

EditableCell.displayName = 'EditableCell'

// Static format functions (outside component)
const formatNumberStatic = (num: number) => {
  if (!num) return '—'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toLocaleString()
}

const formatCurrencyStatic = (num: number) => {
  if (!num) return '—'
  return `£${num.toLocaleString()}`
}

const formatPercentStatic = (num: number) => {
  if (!num) return '—'
  return `${num.toFixed(2)}%`
}

const COMPETITORS = [
  'Boxing News',
  'Boxing Social',
  'The Ring',
  'Boxing Scene',
  'Seconds Out',
  'IFL TV',
  'Boxing King Media',
]

const formatMonthLabel = (month: string) => {
  const [year, m] = month.split('-')
  const date = new Date(parseInt(year), parseInt(m) - 1)
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([])
  const [loading, setLoading] = useState(true)
  const [platform, setPlatform] = useState<Platform>('instagram')
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Record<string, Record<string, any>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7))
  const [availableMonths, setAvailableMonths] = useState<string[]>([])

  const loadData = useCallback(async (month?: string) => {
    setLoading(true)
    try {
      const targetMonth = month || selectedMonth
      const res = await fetch(`/api/competitors?month=${targetMonth}`)
      const data = await res.json()
      if (data.success) {
        // Ensure all competitors exist
        const competitorMap: Record<string, CompetitorData> = {}
        COMPETITORS.forEach(name => {
          competitorMap[name] = { name, instagram: null, youtube: null, tiktok: null }
        })
        data.competitors?.forEach((c: CompetitorData) => {
          competitorMap[c.name] = c
        })
        setCompetitors(Object.values(competitorMap))

        // Set available months
        if (data.availableMonths?.length > 0) {
          setAvailableMonths(data.availableMonths)
        }
        if (data.selectedMonth) {
          setSelectedMonth(data.selectedMonth)
        }

        // Find most recent update
        const dates = data.raw?.map((r: any) => r.updated_at).filter(Boolean).sort().reverse()
        if (dates?.[0]) {
          setLastUpdated(new Date(dates[0]).toLocaleDateString())
        }
      }
    } catch (e) {
      console.error('Failed to load competitors', e)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => { loadData() }, [])

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    setEditData({}) // Clear edits when changing month
    loadData(month)
  }

  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const date = new Date(year, month - 1 + direction)
    const newMonth = date.toISOString().slice(0, 7)
    handleMonthChange(newMonth)
  }

  const handleEdit = (competitorName: string, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      [competitorName]: {
        ...prev[competitorName],
        [field]: value === '' ? 0 : parseFloat(value) || 0,
      }
    }))
  }

  const saveCompetitor = async (competitorName: string) => {
    if (!editData[competitorName]) return
    setSaving(competitorName)

    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_name: competitorName,
          platform,
          metric_month: selectedMonth,
          metrics: editData[competitorName],
        }),
      })
      const data = await res.json()
      if (data.success) {
        await loadData(selectedMonth)
        setEditData(prev => {
          const copy = { ...prev }
          delete copy[competitorName]
          return copy
        })
      }
    } catch (e) {
      console.error('Failed to save', e)
    } finally {
      setSaving(null)
    }
  }

  const getRank = (competitors: CompetitorData[], field: string): Map<string, number> => {
    const values = competitors
      .map(c => ({ name: c.name, value: c[platform]?.[field] || 0 }))
      .sort((a, b) => b.value - a.value)

    const ranks = new Map<string, number>()
    values.forEach((v, i) => ranks.set(v.name, i + 1))
    return ranks
  }

  const RankBadge = ({ rank, total }: { rank: number; total: number }) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-gold-500" />
    if (rank <= 3) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (rank > total - 2) return <TrendingDown className="w-4 h-4 text-red-400" />
    return <Minus className="w-4 h-4 text-gray-500" />
  }

  // Platform-specific columns
  const igColumns = [
    { field: 'ig_followers', label: 'Followers', format: 'number' as const },
    { field: 'ig_engagement_rate', label: 'Engagement', format: 'percent' as const },
    { field: 'ig_est_post_price', label: 'Est. Post Price', format: 'currency' as const },
    { field: 'ig_est_reach', label: 'Est. Reach', format: 'number' as const },
    { field: 'ig_avg_likes', label: 'Avg Likes', format: 'number' as const },
  ]

  const ytColumns = [
    { field: 'yt_subscribers', label: 'Subscribers', format: 'number' as const },
    { field: 'yt_video_engagement_rate', label: 'Video Eng.', format: 'percent' as const },
    { field: 'yt_shorts_engagement_rate', label: 'Shorts Eng.', format: 'percent' as const },
    { field: 'yt_est_integration_price', label: 'Est. Integration', format: 'currency' as const },
    { field: 'yt_videos_avg_views', label: 'Videos Avg Views', format: 'number' as const },
    { field: 'yt_shorts_avg_views', label: 'Shorts Avg Views', format: 'number' as const },
  ]

  const ttColumns = [
    { field: 'tt_followers', label: 'Followers', format: 'number' as const },
    { field: 'tt_engagement_rate', label: 'Engagement', format: 'percent' as const },
    { field: 'tt_avg_views_90d', label: 'Avg Views (90d)', format: 'number' as const },
    { field: 'tt_est_integration_price', label: 'Est. Integration', format: 'currency' as const },
  ]

  const columns = platform === 'instagram' ? igColumns :
                  platform === 'youtube' ? ytColumns : ttColumns

  const boxingNews = competitors.find(c => c.name === 'Boxing News')
  const otherCompetitors = competitors.filter(c => c.name !== 'Boxing News')

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900">
        <Header />
        <div className="flex items-center justify-center h-64 text-gray-400">Loading competitor data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy-900 text-cream-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Competitor Analysis</h1>
            <p className="text-gray-400 text-sm">
              Compare Boxing News against top boxing media competitors.
              {lastUpdated && <span className="ml-2 text-gray-500">Last updated: {lastUpdated}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                editMode ? 'bg-gold-500 text-navy-900' : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
              }`}
            >
              <Edit2 className="w-4 h-4" />
              {editMode ? 'Editing' : 'Edit Data'}
            </button>
            <button onClick={() => loadData(selectedMonth)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between mb-6">
          {/* Platform tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setPlatform('instagram')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                platform === 'instagram'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-navy-800 text-gray-400 hover:text-white'
              }`}
            >
              <Instagram className="w-4 h-4" /> Instagram
            </button>
            <button
              onClick={() => setPlatform('youtube')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                platform === 'youtube'
                  ? 'bg-red-600 text-white'
                  : 'bg-navy-800 text-gray-400 hover:text-white'
              }`}
            >
              <Youtube className="w-4 h-4" /> YouTube
            </button>
            <button
              onClick={() => setPlatform('tiktok')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                platform === 'tiktok'
                  ? 'bg-black text-white border border-gray-600'
                  : 'bg-navy-800 text-gray-400 hover:text-white'
              }`}
            >
              <Video className="w-4 h-4" /> TikTok
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center gap-2 bg-navy-800 rounded-lg p-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-navy-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3">
              <Calendar className="w-4 h-4 text-gold-500" />
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-transparent text-white font-medium text-sm focus:outline-none cursor-pointer"
              >
                {/* Generate all months from Jan 2026 to Dec 2026 */}
                {Array.from({ length: 12 }, (_, i) => {
                  const date = new Date(2026, i)
                  const monthValue = date.toISOString().slice(0, 7)
                  return (
                    <option key={monthValue} value={monthValue} className="bg-navy-900">
                      {formatMonthLabel(monthValue)}
                    </option>
                  )
                })}
              </select>
            </div>

            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-navy-700 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-navy-800 rounded-xl border border-navy-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-400 w-48">Competitor</th>
                  {columns.map(col => (
                    <th key={col.field} className="text-center px-4 py-3 text-sm font-semibold text-gray-400">
                      {col.label}
                    </th>
                  ))}
                  {editMode && <th className="w-20"></th>}
                </tr>
              </thead>
              <tbody>
                {/* Boxing News row (highlighted) */}
                {boxingNews && (
                  <tr className="bg-gold-500/10 border-b border-gold-500/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-gold-500" />
                        <span className="font-bold text-gold-400">{boxingNews.name}</span>
                      </div>
                    </td>
                    {columns.map(col => (
                      <td key={col.field} className="text-center px-4 py-3">
                        <EditableCell
                          competitorName={boxingNews.name}
                          field={col.field}
                          value={boxingNews[platform]?.[col.field] || 0}
                          editValue={editData[boxingNews.name]?.[col.field]}
                          editMode={editMode}
                          format={col.format}
                          onEdit={handleEdit}
                        />
                      </td>
                    ))}
                    {editMode && (
                      <td className="px-2">
                        <button
                          onClick={() => saveCompetitor(boxingNews.name)}
                          disabled={saving === boxingNews.name || !editData[boxingNews.name]}
                          className="p-2 rounded bg-gold-500 text-navy-900 disabled:opacity-50"
                        >
                          {saving === boxingNews.name ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                  </tr>
                )}

                {/* Other competitors */}
                {otherCompetitors.map((competitor, idx) => (
                  <tr key={competitor.name} className={`border-b border-navy-700 ${idx % 2 === 0 ? 'bg-navy-800' : 'bg-navy-800/50'}`}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">{competitor.name}</span>
                    </td>
                    {columns.map(col => {
                      const ranks = getRank(competitors, col.field)
                      const rank = ranks.get(competitor.name) || 0
                      return (
                        <td key={col.field} className="text-center px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <EditableCell
                              competitorName={competitor.name}
                              field={col.field}
                              value={competitor[platform]?.[col.field] || 0}
                              editValue={editData[competitor.name]?.[col.field]}
                              editMode={editMode}
                              format={col.format}
                              onEdit={handleEdit}
                            />
                            {!editMode && <RankBadge rank={rank} total={competitors.length} />}
                          </div>
                        </td>
                      )
                    })}
                    {editMode && (
                      <td className="px-2">
                        <button
                          onClick={() => saveCompetitor(competitor.name)}
                          disabled={saving === competitor.name || !editData[competitor.name]}
                          className="p-2 rounded bg-navy-600 hover:bg-navy-500 disabled:opacity-50"
                        >
                          {saving === competitor.name ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data source note */}
        <div className="mt-6 p-4 bg-navy-800/50 rounded-xl border border-navy-700 text-xs text-gray-500">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-gold-500"></div>
            <p className="font-medium text-gold-400">Metrics sourced from HypeAuditor</p>
          </div>
          <p className="text-gray-400 mb-3">All competitor metrics in this table are pulled from HypeAuditor analytics platform.</p>
          <p className="font-medium text-gray-400 mb-1">Where to find competitor data</p>
          <ul className="space-y-1">
            <li><span className="text-gray-300">Followers/Subscribers:</span> Check each platform directly or Social Blade</li>
            <li><span className="text-gray-300">Engagement rates:</span> HypeAuditor, Modash, or Not Just Analytics</li>
            <li><span className="text-gray-300">Est. prices:</span> influencermarketinghub.com calculators (free)</li>
            <li><span className="text-gray-300">Avg views:</span> Social Blade or manual calculation from recent posts</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
