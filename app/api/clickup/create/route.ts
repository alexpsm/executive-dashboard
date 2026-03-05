import { NextResponse } from 'next/server'
import { clickupClient } from '@/lib/integrations/clickup'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, description, due_date, list_id, status } = body

        if (!name || !list_id) {
            return NextResponse.json(
                { success: false, error: 'Name and List ID are required' },
                { status: 400 }
            )
        }

        // Convert date to unix timestamp (milliseconds)
        const dueDateUnix = due_date ? new Date(due_date).getTime() : undefined

        const result = await clickupClient.createTask(list_id, {
            name,
            description,
            due_date: dueDateUnix,
            status
        })

        if (result.success) {
            return NextResponse.json({ success: true, task: result.task })
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 })
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
