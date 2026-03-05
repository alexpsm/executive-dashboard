import { NextRequest, NextResponse } from 'next/server'
import { ollamaClient, aiTools, type OllamaMessage } from '@/lib/ai/ollama'
import { openaiClient } from '@/lib/ai/openai'
import { getServiceSupabase } from '@/lib/supabase/client'
import { clickupClient } from '@/lib/integrations/clickup'
import { listEmailsOAuth, sendEmailOAuth } from '@/lib/integrations/gmail-oauth'

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Tool execution functions
async function executeTools(toolCalls: any[]): Promise<string[]> {
  const results: string[] = []
  const serviceSupabase = getServiceSupabase()

  for (const toolCall of toolCalls) {
    const { name, arguments: argsStr } = toolCall.function
    let args: any = {}

    try {
      args = typeof argsStr === 'string' ? JSON.parse(argsStr) : argsStr
    } catch (e) {
      args = {}
    }

    let result = ''

    switch (name) {
      case 'get_clients': {
        let query = serviceSupabase.from('clients').select('*')
        if (args.status && args.status !== 'all') {
          query = query.eq('status', args.status)
        }
        const { data } = await query.limit(10)
        result = data && data.length > 0
          ? `Found ${data.length} clients:\n${data.map(c => `- ${c.name} (${c.company || 'No company'}) - ${c.status} - $${c.estimated_value || 0}`).join('\n')}`
          : 'No clients found.'
        break
      }

      case 'get_projects': {
        let query = serviceSupabase.from('projects').select('*')
        if (args.status && args.status !== 'all') {
          query = query.eq('status', args.status)
        }
        const { data } = await query.limit(10)
        const today = new Date().setHours(0, 0, 0, 0)
        result = data && data.length > 0
          ? `Found ${data.length} projects:\n${data.map(p => {
            const isOverdue = p.due_date && p.status === 'active' && new Date(p.due_date).getTime() < today
            return `- ${p.name}
  Status: ${p.status}${isOverdue ? ' ⚠️ OVERDUE' : ''}
  Health: ${p.health_score}%
  Budget: $${p.budget} | Spent: $${p.spent} (${p.budget > 0 ? Math.round((p.spent / p.budget) * 100) : 0}%)
  Start: ${p.start_date || 'Not set'} | Due: ${p.due_date || 'Not set'}
  Notes: ${p.notes || 'None'}`
          }).join('\n\n')}`
          : 'No projects found.'
        break
      }

      case 'get_invoices': {
        let query = serviceSupabase.from('invoices').select('*, clients(name, email)')
        if (args.status && args.status !== 'all') {
          query = query.eq('status', args.status)
        }
        const { data } = await query.limit(10)
        result = data && data.length > 0
          ? `Found ${data.length} invoices:\n${data.map(i => `- ${i.invoice_number}: $${i.amount} (${i.status}) - Client: ${i.clients?.name} (${i.clients?.email || 'No email'}) - Due: ${new Date(i.due_date).toLocaleDateString()}`).join('\n')}`
          : 'No invoices found.'
        break
      }

      case 'get_calendar_events': {
        const days = args.days || 7
        const { data } = await serviceSupabase
          .from('calendar_events')
          .select('*')
          .gte('start_time', new Date().toISOString())
          .lte('start_time', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString())
          .order('start_time')
          .limit(10)

        result = data && data.length > 0
          ? `Found ${data.length} upcoming events:\n${data.map(e => `- ${e.title} on ${new Date(e.start_time).toLocaleString()}${e.location ? ` at ${e.location}` : ''}`).join('\n')}`
          : `No events found in the next ${days} days.`
        break
      }

      case 'get_clickup_tasks': {
        const clickupResult = await clickupClient.getTasks()
        if (clickupResult.success && clickupResult.tasks) {
          result = `Found ${clickupResult.tasks.length} ClickUp tasks:\n${clickupResult.tasks.slice(0, 5).map(t => `- ${t.name} (${t.status?.status || 'no status'})`).join('\n')}`
        } else {
          result = `Could not fetch ClickUp tasks: ${clickupResult.error || 'Unknown error'}`
        }
        break
      }

      case 'send_email': {
        if (!args.to || !args.subject || !args.body) {
          result = 'Missing required email fields (to, subject, body)'
        } else {
          const emailResult = await sendEmailOAuth(
            args.to,
            args.subject,
            args.body
          )
          result = emailResult.success
            ? `Email sent successfully to ${args.to}`
            : `Failed to send email: ${emailResult.error}`
        }
        break
      }

      case 'get_dashboard_stats': {
        const { data } = await serviceSupabase.from('dashboard_stats').select('*').single()
        if (data) {
          result = `Dashboard Stats:
- Active Leads: ${data.active_leads}
- Active Projects: ${data.active_projects}
- Average Project Health: ${Math.round(data.avg_health)}%
- Overdue Invoices: ${data.overdue_invoices} (Total: $${formatCurrency(data.overdue_amount)})
- Pipeline Value: $${formatCurrency(data.pipeline_value)}
- Upcoming Meetings: ${data.upcoming_meetings}
- Time Saved This Month: ${data.monthly_time_saved} hours`
        } else {
          result = 'Could not fetch dashboard stats.'
        }
        break
      }

      case 'search_clients': {
        const query = args.query
        const { data } = await serviceSupabase
          .from('clients')
          .select('*')
          .or(`name.ilike.%${query}%,company.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5)

        result = data && data.length > 0
          ? `Found ${data.length} matching clients:\n${data.map(c => `- ${c.name} (${c.company}) [ID: ${c.id}]`).join('\n')}`
          : `No clients found matching "${query}"`
        break
      }

      case 'get_client_details': {
        const { data: client } = await serviceSupabase
          .from('clients')
          .select('*, projects(*), invoices(*)')
          .eq('id', args.client_id)
          .single()

        if (client) {
          result = `Client Details for ${client.name} (${client.company}):
- Email: ${client.email}
- Status: ${client.status}
- Value: $${client.estimated_value}

Projects:
${client.projects.length > 0 ? client.projects.map((p: any) => `- ${p.name} (${p.status})`).join('\n') : 'No projects'}

Invoices:
${client.invoices.length > 0 ? client.invoices.map((i: any) => `- #${i.invoice_number}: $${i.amount} (${i.status})`).join('\n') : 'No invoices'}`
        } else {
          result = 'Client not found.'
        }
        break
      }

      case 'get_recent_emails': {
        const limit = args.limit || 5
        const includeBody = args.include_body || false
        const emailsRes = await listEmailsOAuth(limit, includeBody)

        if (emailsRes.success && emailsRes.messages) {
          result = `Recent Emails:\n${emailsRes.messages.map((m: any) => {
            const content = includeBody ? (m.body || m.snippet) : m.snippet
            return `- [${m.date}] From: ${m.from} | Subject: ${m.subject}\n  Content: ${content ? content.substring(0, 1000) + (content.length > 1000 ? '...' : '') : 'No content'}`
          }).join('\n')}`
        } else {
          result = `Failed to fetch recent emails: ${emailsRes.error || 'No emails found'}`
        }
        break
      }

      case 'get_full_summary': {
        // Parallel fetch for speed
        const [stats, projects, invoices, events] = await Promise.all([
          serviceSupabase.from('dashboard_stats').select('*').single(),
          serviceSupabase.from('projects').select('*').order('health_score', { ascending: true }).limit(5),
          serviceSupabase.from('invoices').select('*').eq('status', 'overdue').limit(5),
          serviceSupabase.from('calendar_events').select('*').gte('start_time', new Date().toISOString()).limit(5)
        ])

        const s = stats.data
        result = `EXECUTIVE SUMMARY

KEY METRICS:
- Pipeline: $${s?.pipeline_value || 0}
- Active Projects: ${s?.active_projects || 0}
- Overdue Invoices: ${s?.overdue_invoices || 0} ($${s?.overdue_amount || 0})

URGENT ATTENTION NEEDED:
${invoices.data && invoices.data.length > 0 ? 'Overdue Invoices:\n' + invoices.data.map((i: any) => `- ${i.invoice_number}: $${i.amount}`).join('\n') : '- No overdue invoices'}

PROJECT HEALTH RISKS:
${projects.data && projects.data.filter((p: any) => p.health_score < 70).length > 0
            ? projects.data.filter((p: any) => p.health_score < 70).map((p: any) => `- ${p.name}: ${p.health_score}% health`).join('\n')
            : '- All top projects healthy'}

UPCOMING SCHEDULE:
${events.data && events.data.length > 0 ? events.data.map((e: any) => `- ${e.title} (${new Date(e.start_time).toLocaleDateString()})`).join('\n') : '- No immediate events'}`
        break
      }

      case 'create_invoice': {
        if (!args.client_name || !args.amount) {
          result = 'Missing required fields: client_name and amount are required'
        } else {
          // Find client by name
          const { data: clients } = await serviceSupabase
            .from('clients')
            .select('id, name')
            .ilike('name', `%${args.client_name}%`)
            .limit(1)

          if (!clients || clients.length === 0) {
            result = `No client found matching "${args.client_name}". Please create the client first.`
          } else {
            const client = clients[0]
            const dueDays = args.due_days || 30
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + dueDays)

            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`

            const { error } = await serviceSupabase.from('invoices').insert({
              invoice_number: invoiceNumber,
              client_id: client.id,
              amount: args.amount,
              status: 'draft',
              issue_date: new Date().toISOString().split('T')[0],
              due_date: dueDate.toISOString().split('T')[0]
            })

            result = error
              ? `Failed to create invoice: ${error.message}`
              : `✅ Invoice ${invoiceNumber} created for ${client.name} - $${args.amount} (due in ${dueDays} days)`
          }
        }
        break
      }

      case 'create_project': {
        if (!args.name) {
          result = 'Missing required field: name is required'
        } else {
          let clickupTaskId: string | null = null
          let clickupResult = null

          // Step 1: Get available ClickUp lists and create task in ClickUp
          try {
            const listsResult = await clickupClient.getLists()
            if (listsResult.success && listsResult.lists && listsResult.lists.length > 0) {
              const defaultList = listsResult.lists[0]
              const dueDateUnix = args.due_date ? new Date(args.due_date).getTime() : undefined

              clickupResult = await clickupClient.createTask(defaultList.id, {
                name: args.name,
                description: args.notes || `Project created via AI chat`,
                due_date: dueDateUnix
              })

              if (clickupResult.success && clickupResult.task) {
                clickupTaskId = clickupResult.task.id
              }
            }
          } catch (clickupError) {
            console.error('ClickUp create failed:', clickupError)
            // Continue without ClickUp - will just create locally
          }

          // Step 2: Create project in Supabase with ClickUp task ID if available
          const { error } = await serviceSupabase.from('projects').insert({
            name: args.name,
            status: 'planning',
            budget: args.budget || 0,
            spent: 0,
            health_score: 100,
            due_date: args.due_date || null,
            notes: args.notes || null,
            start_date: new Date().toISOString().split('T')[0],
            clickup_task_id: clickupTaskId
          })

          if (error) {
            result = `Failed to create project: ${error.message}`
          } else if (clickupTaskId) {
            result = `✅ Project "${args.name}" created successfully in both ClickUp and local database${args.budget ? ` with budget $${args.budget}` : ''}`
          } else {
            result = `✅ Project "${args.name}" created locally${args.budget ? ` with budget $${args.budget}` : ''} (Note: Could not sync to ClickUp - check ClickUp settings)`
          }
        }
        break
      }

      case 'create_calendar_event': {
        if (!args.title || !args.date || !args.time) {
          result = 'Missing required fields: title, date, and time are required'
        } else {
          const startTime = new Date(`${args.date}T${args.time}:00`)
          const durationHours = args.duration_hours || 1
          const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000)

          // Try to sync to Google Calendar if available
          let googleEventId = null
          try {
            // We'll just create it locally for now if not integrated, but the ideal would be to use the googleCalendarClient
            // For now let's stick to the DB, but we could improve this by calling googleCalendarClient.createEvent
            // Since we're in the route handler, let's keep it simple first
          } catch (e) {
            console.error('Google Calendar sync failed during AI creation', e)
          }

          const { error } = await serviceSupabase.from('calendar_events').insert({
            title: args.title,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            location: args.location || null
          })

          result = error
            ? `Failed to create event: ${error.message}`
            : `✅ Calendar event "${args.title}" created for ${args.date} at ${args.time}${args.location ? ` at ${args.location}` : ''}`
        }
        break
      }

      case 'delete_calendar_event': {
        if (!args.title || !args.date) {
          result = 'Missing required fields: title and date are required to identify the event'
        } else {
          // First find the event
          const searchDate = new Date(args.date)
          // Look for events on that day
          const startOfDay = new Date(searchDate.setHours(0, 0, 0, 0)).toISOString()
          const endOfDay = new Date(searchDate.setHours(23, 59, 59, 999)).toISOString()

          const { data: events } = await serviceSupabase
            .from('calendar_events')
            .select('*')
            .gte('start_time', startOfDay)
            .lte('start_time', endOfDay)
            .ilike('title', `%${args.title}%`)

          if (!events || events.length === 0) {
            result = `Could not find any event matching "${args.title}" on ${args.date}.`
          } else if (events.length > 1) {
            result = `Found multiple events matching "${args.title}" on ${args.date}. Please be more specific with the title or time.`
          } else {
            const event = events[0]
            const { error } = await serviceSupabase
              .from('calendar_events')
              .delete()
              .eq('id', event.id)

            result = error
              ? `Failed to delete event: ${error.message}`
              : `✅ Deleted event: "${event.title}" on ${new Date(event.start_time).toLocaleString()}`
          }
        }
        break
      }

      default:
        result = `Unknown tool: ${name}`
    }

    results.push(result)
  }

  return results
}

export async function POST(request: NextRequest) {
  try {
    console.log('API /api/ai/chat: called')
    const body = await request.json()
    const { messages, provider: requestedProvider } = body

    if (!messages || !Array.isArray(messages)) {
      console.log('API /api/ai/chat: missing messages')
      return NextResponse.json({
        success: false,
        error: 'messages array is required'
      }, { status: 400 })
    }

    // Fetch settings from DB to determine provider and config
    const serviceSupabase = getServiceSupabase()
    const { data: dbSettings } = await serviceSupabase.from('settings').select('*')
    const config: Record<string, string> = {}
    dbSettings?.forEach((s: any) => config[s.key] = s.value)

    // Prioritize requested provider, then DB setting, then env var, then default
    const provider = requestedProvider || config['ai_provider'] || process.env.AI_PROVIDER || 'ollama'

    // Configure OpenAI if selected
    if (provider === 'openai') {
      openaiClient.configure(
        config['openai_api_key'] || process.env.OPENAI_API_KEY || '',
        config['openai_model'] || process.env.OPENAI_MODEL
      )
    }

    if (provider !== 'openai') {
      const ollamaTest = await ollamaClient.testConnection()
      if (!ollamaTest.success) {
        return NextResponse.json({
          success: false,
          error: 'AI service unavailable. Make sure Ollama is running.'
        }, { status: 503 })
      }
    }

    // Prepare messages with system prompt
    const systemMessage: OllamaMessage = {
      role: 'system',
      content: `You are an AI assistant for an executive operations dashboard. You MUST use the available tools to answer questions about business data.

IMPORTANT: You have tools that give you real data. ALWAYS use them instead of saying you can't help.

TOOL USAGE RULES:
- When asked about emails, Gmail, or inbox → use 'get_recent_emails'
- If asked to SUMMARIZE emails or read the full content, set 'include_body' to true in 'get_recent_emails'.
- When asked about invoices or overdues → use 'get_invoices'  
- When asked about projects or tasks → use 'get_projects'
- When asked about clients or leads → use 'get_clients'
- When asked about calendar, meetings, or events → use 'get_calendar_events'
- When asked for a summary or overview → use 'get_full_summary'
- When asked to send an email → use 'send_email'
- When asked to CREATE an invoice → use 'create_invoice'
- When asked to CREATE a project → use 'create_project'
- When asked to CREATE/schedule a meeting or event → use 'create_calendar_event'
- When asked to DELETE/CANCEL a meeting or event → use 'delete_calendar_event'

EXAMPLES:
User: "Get Gmail summary" → Call get_recent_emails
User: "Show overdue invoices" → Call get_invoices with status='overdue'
User: "What meetings do I have?" → Call get_calendar_events
User: "Send reminders to overdues" → First call get_invoices(status='overdue'), then call send_email for each
User: "Create invoice for John $500" → Call create_invoice with client_name='John' and amount=500
User: "New project Website Redesign budget 10000" → Call create_project with name='Website Redesign' and budget=10000
User: "Schedule meeting tomorrow at 2pm" → Call create_calendar_event with date and time
User: "Cancel the meeting with John tomorrow" → Call delete_calendar_event with title='John' and date='tomorrow's date'

Available tools: get_clients, get_projects, get_invoices, get_calendar_events, get_clickup_tasks, send_email, get_dashboard_stats, search_clients, get_client_details, get_recent_emails, get_full_summary, create_invoice, create_project, create_calendar_event, delete_calendar_event

Current date: ${new Date().toLocaleDateString()}`
    }

    const allMessages: OllamaMessage[] = [
      systemMessage,
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ]

    // First call to AI
    let response
    if (provider === 'openai') {
      response = await openaiClient.chat(allMessages, aiTools)
    } else {
      response = await ollamaClient.chat(allMessages, aiTools)
    }

    if (!response.success || !response.response) {
      return NextResponse.json({
        success: false,
        error: response.error || 'Failed to get AI response'
      }, { status: 500 })
    }

    // Check if AI wants to use tools
    if (response.response.message.tool_calls && response.response.message.tool_calls.length > 0) {
      const toolResults = await executeTools(response.response.message.tool_calls)

      allMessages.push({
        role: 'assistant',
        content: response.response.message.content || ''
      })

      allMessages.push({
        role: 'user',
        content: `Tool results:\n${toolResults.join('\n\n')}\n\nPlease provide a helpful response based on these results.`
      })

      let finalResponse
      if (provider === 'openai') {
        finalResponse = await openaiClient.chat(allMessages)
      } else {
        finalResponse = await ollamaClient.chat(allMessages)
      }

      if (!finalResponse.success || !finalResponse.response) {
        return NextResponse.json({
          success: false,
          error: 'Failed to get final response'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        response: finalResponse.response.message.content
      })
    }

    return NextResponse.json({
      success: true,
      response: response.response.message.content
    })
  } catch (error: any) {
    console.error('AI Chat error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
