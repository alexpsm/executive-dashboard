'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/Header'
import { Save, RefreshCw, CheckCircle, AlertCircle, Youtube, Instagram, Facebook, Video } from 'lucide-react'

interface FormState {
  // TikTok (weekly)
  tiktok_followers: string
  tiktok_followers_gained: string
  tiktok_engagement_rate: string
  tiktok_reach_per_post: string
  tiktok_for_you_rate: string

  // Facebook (monthly)
  facebook_views_1min: string
  facebook_platform_revenue: string

  // Instagram prices (monthly)
  instagram_price_per_post: string
  instagram_price_per_story: string
  instagram_avg_reach_story: string

  // YouTube prices (monthly)
  youtube_price_per_post: string
}

const defaultForm: FormState = {
  tiktok_followers: '',
  tiktok_followers_gained: '',
  tiktok_engagement_rate: '',
  tiktok_reach_per_post: '',
  tiktok_for_you_rate: '',
  facebook_views_1min: '',
  facebook_platform_revenue: '',
  instagram_price_per_post: '',
  instagram_price_per_story: '',
  instagram_avg_reach_story: '',
  youtube_price_per_post: '',
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface SectionStatus {
  tiktok: SaveStatus
  facebook: SaveStatus
  instagram: SaveStatus
  youtube: SaveStatus
}

export default function ManualDataPage() {
  const [form, setForm] = useState<FormState>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SectionStatus>({ tiktok: 'idle', facebook: 'idle', instagram: 'idle', youtube: 'idle' })
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const loadCurrentValues = useCallback(async () => {
    setLoading(true)
    try {
      // Load from social_metrics (platform rows)
      const res = await fetch('/api/debug/metrics')
      const data = await res.json()

      const platforms: Record<string, any> = {}
      data.metrics?.forEach((m: any) => {
        if (!platforms[m.platform]) platforms[m.platform] = m
      })

      // Load manual_metrics for prices
      const manualRes = await fetch('/api/manual')
      const manualData = await manualRes.json()
      const prices: Record<string, number> = {}
      manualData.metrics?.forEach((m: any) => { prices[m.metric_key] = m.metric_value })

      const tiktok = platforms['tiktok'] || {}
      const facebook = platforms['facebook'] || {}

      setForm({
        tiktok_followers: tiktok.followers?.toString() || '',
        tiktok_followers_gained: tiktok.followers_gained?.toString() || '',
        tiktok_engagement_rate: tiktok.engagement?.toString() || '',
        tiktok_reach_per_post: tiktok.reach?.toString() || '',

        tiktok_for_you_rate: tiktok.for_you_rate?.toString() || '',
        facebook_views_1min: facebook.views_1min?.toString() || '',
        facebook_platform_revenue: facebook.platform_revenue?.toString() || '',
        instagram_price_per_post: prices['instagram_price_per_post']?.toString() || '',
        instagram_price_per_story: prices['instagram_price_per_story']?.toString() || '',
        instagram_avg_reach_story: prices['instagram_avg_reach_story']?.toString() || '',
        youtube_price_per_post: prices['youtube_price_per_post']?.toString() || '',
      })

      setLastUpdated(new Date().toLocaleString())
    } catch (e) {
      console.error('Failed to load current values', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCurrentValues() }, [loadCurrentValues])

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const saveSection = async (section: keyof SectionStatus) => {
    setStatus(prev => ({ ...prev, [section]: 'saving' }))

    const metricsToSave: Array<{ metric_key: string; metric_value: number; platform: string }> = []

    if (section === 'tiktok') {
      const fields: Array<[keyof FormState, string]> = [
        ['tiktok_followers', 'tiktok_followers'],
        ['tiktok_followers_gained', 'tiktok_followers_gained'],
        ['tiktok_engagement_rate', 'tiktok_engagement_rate'],
        ['tiktok_reach_per_post', 'tiktok_reach_per_post'],
        ['tiktok_for_you_rate', 'tiktok_for_you_rate'],
      ]
      fields.forEach(([formKey, metricKey]) => {
        if (form[formKey] !== '') {
          metricsToSave.push({ metric_key: metricKey, metric_value: parseFloat(form[formKey]), platform: 'tiktok' })
        }
      })
    }

    if (section === 'facebook') {
      if (form.facebook_views_1min !== '') {
        metricsToSave.push({ metric_key: 'facebook_views_1min', metric_value: parseFloat(form.facebook_views_1min), platform: 'facebook' })
      }
      if (form.facebook_platform_revenue !== '') {
        metricsToSave.push({ metric_key: 'facebook_platform_revenue', metric_value: parseFloat(form.facebook_platform_revenue), platform: 'facebook' })
      }
    }

    if (section === 'instagram') {
      if (form.instagram_price_per_post !== '') {
        metricsToSave.push({ metric_key: 'instagram_price_per_post', metric_value: parseFloat(form.instagram_price_per_post), platform: 'instagram' })
      }
      if (form.instagram_price_per_story !== '') {
        metricsToSave.push({ metric_key: 'instagram_price_per_story', metric_value: parseFloat(form.instagram_price_per_story), platform: 'instagram' })
      }
      if (form.instagram_avg_reach_story !== '') {
        metricsToSave.push({ metric_key: 'instagram_avg_reach_story', metric_value: parseFloat(form.instagram_avg_reach_story), platform: 'instagram' })
      }
    }

    if (section === 'youtube') {
      if (form.youtube_price_per_post !== '') {
        metricsToSave.push({ metric_key: 'youtube_price_per_post', metric_value: parseFloat(form.youtube_price_per_post), platform: 'youtube' })
      }
    }

    try {
      const res = await fetch('/api/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: metricsToSave }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setStatus(prev => ({ ...prev, [section]: 'success' }))
      setTimeout(() => setStatus(prev => ({ ...prev, [section]: 'idle' })), 3000)
    } catch (e) {
      setStatus(prev => ({ ...prev, [section]: 'error' }))
      setTimeout(() => setStatus(prev => ({ ...prev, [section]: 'idle' })), 3000)
    }
  }

  const SaveButton = ({ section }: { section: keyof SectionStatus }) => {
    const s = status[section]
    return (
      <button
        onClick={() => saveSection(section)}
        disabled={s === 'saving'}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${s === 'success' ? 'bg-green-600 text-white' :
          s === 'error' ? 'bg-red-600 text-white' :
            s === 'saving' ? 'bg-gray-400 text-white cursor-not-allowed' :
              'bg-gold-500 hover:bg-gold-600 text-navy-900'
          }`}
      >
        {s === 'saving' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
          s === 'success' ? <CheckCircle className="w-4 h-4" /> :
            s === 'error' ? <AlertCircle className="w-4 h-4" /> :
              <Save className="w-4 h-4" />}
        {s === 'saving' ? 'Saving...' : s === 'success' ? 'Saved!' : s === 'error' ? 'Failed' : 'Save'}
      </button>
    )
  }

  const Field = ({ label, formKey, hint, prefix, suffix }: {
    label: string
    formKey: keyof FormState
    hint?: string
    prefix?: string
    suffix?: string
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-gray-400 text-sm">{prefix}</span>}
        <input
          type="number"
          value={form[formKey]}
          onChange={set(formKey)}
          placeholder="—"
          className="w-full bg-navy-900 border border-navy-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500/30"
        />
        {suffix && <span className="text-gray-400 text-sm">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-navy-900">
      <Header />
      <div className="flex items-center justify-center h-64 text-gray-400">Loading current values...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-navy-900 text-cream-100">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Manual Data Entry</h1>
            <p className="text-gray-400 text-sm">
              Enter data that can't be pulled automatically from APIs.
              {lastUpdated && <span className="ml-2 text-gray-500">Last loaded: {lastUpdated}</span>}
            </p>
          </div>
          <button onClick={loadCurrentValues} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
        </div>

        <div className="space-y-6">

          {/* TIKTOK - Weekly */}
          <section className="bg-navy-800 rounded-xl border border-navy-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-black p-2 rounded-lg">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">TikTok</h2>
                  <span className="text-xs text-gray-500 bg-navy-900 px-2 py-0.5 rounded-full">Update weekly — every Monday</span>
                </div>
              </div>
              <SaveButton section="tiktok" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field formKey="tiktok_followers" label="Total Followers" hint="Current follower count from TikTok Studio" />
              <Field formKey="tiktok_followers_gained" label="Followers Gained YTD" hint="Net new followers since Jan 1, 2026" />
              <Field formKey="tiktok_engagement_rate" label="Engagement Rate" hint="From TikTok Studio → Analytics" suffix="%" />
              <Field formKey="tiktok_reach_per_post" label="Avg Reach Per Post" hint="Average of last 7 posts" />
              <Field formKey="tiktok_for_you_rate" label="For You Rate" hint="% of views from For You page (TikTok Studio → Content)" suffix="%" />
            </div>
          </section>

          {/* FACEBOOK - Monthly */}
          <section className="bg-navy-800 rounded-xl border border-navy-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-blue-700 p-2 rounded-lg">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Facebook</h2>
                  <span className="text-xs text-gray-500 bg-navy-900 px-2 py-0.5 rounded-full">Update monthly — first Monday of the month</span>
                </div>
              </div>
              <SaveButton section="facebook" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                formKey="facebook_views_1min"
                label="1-Minute Views YTD"
                hint="From Creator Studio → Video → Performance. Cumulative since Jan 1."
              />
              <Field
                formKey="facebook_platform_revenue"
                label="Platform Revenue YTD (£)"
                hint="From Creator Studio → Monetization → Earnings"
                prefix="£"
              />
            </div>
          </section>

          {/* INSTAGRAM - Monthly */}
          <section className="bg-navy-800 rounded-xl border border-navy-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Instagram</h2>
                  <span className="text-xs text-gray-500 bg-navy-900 px-2 py-0.5 rounded-full">Update monthly — first Monday of the month</span>
                </div>
              </div>
              <SaveButton section="instagram" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                formKey="instagram_avg_reach_story"
                label="Avg Reach Per Story"
                hint="Average story reach this month. Check Instagram Insights → Stories."
              />
              <Field
                formKey="instagram_price_per_post"
                label="Est. Price Per Post (£)"
                hint="From HypeAuditor, Modash, or influencermarketinghub.com calculator"
                prefix="£"
              />
              <Field
                formKey="instagram_price_per_story"
                label="Est. Price Per Story (£)"
                hint="From HypeAuditor or Modash. Typically ~12% of post price."
                prefix="£"
              />
            </div>
          </section>

          {/* YOUTUBE - Monthly */}
          <section className="bg-navy-800 rounded-xl border border-navy-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-2 rounded-lg">
                  <Youtube className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">YouTube</h2>
                  <span className="text-xs text-gray-500 bg-navy-900 px-2 py-0.5 rounded-full">Update monthly — first Monday of the month</span>
                </div>
              </div>
              <SaveButton section="youtube" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                formKey="youtube_price_per_post"
                label="Est. Price Per Post (£)"
                hint="From HypeAuditor, Modash, or influencermarketinghub.com calculator"
                prefix="£"
              />
            </div>
          </section>

        </div>

        {/* Reference */}
        <div className="mt-8 p-4 bg-navy-800/50 rounded-xl border border-navy-700 text-xs text-gray-500">
          <p className="font-medium text-gray-400 mb-1">Where to find these metrics</p>
          <ul className="space-y-1">
            <li><span className="text-gray-300">TikTok:</span> TikTok Studio app → Analytics → Overview</li>
            <li><span className="text-gray-300">Facebook 1-min views:</span> Meta Business Suite → Creator Studio → Content → Video → Performance tab</li>
            <li><span className="text-gray-300">Facebook revenue:</span> Creator Studio → Monetization → In-Stream Ads → Earnings</li>
            <li><span className="text-gray-300">Instagram story reach:</span> Instagram app → Professional Dashboard → Content You Shared → Stories</li>
            <li><span className="text-gray-300">Estimated post prices:</span> influencermarketinghub.com/instagram-money-calculator (free) or Modash.io</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
