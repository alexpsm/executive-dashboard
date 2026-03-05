
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role
export function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Types
export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: 'lead' | 'qualified' | 'proposal' | 'won' | 'lost'
  source: string | null
  estimated_value: number
  notes: string | null
  last_contact_date: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  client_id: string | null
  clickup_task_id: string | null
  status: 'planning' | 'active' | 'on_hold' | 'completed'
  budget: number
  spent: number
  start_date: string | null
  due_date: string | null
  health_score: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  client_id: string | null
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  issue_date: string
  due_date: string
  paid_date: string | null
  created_at: string
  updated_at: string
  clients?: Client
}

export interface CalendarEvent {
  id: string
  google_event_id: string | null
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  attendees: string[] | null
  created_at: string
}

export interface DashboardStats {
  active_leads: number
  active_projects: number
  avg_health: number
  overdue_invoices: number
  overdue_amount: number
  pipeline_value: number
  upcoming_meetings: number
  monthly_time_saved: number
}
