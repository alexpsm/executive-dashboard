import { NextResponse } from 'next/server'
import { mondayClient } from '@/lib/integrations/monday'

export async function POST() {
  try {
    const result = await mondayClient.syncDealsToSupabase()

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Synced ${result.synced} deals from Monday.com`,
        synced: result.synced
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Monday sync error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const result = await mondayClient.getDealsBoard()

    if (result.success) {
      return NextResponse.json({
        success: true,
        deals: result.deals,
        groups: result.groups,
        count: result.deals?.length || 0
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('Monday fetch error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
