import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'

// One-time migration to add avg_reach_post column
export async function POST() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Try to add the column - will fail silently if it already exists
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS avg_reach_post INTEGER DEFAULT 0'
    })

    if (error) {
      // If rpc doesn't exist, try direct approach
      // Just try to select the column to see if it exists
      const { error: testError } = await supabase
        .from('social_metrics')
        .select('avg_reach_post')
        .limit(1)

      if (testError && testError.message.includes('avg_reach_post')) {
        return NextResponse.json({
          success: false,
          error: 'Column does not exist and could not be created automatically',
          manual_sql: 'ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS avg_reach_post INTEGER DEFAULT 0;',
          instructions: 'Run this SQL in Supabase Dashboard > SQL Editor'
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Column already exists or was created'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed - avg_reach_post column added'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      manual_sql: 'ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS avg_reach_post INTEGER DEFAULT 0;',
      instructions: 'Run this SQL in Supabase Dashboard > SQL Editor'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'POST to add avg_reach_post column to social_metrics table',
    manual_sql: 'ALTER TABLE social_metrics ADD COLUMN IF NOT EXISTS avg_reach_post INTEGER DEFAULT 0;'
  })
}
