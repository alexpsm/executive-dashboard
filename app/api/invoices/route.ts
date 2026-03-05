import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('invoices')
      .select('*, clients(name, email)')
      .order('due_date', { ascending: true })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: invoices, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      invoices: invoices || [],
      count: invoices?.length || 0,
      totalOverdue: invoices
        ?.filter(i => i.status === 'overdue')
        .reduce((sum, i) => sum + i.amount, 0) || 0
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoice_number, client_id, amount, status, issue_date, due_date } = body

    if (!invoice_number || !amount || !issue_date || !due_date) {
      return NextResponse.json({
        success: false,
        error: 'invoice_number, amount, issue_date, and due_date are required'
      }, { status: 400 })
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number,
        client_id: client_id || null,
        amount,
        status: status || 'draft',
        issue_date,
        due_date
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      invoice
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
