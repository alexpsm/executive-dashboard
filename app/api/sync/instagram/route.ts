import { NextResponse } from 'next/server'
import { instagramClient } from '@/lib/integrations/meta/instagram'

export async function POST() {
  try {
    const result = await instagramClient.syncToSupabase()

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Instagram sync completed',
      data: result.data
    })
  } catch (error: any) {
    console.error('Instagram sync error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const test = await instagramClient.testConnection()
    return NextResponse.json({
      success: test.success,
      connected: test.success,
      error: test.error
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, connected: false, error: error.message },
      { status: 500 }
    )
  }
}
