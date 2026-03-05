import { NextResponse } from 'next/server'
import { clickupClient } from '@/lib/integrations/clickup'
import { getServiceSupabase } from '@/lib/supabase/client'

export async function POST() {
  try {
    const supabase = getServiceSupabase()
    
    // Get tasks from ClickUp
    const result = await clickupClient.getTasks()
    
    if (!result.success || !result.tasks) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || 'Failed to fetch ClickUp tasks'
      }, { status: 400 })
    }

    let synced = 0
    let errors = 0

    for (const task of result.tasks) {
      try {
        // Map ClickUp status to our status
        const status = mapStatus(task.status?.status || 'to do')
        
        // Calculate health score based on due date
        const healthScore = calculateHealth(task)

        // Check if project exists
        const { data: existing } = await supabase
          .from('projects')
          .select('id')
          .eq('clickup_task_id', task.id)
          .single()

        const projectData = {
          name: task.name,
          clickup_task_id: task.id,
          status,
          health_score: healthScore,
          notes: task.description || null,
          start_date: task.start_date ? new Date(parseInt(task.start_date)).toISOString().split('T')[0] : null,
          due_date: task.due_date ? new Date(parseInt(task.due_date)).toISOString().split('T')[0] : null
        }

        if (existing) {
          await supabase
            .from('projects')
            .update(projectData)
            .eq('id', existing.id)
        } else {
          await supabase
            .from('projects')
            .insert(projectData)
        }

        synced++
      } catch (err) {
        console.error(`Error syncing task ${task.id}:`, err)
        errors++
      }
    }

    // Log the sync
    await supabase.from('automation_logs').insert({
      action_type: 'clickup_sync',
      details: `Synced ${synced} tasks, ${errors} errors`,
      success: errors === 0
    })

    // Update ROI metrics
    const today = new Date().toISOString().split('T')[0]
    await supabase.from('roi_metrics').upsert({
      metric_date: today,
      tasks_synced: synced,
      time_saved_hours: synced * 0.05 // ~3 minutes per task
    }, { onConflict: 'metric_date' })

    return NextResponse.json({
      success: true,
      synced,
      errors,
      message: `Synced ${synced} tasks from ClickUp`
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

function mapStatus(clickupStatus: string): string {
  const map: Record<string, string> = {
    'to do': 'planning',
    'in progress': 'active',
    'blocked': 'on_hold',
    'review': 'active',
    'complete': 'completed',
    'closed': 'completed'
  }
  return map[clickupStatus.toLowerCase()] || 'active'
}

function calculateHealth(task: any): number {
  let score = 100
  
  if (task.due_date) {
    const dueDate = new Date(parseInt(task.due_date))
    const now = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilDue < 0) {
      // Overdue
      score -= Math.min(Math.abs(daysUntilDue) * 5, 50)
    } else if (daysUntilDue < 3) {
      // Due soon
      score -= 10
    }
  }
  
  // Lower score for blocked tasks
  if (task.status?.status?.toLowerCase() === 'blocked') {
    score -= 30
  }
  
  return Math.max(score, 0)
}
