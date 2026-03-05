import { NextResponse } from 'next/server'
import { clickupClient } from '@/lib/integrations/clickup'

export async function GET() {
  try {
    const result = await clickupClient.getTasks()
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      tasks: result.tasks,
      count: result.tasks?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
