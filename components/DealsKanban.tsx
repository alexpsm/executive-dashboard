'use client'

import { useState, useEffect } from 'react'
import { Briefcase, TrendingUp, Clock, User, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Deal {
  id: string
  external_id: string
  name: string
  group_id: string
  group_name: string
  group_color: string
  stage: string
  stage_color: string
  update_notes: string | null
  deal_value: number
  close_probability: number
  forecast_value: number
  expected_close_date: string | null
  last_interaction_date: string | null
  owner_name: string | null
}

interface PipelineStage {
  id: string
  name: string
  color: string
  deals: Deal[]
  count: number
  totalValue: number
}

interface DealsKanbanProps {
  onRefresh?: () => void
}

export default function DealsKanban({ onRefresh }: DealsKanbanProps) {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [totals, setTotals] = useState({ totalDeals: 0, totalValue: 0, wonValue: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['closed', 'topics', 'group_mkw9s2by']))

  const fetchDeals = async () => {
    try {
      const res = await fetch('/api/deals?view=kanban')
      const data = await res.json()
      if (data.success) {
        setPipeline(data.pipeline)
        setTotals(data.totals)
      }
    } catch (error) {
      console.error('Error fetching deals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeals()
  }, [])

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev)
      if (next.has(stageId)) {
        next.delete(stageId)
      } else {
        next.add(stageId)
      }
      return next
    })
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-navy-800 rounded w-1/3"></div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-navy-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with totals */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-gold-500" />
          <h2 className="text-lg font-bold text-cream-100">Deals Pipeline</h2>
          <span className="text-xs font-mono bg-navy-800 px-2 py-1 rounded text-gold-500">
            {totals.totalDeals} deals
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-gray-400">
            Pipeline: <span className="text-cream-100 font-bold">{formatCurrency(totals.totalValue)}</span>
          </div>
          <div className="text-green-400">
            Won: <span className="font-bold">{formatCurrency(totals.wonValue)}</span>
          </div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="space-y-3">
        {pipeline.map(stage => (
          <div key={stage.id} className="bg-navy-900/50 rounded-xl overflow-hidden border border-navy-800">
            {/* Stage Header */}
            <button
              onClick={() => toggleStage(stage.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-navy-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="font-semibold text-cream-100">{stage.name}</span>
                <span className="text-xs bg-navy-800 px-2 py-0.5 rounded text-gray-400">
                  {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-gold-500">
                  {formatCurrency(stage.totalValue)}
                </span>
                {expandedStages.has(stage.id) ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>

            {/* Stage Deals */}
            {expandedStages.has(stage.id) && stage.deals.length > 0 && (
              <div className="border-t border-navy-800">
                {stage.deals.map((deal, index) => (
                  <div
                    key={deal.id}
                    className={`px-4 py-3 flex items-center gap-4 hover:bg-navy-800/30 transition-colors ${
                      index !== stage.deals.length - 1 ? 'border-b border-navy-800/50' : ''
                    }`}
                  >
                    {/* Deal Name & Update */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-cream-100 truncate">{deal.name}</p>
                      {deal.update_notes && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{deal.update_notes}</p>
                      )}
                    </div>

                    {/* Stage Badge */}
                    <span
                      className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${deal.stage_color}20`,
                        color: deal.stage_color
                      }}
                    >
                      {deal.stage}
                    </span>

                    {/* Deal Value */}
                    <div className="text-right">
                      <p className="font-mono font-bold text-gold-500">{formatCurrency(deal.deal_value)}</p>
                      {deal.close_probability > 0 && (
                        <p className="text-xs text-gray-500">{deal.close_probability}% probability</p>
                      )}
                    </div>

                    {/* Expected Close Date */}
                    {deal.expected_close_date && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {new Date(deal.expected_close_date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </div>
                    )}

                    {/* Owner */}
                    {deal.owner_name && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <User className="w-3 h-3" />
                        {deal.owner_name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {expandedStages.has(stage.id) && stage.deals.length === 0 && (
              <div className="px-4 py-6 text-center text-gray-500 text-sm border-t border-navy-800">
                No deals in this stage
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sync indicator */}
      <p className="text-xs text-gray-600 text-right">
        Synced from Monday.com • Board: Deals
      </p>
    </div>
  )
}
