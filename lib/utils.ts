import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`
}

export function getHealthColor(score: number): string {
  if (score >= 80) return 'text-green-600 bg-green-100'
  if (score >= 60) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Client status
    lead: 'bg-blue-100 text-blue-700',
    qualified: 'bg-purple-100 text-purple-700',
    proposal: 'bg-yellow-100 text-yellow-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-gray-100 text-gray-700',
    // Project status
    planning: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-700',
    // Invoice status
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700'
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getDaysUntil(date: string | Date): number {
  const target = new Date(date)
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getDaysOverdue(date: string | Date): number {
  const days = getDaysUntil(date)
  return days < 0 ? Math.abs(days) : 0
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
