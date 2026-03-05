import { NextResponse } from 'next/server'
import { clickupClient } from '@/lib/integrations/clickup'

export async function GET() {
    const result = await clickupClient.getLists()

    if (result.success) {
        return NextResponse.json({ success: true, lists: result.lists })
    } else {
        // If getting lists directly fails (e.g. at Space level), we might need to fetch folders first as done in getTasks
        // For now returning the result
        return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
}
