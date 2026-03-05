'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { Save, RefreshCw, Edit2, ChevronLeft, ChevronRight, Calendar, TrendingUp, TrendingDown, Facebook, Youtube, Instagram, Video, Globe, Target, CheckCircle2, Twitter, RotateCcw } from 'lucide-react'

interface PlatformData {
  platform: string
  metric_month: string
  forecast_cost_of_sales: number
  forecast_gross_profit: number
  forecast_other_op_costs: number
  actual_cost_of_sales: number
  actual_gross_profit: number
  actual_other_op_costs: number
  notes?: string
}

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'bg-red-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-br from-purple-600 to-pink-600' },
  { id: 'tiktok', name: 'TikTok', icon: Video, color: 'bg-black' },
  { id: 'website', name: 'Website', icon: Globe, color: 'bg-emerald-600' },
  { id: 'x', name: 'X.com', icon: Twitter, color: 'bg-gray-900' },
  { id: 'recharge', name: 'Recharge', icon: RotateCcw, color: 'bg-orange-500' },
]

const MONTHS_2026 = [
  { value: '2026-01', label: 'January 2026', short: 'Jan' },
  { value: '2026-02', label: 'February 2026', short: 'Feb' },
  { value: '2026-03', label: 'March 2026', short: 'Mar' },
  { value: '2026-04', label: 'April 2026', short: 'Apr' },
  { value: '2026-05', label: 'May 2026', short: 'May' },
  { value: '2026-06', label: 'June 2026', short: 'Jun' },
  { value: '2026-07', label: 'July 2026', short: 'Jul' },
  { value: '2026-08', label: 'August 2026', short: 'Aug' },
  { value: '2026-09', label: 'September 2026', short: 'Sep' },
  { value: '2026-10', label: 'October 2026', short: 'Oct' },
  { value: '2026-11', label: 'November 2026', short: 'Nov' },
  { value: '2026-12', label: 'December 2026', short: 'Dec' },
]

const formatCurrency = (num: number) => {
  if (num === null || num === undefined) return '—'
  return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatVariance = (forecast: number, actual: number) => {
  if (!forecast && !actual) return { value: '—', color: 'text-gray-500', percent: '' }
  const diff = actual - forecast
  const percent = forecast !== 0 ? ((diff / forecast) * 100).toFixed(1) : '—'
  const isPositive = diff >= 0
  return {
    value: `${isPositive ? '+' : ''}${formatCurrency(diff)}`,
    color: isPositive ? 'text-green-400' : 'text-red-400',
    percent: forecast !== 0 ? `(${isPositive ? '+' : ''}${percent}%)` : '',
  }
}

export default function ForecastPage() {
  const [platformData, setPlatformData] = useState<Record<string, PlatformData>>({})
  const [totals, setTotals] = useState({
    forecast_cost_of_sales: 0,
    forecast_gross_profit: 0,
    forecast_other_op_costs: 0,
    actual_cost_of_sales: 0,
    actual_gross_profit: 0,
    actual_other_op_costs: 0,
    forecast_revenue: 0,
    actual_revenue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Record<string, Partial<PlatformData>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-02')

  const loadData = useCallback(async (month?: string) => {
    setLoading(true)
    try {
      const targetMonth = month || selectedMonth
      const res = await fetch(`/api/forecast?month=${targetMonth}`)
      const data = await res.json()
      if (data.success) {
        setPlatformData(data.platforms || {})
        setTotals(data.totals || {
          forecast_cost_of_sales: 0,
          forecast_gross_profit: 0,
          forecast_other_op_costs: 0,
          actual_cost_of_sales: 0,
          actual_gross_profit: 0,
          actual_other_op_costs: 0,
          forecast_revenue: 0,
          actual_revenue: 0,
        })
        if (data.selectedMonth) {
          setSelectedMonth(data.selectedMonth)
        }
      }
    } catch (e) {
      console.error('Failed to load forecast data', e)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => { loadData() }, [])

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    setEditData({})
    loadData(month)
  }

  const navigateMonth = (direction: -1 | 1) => {
    const currentIdx = MONTHS_2026.findIndex(m => m.value === selectedMonth)
    const newIdx = Math.max(0, Math.min(11, currentIdx + direction))
    handleMonthChange(MONTHS_2026[newIdx].value)
  }

  const handleEdit = (platform: string, field: keyof PlatformData, value: string) => {
    setEditData(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value === '' ? 0 : parseFloat(value) || 0,
      }
    }))
  }

  const savePlatform = async (platform: string) => {
    if (!editData[platform]) return
    setSaving(platform)

    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          metric_month: selectedMonth,
          ...editData[platform],
        }),
      })
      const data = await res.json()
      if (data.success) {
        await loadData(selectedMonth)
        setEditData(prev => {
          const copy = { ...prev }
          delete copy[platform]
          return copy
        })
      }
    } catch (e) {
      console.error('Failed to save', e)
    } finally {
      setSaving(null)
    }
  }

  const getFieldValue = (platform: string, field: keyof PlatformData): number => {
    if (editData[platform]?.[field] !== undefined) {
      return editData[platform][field] as number
    }
    return parseFloat(platformData[platform]?.[field] as any) || 0
  }

  const currentMonthLabel = MONTHS_2026.find(m => m.value === selectedMonth)?.label || selectedMonth

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900">
        <Header />
        <div className="flex items-center justify-center h-64 text-gray-400">Loading forecast data...</div>
      </div>
    )
  }

  // Calculate variance totals (revenue excludes recharge since it's a cost center)
  const forecastRevenue = totals.forecast_revenue
  const actualRevenue = totals.actual_revenue
  const costOfSalesVariance = formatVariance(totals.forecast_cost_of_sales, totals.actual_cost_of_sales)
  const profitVariance = formatVariance(totals.forecast_gross_profit, totals.actual_gross_profit)
  const otherOpCostsVariance = formatVariance(totals.forecast_other_op_costs, totals.actual_other_op_costs)
  const revenueVariance = formatVariance(forecastRevenue, actualRevenue)

  return (
    <div className="min-h-screen bg-navy-900 text-cream-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-cream-100 mb-1">Financial Forecast</h1>
            <p className="text-gray-400 text-sm">
              Compare forecasted vs actual cost of sales and gross profit by platform.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                editMode ? 'bg-brand-red text-white' : 'bg-navy-800 text-gray-300 hover:bg-navy-800/80 border border-gold-500/20'
              }`}
            >
              <Edit2 className="w-4 h-4" />
              {editMode ? 'Editing' : 'Edit Data'}
            </button>
            <button onClick={() => loadData(selectedMonth)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gold-500">
              <RefreshCw className="w-4 h-4" /> Reload
            </button>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {MONTHS_2026.map(month => (
              <button
                key={month.value}
                onClick={() => handleMonthChange(month.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedMonth === month.value
                    ? 'bg-brand-red text-white'
                    : 'bg-navy-800 text-gray-400 hover:text-cream-100 hover:bg-navy-800/80 border border-transparent hover:border-gold-500/20'
                }`}
              >
                {month.short}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-navy-800 rounded-lg p-1 ml-4">
            <button
              onClick={() => navigateMonth(-1)}
              disabled={selectedMonth === '2026-01'}
              className="p-2 hover:bg-navy-700 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-3 min-w-[160px] justify-center">
              <Calendar className="w-4 h-4 text-gold-500" />
              <span className="text-white font-medium text-sm">{currentMonthLabel}</span>
            </div>
            <button
              onClick={() => navigateMonth(1)}
              disabled={selectedMonth === '2026-12'}
              className="p-2 hover:bg-navy-700 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-navy-800/80 rounded-xl border border-gold-500/10 p-5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Target className="w-4 h-4 text-gold-500" />
              Forecast Revenue
            </div>
            <p className="text-2xl font-bold text-gold-500">{formatCurrency(forecastRevenue)}</p>
          </div>
          <div className="bg-navy-800/80 rounded-xl border border-green-500/20 p-5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Actual Revenue
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(actualRevenue)}</p>
            <p className={`text-xs mt-1 ${revenueVariance.color}`}>
              {revenueVariance.value} {revenueVariance.percent}
            </p>
          </div>
          <div className="bg-navy-800/80 rounded-xl border border-brand-red/20 p-5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <Target className="w-4 h-4 text-brand-red" />
              Forecast Gross Profit
            </div>
            <p className="text-2xl font-bold text-brand-red">{formatCurrency(totals.forecast_gross_profit)}</p>
          </div>
          <div className="bg-navy-800/80 rounded-xl border border-gold-500/20 p-5">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <CheckCircle2 className="w-4 h-4 text-gold-500" />
              Actual Gross Profit
            </div>
            <p className="text-2xl font-bold text-gold-500">{formatCurrency(totals.actual_gross_profit)}</p>
            <p className={`text-xs mt-1 ${profitVariance.color}`}>
              {profitVariance.value} {profitVariance.percent}
            </p>
          </div>
        </div>

        {/* Platform breakdown table */}
        <div className="bg-navy-800/80 rounded-xl border border-gold-500/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-700">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-400 w-40" rowSpan={2}>Platform</th>
                  <th className="text-center px-2 py-2 text-sm font-semibold text-blue-400 border-b border-navy-600" colSpan={4}>
                    <div className="flex items-center justify-center gap-1">
                      <Target className="w-3 h-3" /> Forecast
                    </div>
                  </th>
                  <th className="text-center px-2 py-2 text-sm font-semibold text-green-400 border-b border-navy-600" colSpan={4}>
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Actual
                    </div>
                  </th>
                  <th className="text-center px-2 py-2 text-sm font-semibold text-gray-400 border-b border-navy-600" colSpan={4}>
                    Variance
                  </th>
                  {editMode && <th className="w-16" rowSpan={2}></th>}
                </tr>
                <tr className="border-b border-navy-700 text-xs">
                  <th className="text-center px-2 py-2 text-gray-500">Cost of Sales</th>
                  <th className="text-center px-2 py-2 text-gray-500">Gross Profit</th>
                  <th className="text-center px-2 py-2 text-gray-500">Other Op Costs</th>
                  <th className="text-center px-2 py-2 text-gray-500">Revenue</th>
                  <th className="text-center px-2 py-2 text-gray-500">Cost of Sales</th>
                  <th className="text-center px-2 py-2 text-gray-500">Gross Profit</th>
                  <th className="text-center px-2 py-2 text-gray-500">Other Op Costs</th>
                  <th className="text-center px-2 py-2 text-gray-500">Revenue</th>
                  <th className="text-center px-2 py-2 text-gray-500">Cost of Sales</th>
                  <th className="text-center px-2 py-2 text-gray-500">Gross Profit</th>
                  <th className="text-center px-2 py-2 text-gray-500">Other Op Costs</th>
                  <th className="text-center px-2 py-2 text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {PLATFORMS.map((platform, idx) => {
                  const forecastCost = getFieldValue(platform.id, 'forecast_cost_of_sales')
                  const forecastProfit = getFieldValue(platform.id, 'forecast_gross_profit')
                  const forecastOtherOp = getFieldValue(platform.id, 'forecast_other_op_costs')
                  const actualCost = getFieldValue(platform.id, 'actual_cost_of_sales')
                  const actualProfit = getFieldValue(platform.id, 'actual_gross_profit')
                  const actualOtherOp = getFieldValue(platform.id, 'actual_other_op_costs')

                  // Recharge is a cost center with no revenue
                  const forecastRev = platform.id === 'recharge' ? 0 : forecastCost + forecastProfit
                  const actualRev = platform.id === 'recharge' ? 0 : actualCost + actualProfit
                  const costVariance = formatVariance(forecastCost, actualCost)
                  const profVariance = formatVariance(forecastProfit, actualProfit)
                  const otherOpVariance = formatVariance(forecastOtherOp, actualOtherOp)
                  const revVariance = formatVariance(forecastRev, actualRev)

                  const Icon = platform.icon

                  return (
                    <tr key={platform.id} className={`border-b border-navy-700 ${idx % 2 === 0 ? 'bg-navy-800' : 'bg-navy-800/50'}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`${platform.color} p-2 rounded-lg`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <span className="font-medium text-white">{platform.name}</span>
                        </div>
                      </td>

                      {/* Forecast Cost of Sales */}
                      <td className="text-center px-2 py-3">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData[platform.id]?.forecast_cost_of_sales ?? (platformData[platform.id]?.forecast_cost_of_sales || '')}
                            onChange={(e) => handleEdit(platform.id, 'forecast_cost_of_sales', e.target.value)}
                            className="w-24 bg-navy-900 border border-blue-600/50 rounded px-2 py-1 text-xs font-mono text-right"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="font-mono text-sm text-blue-300">{formatCurrency(forecastCost)}</span>
                        )}
                      </td>

                      {/* Forecast Gross Profit */}
                      <td className="text-center px-2 py-3">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData[platform.id]?.forecast_gross_profit ?? (platformData[platform.id]?.forecast_gross_profit || '')}
                            onChange={(e) => handleEdit(platform.id, 'forecast_gross_profit', e.target.value)}
                            className="w-24 bg-navy-900 border border-blue-600/50 rounded px-2 py-1 text-xs font-mono text-right"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="font-mono text-sm text-blue-300">{formatCurrency(forecastProfit)}</span>
                        )}
                      </td>

                      {/* Forecast Other Op Costs */}
                      <td className="text-center px-2 py-3">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData[platform.id]?.forecast_other_op_costs ?? (platformData[platform.id]?.forecast_other_op_costs || '')}
                            onChange={(e) => handleEdit(platform.id, 'forecast_other_op_costs', e.target.value)}
                            className="w-24 bg-navy-900 border border-blue-600/50 rounded px-2 py-1 text-xs font-mono text-right"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="font-mono text-sm text-blue-300">{formatCurrency(forecastOtherOp)}</span>
                        )}
                      </td>

                      {/* Forecast Revenue (calculated) */}
                      <td className="text-center px-2 py-3">
                        <span className="font-mono text-sm text-blue-200">{formatCurrency(forecastRev)}</span>
                      </td>

                      {/* Actual Cost of Sales */}
                      <td className="text-center px-2 py-3">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData[platform.id]?.actual_cost_of_sales ?? (platformData[platform.id]?.actual_cost_of_sales || '')}
                            onChange={(e) => handleEdit(platform.id, 'actual_cost_of_sales', e.target.value)}
                            className="w-24 bg-navy-900 border border-green-600/50 rounded px-2 py-1 text-xs font-mono text-right"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="font-mono text-sm text-green-300">{formatCurrency(actualCost)}</span>
                        )}
                      </td>

                      {/* Actual Gross Profit */}
                      <td className="text-center px-2 py-3">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData[platform.id]?.actual_gross_profit ?? (platformData[platform.id]?.actual_gross_profit || '')}
                            onChange={(e) => handleEdit(platform.id, 'actual_gross_profit', e.target.value)}
                            className="w-24 bg-navy-900 border border-green-600/50 rounded px-2 py-1 text-xs font-mono text-right"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="font-mono text-sm text-green-300">{formatCurrency(actualProfit)}</span>
                        )}
                      </td>

                      {/* Actual Other Op Costs */}
                      <td className="text-center px-2 py-3">
                        {editMode ? (
                          <input
                            type="number"
                            step="0.01"
                            value={editData[platform.id]?.actual_other_op_costs ?? (platformData[platform.id]?.actual_other_op_costs || '')}
                            onChange={(e) => handleEdit(platform.id, 'actual_other_op_costs', e.target.value)}
                            className="w-24 bg-navy-900 border border-green-600/50 rounded px-2 py-1 text-xs font-mono text-right"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="font-mono text-sm text-green-300">{formatCurrency(actualOtherOp)}</span>
                        )}
                      </td>

                      {/* Actual Revenue (calculated) */}
                      <td className="text-center px-2 py-3">
                        <span className="font-mono text-sm text-green-200">{formatCurrency(actualRev)}</span>
                      </td>

                      {/* Cost of Sales Variance */}
                      <td className="text-center px-2 py-3">
                        <span className={`font-mono text-xs ${costVariance.color}`}>
                          {costVariance.value}
                        </span>
                      </td>

                      {/* Gross Profit Variance */}
                      <td className="text-center px-2 py-3">
                        <span className={`font-mono text-xs ${profVariance.color}`}>
                          {profVariance.value}
                        </span>
                      </td>

                      {/* Other Op Costs Variance */}
                      <td className="text-center px-2 py-3">
                        <span className={`font-mono text-xs ${otherOpVariance.color}`}>
                          {otherOpVariance.value}
                        </span>
                      </td>

                      {/* Revenue Variance */}
                      <td className="text-center px-2 py-3">
                        <span className={`font-mono text-xs ${revVariance.color}`}>
                          {revVariance.value}
                        </span>
                      </td>

                      {editMode && (
                        <td className="px-2">
                          <button
                            onClick={() => savePlatform(platform.id)}
                            disabled={saving === platform.id || !editData[platform.id]}
                            className="p-2 rounded bg-navy-600 hover:bg-navy-500 disabled:opacity-50"
                          >
                            {saving === platform.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}

                {/* Totals row */}
                <tr className="bg-gold-500/10 border-t-2 border-gold-500/30">
                  <td className="px-4 py-4">
                    <span className="font-bold text-gold-400">TOTAL</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-blue-400">{formatCurrency(totals.forecast_cost_of_sales)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-blue-400">{formatCurrency(totals.forecast_gross_profit)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-blue-400">{formatCurrency(totals.forecast_other_op_costs)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-blue-300">{formatCurrency(forecastRevenue)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-green-400">{formatCurrency(totals.actual_cost_of_sales)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-green-400">{formatCurrency(totals.actual_gross_profit)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-green-400">{formatCurrency(totals.actual_other_op_costs)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className="font-mono font-bold text-sm text-green-300">{formatCurrency(actualRevenue)}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className={`font-mono font-bold text-xs ${costOfSalesVariance.color}`}>{costOfSalesVariance.value}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className={`font-mono font-bold text-xs ${profitVariance.color}`}>{profitVariance.value}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className={`font-mono font-bold text-xs ${otherOpCostsVariance.color}`}>{otherOpCostsVariance.value}</span>
                  </td>
                  <td className="text-center px-2 py-4">
                    <span className={`font-mono font-bold text-xs ${revenueVariance.color}`}>{revenueVariance.value}</span>
                  </td>
                  {editMode && <td></td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-6 p-4 bg-navy-800/50 rounded-xl border border-navy-700 text-xs text-gray-500">
          <p className="font-medium text-gray-400 mb-1">How to use</p>
          <ul className="space-y-1">
            <li><span className="text-blue-400">Forecast:</span> Enter your projected cost of sales and gross profit at the start of each month</li>
            <li><span className="text-green-400">Actual:</span> Enter the real numbers at the end of the month once you have final figures</li>
            <li><span className="text-gray-300">Variance:</span> Shows the difference between forecast and actual (green = beat forecast, red = under forecast)</li>
            <li><span className="text-gray-300">Revenue:</span> Auto-calculated as Cost of Sales + Gross Profit</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
