import { NextRequest, NextResponse } from 'next/server'
import { createEmailBody } from '@/lib/integrations/gmail'
import { sendEmailOAuth } from '@/lib/integrations/gmail-oauth'
import { getServiceSupabase } from '@/lib/supabase/client'

export async function POST(request: NextRequest) {
  try {
    const reqBody = await request.json()
    const { type, to, subject, body, content } = reqBody
    const messageContent = body || content // Handle both field names
    const supabase = getServiceSupabase()

    // Handle invoice reminders
    if (type === 'invoice_reminders') {
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('*, clients(name, email)')
        .eq('status', 'overdue')

      if (!overdueInvoices || overdueInvoices.length === 0) {
        return NextResponse.json({
          success: true,
          sent: 0,
          message: 'No overdue invoices to send reminders for'
        })
      }

      let sent = 0
      let errors = 0

      for (const invoice of overdueInvoices) {
        if (!invoice.clients?.email) continue

        const daysOverdue = Math.ceil(
          (Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
        )

        const emailBody = createEmailBody({
          greeting: `Dear ${invoice.clients.name},`,
          body: `
            <p>This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> 
            for <strong>$${invoice.amount.toFixed(2)}</strong> is now 
            <span style="color: #dc2626;">${daysOverdue} days overdue</span>.</p>
            
            <div style="background: #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0;"><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p style="margin: 8px 0 0 0;"><strong>Amount Due:</strong> $${invoice.amount.toFixed(2)}</p>
              <p style="margin: 8px 0 0 0;"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
            </div>
            
            <p>Please arrange payment at your earliest convenience.</p>
          `,
          signature: 'Best regards,<br><strong>Operations Team</strong>'
        })

        const result = await sendEmailOAuth(
          invoice.clients.email,
          `Payment Reminder: Invoice ${invoice.invoice_number}`,
          emailBody
        )

        if (result.success) {
          sent++

          // Update invoice status
          await supabase
            .from('invoices')
            .update({ status: 'overdue' }) // Keep as overdue, could add 'reminder_sent' status
            .eq('id', invoice.id)

          // Log the action
          await supabase.from('automation_logs').insert({
            action_type: 'invoice_reminder',
            details: `Sent reminder for ${invoice.invoice_number} to ${invoice.clients.email}`,
            success: true
          })
        } else {
          errors++
          await supabase.from('automation_logs').insert({
            action_type: 'invoice_reminder',
            details: `Failed to send reminder for ${invoice.invoice_number}`,
            success: false,
            error_message: result.error
          })
        }
      }

      // Update ROI metrics
      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabase
        .from('roi_metrics')
        .select('*')
        .eq('metric_date', today)
        .single()

      if (existing) {
        await supabase
          .from('roi_metrics')
          .update({
            emails_sent: (existing.emails_sent || 0) + sent,
            time_saved_hours: (existing.time_saved_hours || 0) + (sent * 0.1)
          })
          .eq('metric_date', today)
      } else {
        await supabase.from('roi_metrics').insert({
          metric_date: today,
          emails_sent: sent,
          time_saved_hours: sent * 0.1
        })
      }

      return NextResponse.json({
        success: true,
        sent,
        errors,
        message: `Sent ${sent} invoice reminders`
      })
    }

    // Handle single email
    if (to && subject && messageContent) {
      const result = await sendEmailOAuth(
        to,
        subject,
        messageContent
      )

      if (result.success) {
        await supabase.from('automation_logs').insert({
          action_type: 'email_sent',
          details: `Sent email to ${to}: ${subject}`,
          success: true
        })

        return NextResponse.json({
          success: true,
          messageId: result.messageId,
          message: 'Email sent successfully'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: result.error
        }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid request. Provide type=invoice_reminders or to/subject/body'
    }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
