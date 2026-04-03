'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, Calendar, DollarSign, FolderKanban,
  Bell, Settings, RefreshCw, Mail, AlertCircle, X, Users, BarChart3, Swords, TrendingUp, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabase/browser'

interface HeaderProps {
  overdueCount?: number
  overdueProjects?: number
  onSync?: () => void
  syncing?: boolean
}

export default function Header({ overdueCount = 0, overdueProjects = 0, onSync, syncing = false }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const totalNotifications = overdueCount + overdueProjects

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Main nav items (shown in header)
  const navItems = [
    { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'competitors', href: '/competitors', label: 'Competitors', icon: Swords },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <header className="header-glass sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="flex items-center gap-3 group flex-shrink-0">
          <Image
            src="/boxing_news_logo.png"
            alt="Boxing News"
            width={36}
            height={36}
            className="rounded-lg group-hover:scale-105 transition-transform duration-300"
          />
          <span className="text-lg font-bold text-cream-100 tracking-tight hidden xl:inline">Executive Dashboard</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-0.5 bg-navy-800 rounded-xl p-1">
          {navItems.map(item => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${isActive(item.href)
                ? 'bg-brand-red text-white shadow-sm'
                : 'text-gray-400 hover:text-cream-100 hover:bg-navy-900'
                }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              className={`relative flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-300 overflow-hidden ${
                syncing
                  ? 'bg-gradient-to-r from-brand-red via-gold-500 to-brand-red bg-[length:200%_100%] animate-gradient-x text-white shadow-lg shadow-brand-red/30'
                  : 'btn-secondary hover:shadow-md'
              }`}
            >
              {syncing ? (
                <>
                  {/* Animated spinner rings */}
                  <div className="relative w-4 h-4">
                    <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white animate-spin"></div>
                  </div>
                  <span className="hidden sm:inline">Syncing</span>
                  <span className="hidden sm:inline animate-pulse">...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 transition-transform group-hover:rotate-180" />
                  <span className="hidden sm:inline">Sync</span>
                </>
              )}
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-2 hover:bg-navy-800 rounded-lg relative text-gray-400 hover:text-cream-100 ${showNotifications ? 'bg-navy-800 text-cream-100' : ''}`}
            >
              <Bell className="w-5 h-5" />
              {totalNotifications > 0 && !isDismissed && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red text-white text-xs rounded-full flex items-center justify-center">
                  {totalNotifications}
                </span>
              )}
            </button>

            {
              showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 top-12 w-80 bg-navy-800 rounded-xl shadow-xl border border-gold-600/20 p-4 z-50 animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-cream-100">Notifications</h3>
                      <div className="flex items-center gap-2">
                        {totalNotifications > 0 && !isDismissed && (
                          <button
                            onClick={() => setIsDismissed(true)}
                            className="text-xs text-gold-500 hover:text-gold-400 font-medium px-2 py-1 rounded hover:bg-navy-900 transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                        <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {totalNotifications > 0 && !isDismissed ? (
                      <div className="space-y-3">
                        {overdueCount > 0 && (
                          <div className="flex items-start gap-3 p-3 bg-brand-red/10 rounded-lg border border-brand-red/20">
                            <AlertCircle className="w-5 h-5 text-brand-red mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-cream-100">Overdue Invoices</p>
                              <p className="text-xs text-brand-red mt-1">You have {overdueCount} overdue invoice(s).</p>
                            </div>
                          </div>
                        )}

                        {overdueProjects > 0 && (
                          <div className="flex items-start gap-3 p-3 bg-gold-500/10 rounded-lg border border-gold-500/20">
                            <FolderKanban className="w-5 h-5 text-gold-500 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-cream-100">Overdue Projects</p>
                              <p className="text-xs text-gold-500 mt-1">You have {overdueProjects} project(s) past due.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm">No new notifications</p>
                      </div>
                    )}
                  </div>
                </>
              )
            }
          </div >

          <Link href="/settings" className="p-2 hover:bg-navy-800 rounded-lg text-gray-400 hover:text-cream-100 transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </Link>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="p-2 hover:bg-navy-800 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div >
      </div >
    </header >
  )
}
