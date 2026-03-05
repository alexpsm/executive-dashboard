import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN
const DEALS_BOARD_ID = '2036553068' // CRM Workspace - Deals board

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Exact column IDs from Monday.com Deals board
const COLUMN_IDS = {
  STAGE: 'deal_stage',                    // Stage status (New, Discovery, Proposal, etc.)
  UPDATE: 'text_mksmjvs4',                // Update notes
  DEAL_VALUE: 'deal_value',               // Deal value in £
  EXPECTED_CLOSE_DATE: 'deal_expected_close_date',
  CLOSE_PROBABILITY: 'deal_close_probability',
  FORECAST_VALUE: 'deal_forecast_value',  // Calculated formula
  LAST_INTERACTION: 'date__1',            // Last interaction date
  OWNER: 'deal_owner',                    // Owner (people)
  CONTACTS: 'deal_contact',               // Related contacts
  ACCOUNTS: 'deal_account'                // Related accounts (mirror)
}

// Stage color mappings from Monday.com
const STAGE_COLORS: Record<string, string> = {
  'New': '#5559df',
  'Discovery': '#579bfc',
  'Proposal': '#66ccff',
  'Negotiation': '#4eccc6',
  'Won': '#00c875',
  'Lost': '#df2f4a'
}

// Group color mappings from Monday.com
const GROUP_COLORS: Record<string, { name: string; color: string; position: number }> = {
  'closed': { name: 'Deals Won', color: '#00c875', position: 0 },
  'topics': { name: 'Proposal Submitted', color: '#0086c0', position: 1 },
  'group_mkw9s2by': { name: 'Active Conversations', color: '#bb3354', position: 2 },
  'group_mkwa7hqn': { name: 'Inactive conversations', color: '#579bfc', position: 3 },
  'group_mksmnq6c': { name: 'Deals pitched and lost', color: '#579bfc', position: 4 }
}

export interface MondayDeal {
  id: string
  name: string
  group_id: string
  group_name: string
  group_color: string
  group_position: number
  stage: string
  stage_color: string
  update_notes: string | null
  deal_value: number
  close_probability: number
  forecast_value: number
  expected_close_date: string | null
  last_interaction_date: string | null
  owner_name: string | null
  contact_name: string | null
  account_name: string | null
  updated_at: string
}

class MondayClient {
  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  private get headers() {
    return {
      'Authorization': MONDAY_TOKEN || '',
      'Content-Type': 'application/json',
      'API-Version': '2023-10'
    }
  }

  async query(query: string, variables?: any) {
    if (!MONDAY_TOKEN) {
      throw new Error('Monday credentials not configured')
    }
    const response = await axios.post(MONDAY_API_URL, { query, variables }, { headers: this.headers })
    if (response.data.errors) {
      throw new Error(JSON.stringify(response.data.errors))
    }
    return response.data.data
  }

  // Get all deals from the specific Deals board (ID: 2036553068)
  async getDealsBoard(): Promise<{
    success: boolean
    deals?: MondayDeal[]
    groups?: Array<{ id: string; name: string; color: string; position: number; dealCount: number; totalValue: number }>
    error?: string
  }> {
    try {
      // Get all items with pagination
      const allDeals: MondayDeal[] = []
      let cursor: string | null = null

      do {
        const itemsQuery = `
          query {
            boards(ids: [${DEALS_BOARD_ID}]) {
              items_page(limit: 100${cursor ? `, cursor: "${cursor}"` : ''}) {
                cursor
                items {
                  id
                  name
                  updated_at
                  group {
                    id
                    title
                    color
                  }
                  column_values {
                    id
                    text
                    value
                  }
                }
              }
            }
          }
        `

        const itemsData = await this.query(itemsQuery)
        const itemsPage = itemsData.boards[0].items_page
        const items = itemsPage.items || []
        cursor = itemsPage.cursor

        console.log(`[Monday] Fetched ${items.length} items${cursor ? ', more available...' : ''}`)

        for (const item of items) {
          // Helper to get column value by exact ID
          const getColValue = (colId: string): string | null => {
            const cv = item.column_values.find((cv: any) => cv.id === colId)
            return cv?.text || null
          }

          const getColNumber = (colId: string): number => {
            const text = getColValue(colId)
            if (!text) return 0
            const num = parseFloat(text.replace(/[^0-9.-]+/g, ''))
            return isNaN(num) ? 0 : num
          }

          // Get group info with fallbacks
          const groupId = item.group?.id || 'unknown'
          const groupInfo = GROUP_COLORS[groupId] || {
            name: item.group?.title || 'Unknown',
            color: item.group?.color || '#808080',
            position: 99
          }

          // Get stage from status column
          const stage = getColValue(COLUMN_IDS.STAGE) || 'New'
          const stageColor = STAGE_COLORS[stage] || '#808080'

          // Calculate forecast value (if not provided by formula)
          const dealValue = getColNumber(COLUMN_IDS.DEAL_VALUE)
          const probability = getColNumber(COLUMN_IDS.CLOSE_PROBABILITY)
          const forecastValue = dealValue * (probability / 100)

          allDeals.push({
            id: item.id,
            name: item.name,
            group_id: groupId,
            group_name: groupInfo.name,
            group_color: groupInfo.color,
            group_position: groupInfo.position,
            stage,
            stage_color: stageColor,
            update_notes: getColValue(COLUMN_IDS.UPDATE),
            deal_value: dealValue,
            close_probability: probability,
            forecast_value: forecastValue,
            expected_close_date: getColValue(COLUMN_IDS.EXPECTED_CLOSE_DATE),
            last_interaction_date: getColValue(COLUMN_IDS.LAST_INTERACTION),
            owner_name: getColValue(COLUMN_IDS.OWNER),
            contact_name: null, // Board relation - would need separate query
            account_name: null, // Mirror column - would need separate query
            updated_at: item.updated_at
          })
        }
      } while (cursor)

      // Sort deals by group position
      allDeals.sort((a, b) => a.group_position - b.group_position)

      // Build group summaries
      const groupSummaries = Object.entries(GROUP_COLORS).map(([id, info]) => {
        const groupDeals = allDeals.filter(d => d.group_id === id)
        return {
          id,
          name: info.name,
          color: info.color,
          position: info.position,
          dealCount: groupDeals.length,
          totalValue: groupDeals.reduce((sum, d) => sum + d.deal_value, 0)
        }
      }).sort((a, b) => a.position - b.position)

      console.log(`[Monday] Total deals: ${allDeals.length}`)
      console.log(`[Monday] Groups: ${groupSummaries.map(g => `${g.name} (${g.dealCount})`).join(', ')}`)

      return { success: true, deals: allDeals, groups: groupSummaries }

    } catch (error: any) {
      console.error('Monday Deals Error:', error.message)
      return { success: false, error: error.message }
    }
  }

  // Sync deals to Supabase
  async syncDealsToSupabase(): Promise<{ success: boolean; synced?: number; error?: string }> {
    try {
      const { success, deals, error } = await this.getDealsBoard()

      if (!success || !deals) {
        throw new Error(error || 'Failed to fetch deals')
      }

      // Upsert deals to Supabase with exact Monday.com structure
      const { error: upsertError } = await this.supabase
        .from('deals')
        .upsert(
          deals.map(deal => ({
            external_id: deal.id,
            source: 'monday',
            name: deal.name,
            group_id: deal.group_id,
            group_name: deal.group_name,
            group_color: deal.group_color,
            stage: deal.stage,
            stage_color: deal.stage_color,
            update_notes: deal.update_notes,
            deal_value: deal.deal_value,
            close_probability: deal.close_probability,
            forecast_value: deal.forecast_value,
            expected_close_date: deal.expected_close_date,
            last_interaction_date: deal.last_interaction_date,
            owner_name: deal.owner_name,
            contact_name: deal.contact_name,
            account_name: deal.account_name,
            updated_at: deal.updated_at
          })),
          { onConflict: 'external_id' }
        )

      if (upsertError) {
        throw new Error(upsertError.message)
      }

      // Update sync status
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'monday_deals',
          last_sync_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          records_synced: deals.length,
          is_healthy: true,
          last_error: null
        }, { onConflict: 'api_name' })

      return { success: true, synced: deals.length }

    } catch (error: any) {
      console.error('Monday Sync Error:', error.message)

      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'monday_deals',
          last_sync_at: new Date().toISOString(),
          last_error: error.message,
          is_healthy: false
        }, { onConflict: 'api_name' })

      return { success: false, error: error.message }
    }
  }

  // Get deals grouped by pipeline stage (for kanban view)
  async getDealsKanban(): Promise<{
    success: boolean
    pipeline?: Array<{
      group: { id: string; name: string; color: string }
      deals: MondayDeal[]
      totalValue: number
    }>
    error?: string
  }> {
    const { success, deals, groups, error } = await this.getDealsBoard()

    if (!success || !deals || !groups) {
      return { success: false, error }
    }

    const pipeline = groups.map(group => ({
      group: { id: group.id, name: group.name, color: group.color },
      deals: deals.filter(d => d.group_id === group.id),
      totalValue: group.totalValue
    }))

    return { success: true, pipeline }
  }

  // Legacy method - redirects to new method
  async getDeals(): Promise<{ success: boolean; deals?: any[]; error?: string }> {
    return this.getDealsBoard()
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const query = `{ me { id name } }`
      await this.query(query)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const mondayClient = new MondayClient()
