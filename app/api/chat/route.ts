import { NextResponse } from 'next/server'
import { ollamaClient, aiTools, OllamaMessage } from '@/lib/ai/ollama'
import { openaiClient } from '@/lib/ai/openai'
import { KPI_GOALS_2026 } from '@/lib/goals'
import { supabase } from '@/lib/supabase/client'
import { toolHandlers } from '@/lib/ai/tools'

export async function POST(request: Request) {
    try {
        const { message, context, messages: history = [] } = await request.json()

        // 1. Fetch current dashboard stats for context
        const { data: stats } = await supabase.from('dashboard_stats').select('*').single()

        const systemPrompt = `You are the 'Executive AI Assistant' for 'Boxing News' (Year 2026).
Your goal is to help the executive team reach their targets:
- Revenue: £${KPI_GOALS_2026.REVENUE} (Current: £${stats?.ytd_revenue || 0})
- Gen Z Audience: 1.15M (Current: ${stats?.total_audience || 0})
- Costs Saved: £${KPI_GOALS_2026.COST_SAVINGS}

You have access to the business database and can perform actions like searching clients, checking deals, and syncing data.
Always be professional, concise, and proactive.
Current Context: ${context || 'General Dashboard'}`

        const messages: OllamaMessage[] = [
            { role: 'system', content: systemPrompt },
            ...history,
            { role: 'user', content: message }
        ]

        // 2. Choose Engine (Ollama with fallback to OpenAI)
        let engine: 'ollama' | 'openai' | 'none' = 'none'
        const ollamaTest = await ollamaClient.testConnection()

        if (ollamaTest.success) {
            engine = 'ollama'
        } else {
            const { data: settings } = await supabase.from('settings').select('*').eq('key', 'openai_api_key').single()
            if (settings?.value || process.env.OPENAI_API_KEY) {
                engine = 'openai'
                if (settings?.value) openaiClient.configure(settings.value)
            }
        }

        if (engine === 'none') {
            return NextResponse.json({
                success: true,
                reply: "I'm currently unable to connect to an AI engine. Please ensure Ollama is running locally or provide an OpenAI API key in Settings."
            })
        }

        // 3. Chat Loop (handle tool calls)
        let responseText = ""
        let iterations = 0
        const maxIterations = 5

        while (iterations < maxIterations) {
            iterations++

            const result = engine === 'ollama'
                ? await ollamaClient.chat(messages, aiTools)
                : await openaiClient.chat(messages, aiTools)

            if (!result.success || !result.response) {
                responseText = `I encountered an error: ${result.error}`
                break
            }

            const assistantMsg = result.response.message
            messages.push(assistantMsg as OllamaMessage)

            if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
                responseText = assistantMsg.content
                break
            }

            // Execute tool calls
            for (const toolCall of assistantMsg.tool_calls) {
                const fnName = toolCall.function.name
                const handler = toolHandlers[fnName]

                let toolResult
                if (handler) {
                    try {
                        const args = typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments
                        toolResult = await handler(args)
                    } catch (e: any) {
                        toolResult = { error: `Handler error: ${e.message}` }
                    }
                } else {
                    toolResult = { error: `Tool ${fnName} not implemented.` }
                }

                messages.push({
                    role: 'assistant', // Ollama uses assistant role for tool results in some versions, or a 'tool' role. 
                    content: `Tool Result (${fnName}): ${JSON.stringify(toolResult)}`
                })
            }
        }

        return NextResponse.json({ success: true, reply: responseText })

    } catch (error: any) {
        console.error('Chat API Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
