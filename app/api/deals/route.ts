import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Pipeline stages in order (matches Monday.com groups)
const PIPELINE_STAGES = [
  { id: 'closed', name: 'Deals Won', color: '#00c875' },
  { id: 'topics', name: 'Proposal Submitted', color: '#0086c0' },
  { id: 'group_mkw9s2by', name: 'Active Conversations', color: '#bb3354' },
  { id: 'group_mkwa7hqn', name: 'Inactive conversations', color: '#579bfc' },
  { id: 'group_mksmnq6c', name: 'Deals pitched and lost', color: '#579bfc' }
]

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') // 'kanban' or 'list'
    const groupId = searchParams.get('group') // Filter by specific group

    let query = supabase
      .from('deals')
      .select('*')
      .order('deal_value', { ascending: false })

    if (groupId && groupId !== 'all') {
      query = query.eq('group_id', groupId)
    }

    const { data: deals, error } = await query

    if (error) throw error

    // For kanban view, group deals by pipeline stage
    if (view === 'kanban') {
      const pipeline = PIPELINE_STAGES.map(stage => {
        const stageDeals = (deals || []).filter(d => d.group_id === stage.id || d.group_name === stage.name)
        return {
          id: stage.id,
          name: stage.name,
          color: stage.color,
          deals: stageDeals,
          count: stageDeals.length,
          totalValue: stageDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0)
        }
      })

      // Calculate totals
      const totals = {
        totalDeals: deals?.length || 0,
        totalValue: (deals || []).reduce((sum, d) => sum + (d.deal_value || 0), 0),
        wonValue: pipeline.find(p => p.id === 'closed')?.totalValue || 0
      }

      return NextResponse.json({
        success: true,
        pipeline,
        totals
      })
    }

    // Default list view
    return NextResponse.json({
      success: true,
      deals: deals || [],
      count: deals?.length || 0,
      totalValue: (deals || []).reduce((sum, d) => sum + (d.deal_value || 0), 0)
    })

  } catch (error: any) {
    console.error('Deals API Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
