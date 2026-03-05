import axios from 'axios'
import { OllamaMessage, OllamaTool, OllamaResponse } from './ollama'

const OPENAI_API_URL = 'https://api.openai.com/v1'

export class OpenAIClient {
    private apiKey: string
    private model: string

    constructor(apiKey?: string, model?: string) {
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
        this.model = model || process.env.OPENAI_MODEL || 'gpt-4o'
    }

    configure(apiKey: string, model?: string) {
        this.apiKey = apiKey
        if (model) this.model = model
    }

    async chat(
        messages: OllamaMessage[],
        tools?: OllamaTool[]
    ): Promise<{ success: boolean; response?: OllamaResponse; error?: string }> {
        if (!this.apiKey) {
            return { success: false, error: 'OpenAI API Key is missing. Please configure it in Settings.' }
        }

        try {
            const response = await axios.post(
                `${OPENAI_API_URL}/chat/completions`,
                {
                    model: this.model,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    tools: tools?.map(t => ({
                        type: 'function',
                        function: t.function
                    })),
                    tool_choice: tools ? 'auto' : undefined
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            )

            const choice = response.data.choices[0]
            const msg = choice.message

            // Map OpenAI response to OllamaResponse format for compatibility
            const mappedResponse: OllamaResponse = {
                model: this.model,
                message: {
                    role: msg.role,
                    content: msg.content || '',
                    tool_calls: msg.tool_calls?.map((tc: any) => ({
                        function: {
                            name: tc.function.name,
                            arguments: tc.function.arguments // OpenAI returns string JSON
                        }
                    }))
                },
                done: true
            }

            return { success: true, response: mappedResponse }
        } catch (error: any) {
            console.error('OpenAI chat error:', error.response?.data || error.message)
            return { success: false, error: error.response?.data?.error?.message || error.message }
        }
    }

    async testConnection(key: string): Promise<{ success: boolean; error?: string }> {
        try {
            await axios.get(`${OPENAI_API_URL}/models`, {
                headers: { 'Authorization': `Bearer ${key}` }
            })
            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.response?.data?.error?.message || error.message }
        }
    }
}

export const openaiClient = new OpenAIClient()
