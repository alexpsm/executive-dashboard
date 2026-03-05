import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Retrieve all baselines
export async function GET() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase
    .from('platform_baselines')
    .select('*')
    .order('platform')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ baselines: data })
}

// PATCH - Update baseline for a specific platform
export async function PATCH(request: Request) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const body = await request.json()
  const { platform, followers_jan1_2026, views_jan1_2026, notes } = body

  if (!platform) {
    return NextResponse.json({ error: 'Platform is required' }, { status: 400 })
  }

  const updateData: Record<string, any> = {}

  if (followers_jan1_2026 !== undefined) {
    updateData.followers_jan1_2026 = followers_jan1_2026
  }
  if (views_jan1_2026 !== undefined) {
    updateData.views_jan1_2026 = views_jan1_2026
  }
  if (notes !== undefined) {
    updateData.notes = notes
  }

  const { data, error } = await supabase
    .from('platform_baselines')
    .upsert({
      platform,
      ...updateData
    }, { onConflict: 'platform' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
