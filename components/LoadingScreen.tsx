'use client'

import { LayoutDashboard } from 'lucide-react'

export default function LoadingScreen() {
    return (
        <div className="loading-screen">
            {/* Animated Background Orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold-400/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-navy-800/50 rounded-full blur-3xl" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center">
                {/* Logo with Glow */}
                <div className="loading-logo">
                    <LayoutDashboard className="w-10 h-10 text-navy-900" />
                </div>

                {/* Spinner */}
                <div className="loading-spinner">
                    <svg viewBox="0 0 50 50">
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            fill="none"
                            strokeWidth="3"
                        />
                    </svg>
                </div>

                {/* Text with Dots */}
                <div className="loading-text">
                    Loading
                    <span className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-8 w-48 h-1 bg-navy-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400 rounded-full animate-shimmer"
                        style={{ width: '100%', backgroundSize: '200% 100%' }} />
                </div>
            </div>
        </div>
    )
}
