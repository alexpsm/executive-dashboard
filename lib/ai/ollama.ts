import axios from 'axios'

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b'

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: Record<string, any>
      required?: string[]
    }
  }
}

interface OllamaResponse {
  model: string
  message: {
    role: string
    content: string
    tool_calls?: Array<{
      function: {
        name: string
        arguments: string
      }
    }>
  }
  done: boolean
}

class OllamaClient {
  private async getCredentials() {
    try {
      const { getServiceSupabase } = await import('@/lib/supabase/client')
      const supabase = getServiceSupabase()

      const { data } = await supabase.from('settings').select('*').in('key', ['ollama_base_url', 'ollama_model'])

      let url = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '')
      let model = process.env.OLLAMA_MODEL || 'llama3.1:8b'

      if (data) {
        const urlSetting = data.find(s => s.key === 'ollama_base_url')
        const modelSetting = data.find(s => s.key === 'ollama_model')

        if (urlSetting?.value) url = urlSetting.value.replace(/\/$/, '')
        if (modelSetting?.value) model = modelSetting.value
      }

      return { url, model }
    } catch (e) {
      return {
        url: (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, ''),
        model: process.env.OLLAMA_MODEL || 'llama3.1:8b'
      }
    }
  }

  async chat(
    messages: OllamaMessage[],
    tools?: OllamaTool[]
  ): Promise<{ success: boolean; response?: OllamaResponse; error?: string }> {
    try {
      const { url, model } = await this.getCredentials()

      const response = await axios.post(
        `${url}/api/chat`,
        {
          model: model,
          messages,
          tools,
          stream: false
        },
        { timeout: 180000 } // 180 second timeout (3 mins) for model loading
      )

      return { success: true, response: response.data }
    } catch (error: any) {
      console.error('Ollama chat error:', error.message)

      // Handle timeout specifically
      if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Ollama timed out. The model might be loading into memory (this can take 1-2 mins first time). Please try again.'
        }
      }

      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Cannot connect to Ollama. Make sure Docker is running and Ollama container is started.'
        }
      }

      return { success: false, error: error.message }
    }
  }

  async generate(prompt: string): Promise<{ success: boolean; text?: string; error?: string }> {
    try {
      const { url, model } = await this.getCredentials()

      const response = await axios.post(
        `${url}/api/generate`,
        {
          model: model,
          prompt,
          stream: false
        },
        { timeout: 180000 }
      )

      return { success: true, text: response.data.response }
    } catch (error: any) {
      console.error('Ollama generate error:', error.message)
      if (error.code === 'ECONNABORTED') {
        return { success: false, error: 'Ollama timed out (model loading).' }
      }
      return { success: false, error: error.message }
    }
  }

  async testConnection(): Promise<{ success: boolean; models?: string[]; error?: string }> {
    try {
      const { url } = await this.getCredentials()
      const response = await axios.get(`${url}/api/tags`, { timeout: 5000 })
      const models = response.data.models?.map((m: any) => m.name) || []
      return { success: true, models }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async isModelAvailable(): Promise<boolean> {
    const { model } = await this.getCredentials()
    const result = await this.testConnection()
    if (!result.success || !result.models) return false
    return result.models.some(m => m.includes(model.split(':')[0]))
  }
}

export const ollamaClient = new OllamaClient()

// Define available tools for the AI
export const aiTools: OllamaTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_deals',
      description: 'Get deals from the deals pipeline. Returns deal info including name, stage, deal_value (in GBP), probability, platform, and company. Use stage="Won" to find won deals. Stages: Lead, Qualified, Proposal, Negotiation, Won, Lost.',
      parameters: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            description: 'Filter by stage: Lead, Qualified, Proposal, Negotiation, Won, Lost, or all',
            enum: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'all']
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_social_metrics',
      description: 'Get social media metrics from the database. Returns followers, views, engagement rates, ad revenue, etc. for YouTube, Instagram, Facebook, TikTok.',
      parameters: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
            description: 'Filter by platform: youtube, instagram, facebook, tiktok, or all',
            enum: ['youtube', 'instagram', 'facebook', 'tiktok', 'all']
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_clients',
      description: 'Get list of clients from the CRM database',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status: lead, qualified, proposal, won, lost, or all',
            enum: ['lead', 'qualified', 'proposal', 'won', 'lost', 'all']
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description: 'Get list of projects',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status: planning, active, on_hold, completed, or all',
            enum: ['planning', 'active', 'on_hold', 'completed', 'all']
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_invoices',
      description: 'Get list of invoices',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filter by status: draft, sent, paid, overdue, or all',
            enum: ['draft', 'sent', 'paid', 'overdue', 'all']
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_calendar_events',
      description: 'Get upcoming calendar events',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Number of days to look ahead (default: 7)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_clickup_tasks',
      description: 'Get tasks from ClickUp',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email to someone',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string', description: 'Email subject' },
          body: { type: 'string', description: 'Email body content' }
        },
        required: ['to', 'subject', 'body']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_dashboard_stats',
      description: 'Get dashboard statistics and KPIs',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_clients',
      description: 'Search for clients by name, company, or email',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search term (name, company, or email)'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_client_details',
      description: 'Get detailed information about a specific client including their projects and invoices',
      parameters: {
        type: 'object',
        properties: {
          client_id: {
            type: 'string',
            description: 'The UUID of the client'
          }
        },
        required: ['client_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_emails',
      description: 'Get recent emails from the inbox',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of emails to fetch (default: 5)'
          },
          search: {
            type: 'string',
            description: 'Optional search term to filter emails'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_full_summary',
      description: 'Get a comprehensive summary of the business including all key metrics, active projects overview, and urgent items',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description: 'Create a new invoice for a client',
      parameters: {
        type: 'object',
        properties: {
          client_name: { type: 'string', description: 'Name of the client (will search for matching client)' },
          amount: { type: 'number', description: 'Invoice amount in dollars' },
          due_days: { type: 'number', description: 'Number of days until due (default: 30)' }
        },
        required: ['client_name', 'amount']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Create a new project',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          budget: { type: 'number', description: 'Project budget in dollars' },
          due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
          notes: { type: 'string', description: 'Project notes or description' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Create a new calendar event or meeting',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Event title' },
          date: { type: 'string', description: 'Event date in YYYY-MM-DD format' },
          time: { type: 'string', description: 'Start time in HH:MM format (24h)' },
          duration_hours: { type: 'number', description: 'Duration in hours (default: 1)' },
          location: { type: 'string', description: 'Event location (optional)' }
        },
        required: ['title', 'date', 'time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_calendar_event',
      description: 'Delete/cancel a calendar event',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Title of the event to delete (fuzzy match)' },
          date: { type: 'string', description: 'Date of the event to delete (YYYY-MM-DD)' },
          time: { type: 'string', description: 'Time of the event (optional, helps disambiguate)' }
        },
        required: ['title', 'date']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_manual_metric',
      description: 'Update or add manual KPIs like HypeAuditor data, running costs, etc.',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Metric name (e.g., reach, followers, running_costs)' },
          value: { type: 'number', description: 'The numeric value of the metric' },
          platform: { type: 'string', description: 'Platform if applicable (facebook, instagram, youtube, tiktok)' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format (default: today)' }
        },
        required: ['metric', 'value']
      }
    }
  }
]

export type { OllamaMessage, OllamaTool, OllamaResponse }
