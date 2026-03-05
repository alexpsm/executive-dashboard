import { NextResponse } from 'next/server'
import { tiktokClient } from '@/lib/integrations/tiktok/client'

export async function POST(request: Request) {
  try {
    // Check if this is a manual input request
    const contentType = request.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const body = await request.json()

      // If manual metrics are provided, save them
      if (body.manual) {
        const result = await tiktokClient.saveManualMetrics(body.metrics)
        return NextResponse.json({
          success: result.success,
          message: result.success ? 'TikTok metrics saved' : 'Failed to save',
          error: result.error
        })
      }
    }

    // Otherwise, attempt sync (will indicate manual input required)
    const result = await tiktokClient.syncToSupabase()

    return NextResponse.json({
      success: result.success,
      message: result.requiresManualInput
        ? 'TikTok requires manual input'
        : 'TikTok sync completed',
      requiresManualInput: result.requiresManualInput,
      data: result.data,
      error: result.error
    })
  } catch (error: any) {
    console.error('TikTok sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const test = await tiktokClient.testConnection()
    return NextResponse.json({
      success: test.success,
      connected: test.success,
      requiresManualInput: test.requiresManualInput,
      error: test.error
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, connected: false, requiresManualInput: true, error: error.message },
      { status: 500 }
    )
  }
}
