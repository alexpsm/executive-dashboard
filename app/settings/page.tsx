'use client'

import { useState, useEffect, useRef } from 'react'
import Header from '@/components/Header'
import {
    Save, RefreshCw, CheckCircle, AlertCircle,
    Database, Bot, Eye, EyeOff, Youtube, Facebook, Briefcase, CreditCard
} from 'lucide-react'

interface ServiceStatus {
    supabase: boolean
    monday: boolean
    youtube: boolean
    meta: boolean
    xero: boolean
    ollama: boolean
    openai: boolean
    ollama_models: string[]
    ai_provider?: string
    has_openai_key?: boolean
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [testing, setTesting] = useState<string | null>(null)
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
    const initialLoadDone = useRef(false)
    const [status, setStatus] = useState<ServiceStatus>({
        supabase: false,
        monday: false,
        youtube: false,
        meta: false,
        xero: false,
        ollama: false,
        openai: false,
        ollama_models: []
    })

    const [settings, setSettings] = useState<Record<string, string>>({
        monday_api_token: '',
        google_client_id: '',
        google_client_secret: '',
        google_refresh_token: '',
        facebook_access_token: '',
        instagram_account_id: '',
        facebook_page_id: '',
        xero_client_id: '',
        xero_client_secret: '',
        ai_provider: 'openai',
        ollama_base_url: 'http://localhost:11434',
        ollama_model: 'llama3.1:8b',
        openai_api_key: '',
        openai_model: 'gpt-4o'
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [healthRes, settingsRes] = await Promise.all([
                fetch('/api/health'),
                fetch('/api/settings')
            ])

            const healthData = await healthRes.json()
            const settingsData = await settingsRes.json()

            if (healthData.success && healthData.services) {
                setStatus(healthData.services)
            }

            if (settingsData.success && settingsData.settings) {
                setSettings(prev => {
                    const newSettings = { ...prev, ...settingsData.settings }
                    // Only set AI provider on initial load if OpenAI is configured
                    if (!initialLoadDone.current && (healthData.services?.has_openai_key || healthData.services?.openai)) {
                        newSettings.ai_provider = 'openai'
                    }
                    return newSettings
                })
            }

            initialLoadDone.current = true
        } catch (error) {
            console.error('Failed to load settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const refreshStatus = async () => {
        try {
            const res = await fetch('/api/health')
            const data = await res.json()
            if (data.success && data.services) {
                setStatus(data.services)
            }
        } catch (error) {
            console.error('Health check failed:', error)
        }
    }

    const handleSave = async (section: string) => {
        setSaving(section)
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            })
            await refreshStatus()
            alert('Settings saved successfully!')
        } catch (error) {
            alert('Failed to save settings')
        } finally {
            setSaving(null)
        }
    }

    const handleTestConnection = async (service: string) => {
        setTesting(service)
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings })
            })
            await refreshStatus()
            await new Promise(resolve => setTimeout(resolve, 500))
            alert('Connection test complete!')
        } catch (error) {
            console.error(`Test ${service} failed:`, error)
            alert(`Test failed: ${error}`)
        } finally {
            setTesting(null)
        }
    }

    const toggleSecret = (key: string) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const handleInputChange = (id: string, value: string) => {
        setSettings(prev => ({ ...prev, [id]: value }))
    }

    const aiConnected = settings.ai_provider === 'openai' ? status.openai : status.ollama

    if (loading) {
        return (
            <div className="min-h-screen bg-navy-900 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gold-500" />
                    <p className="mt-4 text-gray-400">Loading settings...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-navy-900 text-cream-100">
            <Header />

            <main className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Settings</h1>
                        <p className="text-gray-400 mt-1">Configure your dashboard integrations and APIs</p>
                    </div>
                    <button
                        onClick={() => handleSave('all')}
                        disabled={!!saving}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save All'}
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Supabase */}
                    <ServiceCard
                        id="supabase"
                        title="Supabase Database"
                        icon={Database}
                        connected={status.supabase}
                        description="Primary database connection"
                        testing={testing}
                        onTest={handleTestConnection}
                    >
                        <div className="bg-navy-800/50 p-3 rounded-lg text-sm text-gray-400">
                            Connected via environment variables. Modify in <code className="text-gold-500">.env.local</code>
                        </div>
                    </ServiceCard>

                    {/* AI Configuration */}
                    <ServiceCard
                        id="ai_config"
                        title="AI Assistant"
                        icon={Bot}
                        connected={aiConnected}
                        description={settings.ai_provider === 'openai' ? 'Using OpenAI (Cloud)' : 'Using Ollama (Local)'}
                        testing={testing}
                        onTest={handleTestConnection}
                    >
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">AI Provider</label>
                                <select
                                    value={settings.ai_provider}
                                    onChange={e => handleInputChange('ai_provider', e.target.value)}
                                    className="w-full px-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-cream-100 focus:outline-none focus:border-gold-500"
                                >
                                    <option value="openai">OpenAI (Recommended for cloud hosting)</option>
                                    <option value="ollama">Ollama (Local only)</option>
                                </select>
                            </div>

                            {settings.ai_provider === 'ollama' ? (
                                <>
                                    <InputField label="Base URL" id="ollama_base_url" placeholder="http://localhost:11434" value={settings.ollama_base_url} onChange={handleInputChange} />
                                    <InputField label="Model" id="ollama_model" placeholder="llama3.1:8b" value={settings.ollama_model} onChange={handleInputChange} />
                                    {status.ollama && (
                                        <div className="bg-green-500/10 text-green-400 px-4 py-2 rounded-lg text-sm">
                                            Ollama is running with {status.ollama_models?.length || 0} models available.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <InputField label="OpenAI API Key" id="openai_api_key" secret value={settings.openai_api_key} onChange={handleInputChange} showSecrets={showSecrets} toggleSecret={toggleSecret} placeholder="sk-proj-..." hint="Get from platform.openai.com" />
                                    <InputField label="Model" id="openai_model" placeholder="gpt-4o" value={settings.openai_model} onChange={handleInputChange} hint="gpt-4o recommended for best results" />
                                </>
                            )}
                        </div>
                    </ServiceCard>

                    {/* Monday.com */}
                    <ServiceCard
                        id="monday"
                        title="Monday.com"
                        icon={Briefcase}
                        connected={status.monday}
                        description="Deals pipeline integration"
                        testing={testing}
                        onTest={handleTestConnection}
                    >
                        <div className="grid gap-4">
                            <InputField
                                label="API Token"
                                id="monday_api_token"
                                secret
                                value={settings.monday_api_token}
                                onChange={handleInputChange}
                                showSecrets={showSecrets}
                                toggleSecret={toggleSecret}
                                placeholder="eyJhbGciOiJIUzI1..."
                                hint="Get from Monday.com > Profile > Admin > API"
                            />
                        </div>
                    </ServiceCard>

                    {/* YouTube */}
                    <ServiceCard
                        id="youtube"
                        title="YouTube"
                        icon={Youtube}
                        connected={status.youtube}
                        description="Channel stats, Analytics API, ad revenue"
                        testing={testing}
                        onTest={handleTestConnection}
                    >
                        <div className="grid gap-4">
                            <InputField label="Google Client ID" id="google_client_id" value={settings.google_client_id} onChange={handleInputChange} placeholder="123456789-abc.apps.googleusercontent.com" hint="From Google Cloud Console" />
                            <InputField label="Google Client Secret" id="google_client_secret" secret value={settings.google_client_secret} onChange={handleInputChange} showSecrets={showSecrets} toggleSecret={toggleSecret} placeholder="GOCSPX-..." />
                            <InputField label="Refresh Token" id="google_refresh_token" secret value={settings.google_refresh_token} onChange={handleInputChange} showSecrets={showSecrets} toggleSecret={toggleSecret} placeholder="1//03zp..." hint="Generated via OAuth flow" />
                        </div>
                    </ServiceCard>

                    {/* Meta */}
                    <ServiceCard
                        id="meta"
                        title="Meta (Facebook & Instagram)"
                        icon={Facebook}
                        connected={status.meta}
                        description="Page insights, followers, video views"
                        testing={testing}
                        onTest={handleTestConnection}
                    >
                        <div className="grid gap-4">
                            <InputField label="Facebook Access Token" id="facebook_access_token" secret value={settings.facebook_access_token} onChange={handleInputChange} showSecrets={showSecrets} toggleSecret={toggleSecret} placeholder="EAARZBMkB7ZBDcBO..." hint="Long-lived Page Access Token from Graph API Explorer" />
                            <div className="grid grid-cols-2 gap-4">
                                <InputField label="Instagram Account ID" id="instagram_account_id" value={settings.instagram_account_id} onChange={handleInputChange} placeholder="17841400448907329" />
                                <InputField label="Facebook Page ID" id="facebook_page_id" value={settings.facebook_page_id} onChange={handleInputChange} placeholder="94076559270" />
                            </div>
                        </div>
                    </ServiceCard>

                    {/* Xero */}
                    <ServiceCard
                        id="xero"
                        title="Xero"
                        icon={CreditCard}
                        connected={status.xero}
                        description="Invoices and financial data"
                        testing={testing}
                        onTest={handleTestConnection}
                    >
                        <div className="grid gap-4">
                            <InputField label="Client ID" id="xero_client_id" value={settings.xero_client_id} onChange={handleInputChange} placeholder="C57135E370B24B2B..." hint="From Xero Developer Portal" />
                            <InputField label="Client Secret" id="xero_client_secret" secret value={settings.xero_client_secret} onChange={handleInputChange} showSecrets={showSecrets} toggleSecret={toggleSecret} placeholder="NElNyWulfd-D0Ehb..." />
                            <div className="bg-navy-800/50 p-3 rounded-lg text-xs text-gray-400">
                                Xero uses OAuth 2.0. After saving credentials, complete the OAuth flow to connect.
                            </div>
                        </div>
                    </ServiceCard>
                </div>
            </main>
        </div>
    )
}

// Moved outside to prevent recreation on every render
function InputField({
    label,
    id,
    placeholder = '',
    secret = false,
    hint = '',
    value = '',
    onChange,
    showSecrets = {},
    toggleSecret
}: {
    label: string
    id: string
    placeholder?: string
    secret?: boolean
    hint?: string
    value?: string
    onChange: (id: string, value: string) => void
    showSecrets?: Record<string, boolean>
    toggleSecret?: (key: string) => void
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
            <div className="relative">
                <input
                    type={secret && !showSecrets[id] ? 'password' : 'text'}
                    value={value}
                    onChange={e => onChange(id, e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 bg-navy-900 border border-navy-600 rounded-lg text-cream-100 placeholder-gray-500 focus:outline-none focus:border-gold-500 pr-10"
                />
                {secret && toggleSecret && (
                    <button
                        type="button"
                        onClick={() => toggleSecret(id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                        {showSecrets[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}
            </div>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </div>
    )
}

function ServiceCard({
    id,
    title,
    icon: Icon,
    connected,
    description,
    children,
    testing,
    onTest
}: {
    id: string
    title: string
    icon: any
    connected: boolean
    description: string
    children: React.ReactNode
    testing: string | null
    onTest: (id: string) => void
}) {
    return (
        <div className="card-premium">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${connected ? 'bg-green-500/20 text-green-400' : 'bg-navy-800 text-gray-500'}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-cream-100">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {connected ? (
                        <><CheckCircle className="w-3 h-3" /> Connected</>
                    ) : (
                        <><AlertCircle className="w-3 h-3" /> Not Connected</>
                    )}
                </span>
            </div>

            <div className="space-y-4 border-t border-navy-700 pt-4">
                {children}

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        onClick={() => onTest(id)}
                        disabled={testing === id}
                        className="btn-secondary text-sm py-1.5"
                    >
                        {testing === id ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save & Test'}
                    </button>
                </div>
            </div>
        </div>
    )
}
