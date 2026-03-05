import axios from 'axios'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import type { XeroTokens, XeroInvoice, XeroAccount, XeroBankTransaction, XeroSyncResult } from './types'

const XERO_API_URL = 'https://api.xero.com/api.xro/2.0'
const XERO_IDENTITY_URL = 'https://identity.xero.com'
const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

class XeroClient {
  private tokens: XeroTokens | null = null

  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // Get stored tokens from Supabase settings
  async getStoredTokens(): Promise<XeroTokens | null> {
    const { data } = await this.supabase
      .from('settings')
      .select('value')
      .eq('key', 'xero_tokens')
      .single()

    if (data?.value) {
      try {
        return JSON.parse(data.value)
      } catch {
        return null
      }
    }
    return null
  }

  // Store tokens in Supabase
  async storeTokens(tokens: XeroTokens): Promise<void> {
    await this.supabase
      .from('settings')
      .upsert({
        key: 'xero_tokens',
        value: JSON.stringify(tokens),
        description: 'Xero OAuth tokens',
        updated_at: new Date().toISOString()
      })
    this.tokens = tokens
  }

  // Refresh access token if expired
  async refreshAccessToken(): Promise<XeroTokens | null> {
    const stored = await this.getStoredTokens()
    if (!stored?.refresh_token) {
      console.error('No refresh token available')
      return null
    }

    const clientId = process.env.XERO_CLIENT_ID
    const clientSecret = process.env.XERO_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Xero credentials not configured')
      return null
    }

    try {
      const response = await axios.post(XERO_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: stored.refresh_token
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
          }
        }
      )

      const newTokens: XeroTokens = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: Date.now() + (response.data.expires_in * 1000),
        tenant_id: stored.tenant_id
      }

      await this.storeTokens(newTokens)
      return newTokens
    } catch (error: any) {
      console.error('Failed to refresh Xero token:', error.response?.data || error.message)
      return null
    }
  }

  // Get valid access token (refresh if needed)
  async getAccessToken(): Promise<string | null> {
    let tokens = this.tokens || await this.getStoredTokens()

    if (!tokens) {
      console.error('No Xero tokens found - please authenticate first')
      return null
    }

    // Refresh if expiring in next 5 minutes
    if (tokens.expires_at < Date.now() + 300000) {
      tokens = await this.refreshAccessToken()
      if (!tokens) return null
    }

    this.tokens = tokens
    return tokens.access_token
  }

  // Make authenticated API request
  async apiRequest<T>(endpoint: string, method = 'GET', data?: any): Promise<T | null> {
    const accessToken = await this.getAccessToken()
    const tokens = this.tokens || await this.getStoredTokens()

    if (!accessToken || !tokens?.tenant_id) {
      throw new Error('Xero not authenticated')
    }

    try {
      const response = await axios({
        method,
        url: `${XERO_API_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'xero-tenant-id': tokens.tenant_id,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        data
      })
      return response.data
    } catch (error: any) {
      console.error(`Xero API error (${endpoint}):`, error.response?.data || error.message)
      throw error
    }
  }

  // Get invoices with date filter
  async getInvoices(startDate?: string, endDate?: string): Promise<XeroInvoice[]> {
    let where = 'Status!="DELETED"&&Status!="VOIDED"'
    if (startDate) {
      where += `&&Date>="${startDate}"`
    }

    const response = await this.apiRequest<{ Invoices: XeroInvoice[] }>(
      `/Invoices?where=${encodeURIComponent(where)}&order=Date DESC`
    )
    return response?.Invoices || []
  }

  // Get paid invoices for revenue calculation
  async getPaidInvoices(startDate: string, endDate?: string): Promise<XeroInvoice[]> {
    let where = `Status=="PAID"&&Date>="${startDate}"`
    if (endDate) {
      where += `&&Date<="${endDate}"`
    }

    const response = await this.apiRequest<{ Invoices: XeroInvoice[] }>(
      `/Invoices?where=${encodeURIComponent(where)}`
    )
    return response?.Invoices || []
  }

  // Get chart of accounts
  async getAccounts(): Promise<XeroAccount[]> {
    const response = await this.apiRequest<{ Accounts: XeroAccount[] }>('/Accounts')
    return response?.Accounts || []
  }

  // Get bank transactions (expenses)
  async getBankTransactions(startDate: string, endDate?: string): Promise<XeroBankTransaction[]> {
    let where = `Type=="SPEND"&&Date>="${startDate}"`
    if (endDate) {
      where += `&&Date<="${endDate}"`
    }

    const response = await this.apiRequest<{ BankTransactions: XeroBankTransaction[] }>(
      `/BankTransactions?where=${encodeURIComponent(where)}`
    )
    return response?.BankTransactions || []
  }

  // Calculate YTD revenue
  async getYTDRevenue(): Promise<number> {
    const startOfYear = new Date()
    startOfYear.setMonth(0, 1)
    startOfYear.setHours(0, 0, 0, 0)

    const invoices = await this.getPaidInvoices(startOfYear.toISOString().split('T')[0])
    return invoices.reduce((sum, inv) => sum + (inv.AmountPaid || inv.Total), 0)
  }

  // Calculate running costs
  async getRunningCosts(startDate: string, endDate?: string): Promise<number> {
    const transactions = await this.getBankTransactions(startDate, endDate)
    return transactions.reduce((sum, tx) => sum + Math.abs(tx.Total), 0)
  }

  // Calculate running costs saved (compared to same period last year)
  // Returns: { lastYearCosts, thisYearCosts, saved, lastYearPeriod, thisYearPeriod }
  async getRunningCostsSaved(): Promise<{
    lastYearCosts: number
    thisYearCosts: number
    saved: number
    lastYearPeriod: { start: string; end: string }
    thisYearPeriod: { start: string; end: string }
  }> {
    const today = new Date()
    const currentYear = today.getFullYear()
    const lastYear = currentYear - 1

    // This year: Jan 1 to today
    const thisYearStart = `${currentYear}-01-01`
    const thisYearEnd = today.toISOString().split('T')[0]

    // Last year: Same period (Jan 1 to same day last year)
    const lastYearStart = `${lastYear}-01-01`
    const lastYearEndDate = new Date(today)
    lastYearEndDate.setFullYear(lastYear)
    const lastYearEnd = lastYearEndDate.toISOString().split('T')[0]

    // Fetch running costs for both periods
    const [thisYearCosts, lastYearCosts] = await Promise.all([
      this.getRunningCosts(thisYearStart, thisYearEnd),
      this.getRunningCosts(lastYearStart, lastYearEnd)
    ])

    // Calculate savings (positive = we saved money, negative = we spent more)
    const saved = lastYearCosts - thisYearCosts

    console.log(`Running costs comparison:`)
    console.log(`  Last year (${lastYearStart} to ${lastYearEnd}): £${lastYearCosts.toFixed(2)}`)
    console.log(`  This year (${thisYearStart} to ${thisYearEnd}): £${thisYearCosts.toFixed(2)}`)
    console.log(`  Saved: £${saved.toFixed(2)}`)

    return {
      lastYearCosts,
      thisYearCosts,
      saved,
      lastYearPeriod: { start: lastYearStart, end: lastYearEnd },
      thisYearPeriod: { start: thisYearStart, end: thisYearEnd }
    }
  }

  // Sync all Xero data to Supabase
  async syncToSupabase(): Promise<XeroSyncResult> {
    try {
      const startOfYear = new Date()
      startOfYear.setMonth(0, 1)
      const startDate = startOfYear.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      // Fetch data from Xero
      const [invoices, accounts, transactions] = await Promise.all([
        this.getInvoices(startDate),
        this.getAccounts(),
        this.getBankTransactions(startDate)
      ])

      // Calculate metrics
      const paidInvoices = invoices.filter(i => i.Status === 'PAID')
      const revenue = paidInvoices.reduce((sum, inv) => sum + (inv.AmountPaid || inv.Total), 0)
      const expenses = transactions.reduce((sum, tx) => sum + Math.abs(tx.Total), 0)

      // Calculate running costs saved (compared to same period last year)
      const runningCostsComparison = await this.getRunningCostsSaved()

      // Upsert invoices to Supabase
      for (const invoice of invoices) {
        // Find or create client
        let clientId = null
        if (invoice.Contact?.Name) {
          const { data: existingClient } = await this.supabase
            .from('clients')
            .select('id')
            .eq('name', invoice.Contact.Name)
            .single()

          if (existingClient) {
            clientId = existingClient.id
          } else {
            const { data: newClient } = await this.supabase
              .from('clients')
              .insert({ name: invoice.Contact.Name, source: 'xero' })
              .select('id')
              .single()
            clientId = newClient?.id
          }
        }

        // Map Xero status to our status
        const statusMap: Record<string, string> = {
          'DRAFT': 'draft',
          'SUBMITTED': 'sent',
          'AUTHORISED': 'sent',
          'PAID': 'paid',
          'VOIDED': 'voided'
        }

        await this.supabase
          .from('invoices')
          .upsert({
            external_id: invoice.InvoiceID,
            invoice_number: invoice.InvoiceNumber,
            client_id: clientId,
            amount: invoice.Total,
            status: statusMap[invoice.Status] || 'draft',
            issue_date: invoice.Date?.split('T')[0],
            due_date: invoice.DueDate?.split('T')[0],
            currency: invoice.CurrencyCode,
            source: 'xero'
          }, { onConflict: 'external_id' })
      }

      // Upsert accounts
      for (const account of accounts) {
        await this.supabase
          .from('xero_accounts')
          .upsert({
            external_id: account.AccountID,
            account_code: account.Code,
            account_name: account.Name,
            account_type: account.Type
          }, { onConflict: 'external_id' })
      }

      // Upsert financial KPIs
      await this.supabase
        .from('financial_kpis')
        .upsert({
          metric_date: today,
          cross_platform_revenue: revenue,
          running_costs_total: expenses,
          running_costs_saved: runningCostsComparison.saved, // Last year same period - this year
          running_costs_last_year: runningCostsComparison.lastYearCosts,
          xero_synced_at: new Date().toISOString()
        }, { onConflict: 'metric_date' })

      // Update sync status
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'xero',
          last_sync_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          records_synced: invoices.length + accounts.length,
          is_healthy: true,
          last_error: null
        }, { onConflict: 'api_name' })

      return {
        success: true,
        data: {
          invoices: invoices.length,
          accounts: accounts.length,
          transactions: transactions.length,
          revenue,
          expenses,
          runningCosts: {
            thisYear: runningCostsComparison.thisYearCosts,
            lastYear: runningCostsComparison.lastYearCosts,
            saved: runningCostsComparison.saved,
            thisYearPeriod: runningCostsComparison.thisYearPeriod,
            lastYearPeriod: runningCostsComparison.lastYearPeriod
          }
        }
      }
    } catch (error: any) {
      // Update sync status with error
      await this.supabase
        .from('api_sync_status')
        .upsert({
          api_name: 'xero',
          last_sync_at: new Date().toISOString(),
          last_error: error.message,
          is_healthy: false
        }, { onConflict: 'api_name' })

      return { success: false, error: error.message }
    }
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const accessToken = await this.getAccessToken()
      if (!accessToken) {
        return { success: false, error: 'No valid access token' }
      }
      await this.getAccounts()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Store PKCE verifier temporarily
  async storePKCEVerifier(state: string, verifier: string): Promise<void> {
    await this.supabase
      .from('settings')
      .upsert({
        key: `xero_pkce_${state}`,
        value: verifier,
        description: 'Temporary PKCE verifier',
        updated_at: new Date().toISOString()
      })
  }

  // Get and delete PKCE verifier
  async getPKCEVerifier(state: string): Promise<string | null> {
    const { data } = await this.supabase
      .from('settings')
      .select('value')
      .eq('key', `xero_pkce_${state}`)
      .single()

    // Clean up the verifier after retrieval
    if (data?.value) {
      await this.supabase
        .from('settings')
        .delete()
        .eq('key', `xero_pkce_${state}`)
    }

    return data?.value || null
  }

  // Generate OAuth URL for authentication (supports both standard and PKCE)
  async getAuthUrl(redirectUri: string, usePKCE = false): Promise<{ url: string; verifier?: string }> {
    const clientId = process.env.XERO_CLIENT_ID
    if (!clientId) throw new Error('XERO_CLIENT_ID not configured')

    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access',
      'accounting.transactions.read',
      'accounting.reports.read',
      'accounting.settings.read',
      'accounting.contacts.read'
    ].join(' ')

    const state = crypto.randomBytes(16).toString('hex')

    const params: Record<string, string> = {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      state: state
    }

    let verifier: string | undefined

    if (usePKCE) {
      verifier = generateCodeVerifier()
      const challenge = generateCodeChallenge(verifier)
      params.code_challenge = challenge
      params.code_challenge_method = 'S256'

      // Store verifier for later retrieval
      await this.storePKCEVerifier(state, verifier)
    }

    const url = `${XERO_IDENTITY_URL}/connect/authorize?` + new URLSearchParams(params).toString()
    return { url, verifier }
  }

  // Exchange auth code for tokens (supports both standard and PKCE)
  async exchangeCodeForTokens(code: string, redirectUri: string, state?: string): Promise<XeroTokens | null> {
    const clientId = process.env.XERO_CLIENT_ID
    const clientSecret = process.env.XERO_CLIENT_SECRET

    if (!clientId) {
      throw new Error('XERO_CLIENT_ID not configured')
    }

    try {
      // Check if we have a PKCE verifier stored
      let codeVerifier: string | null = null
      if (state) {
        codeVerifier = await this.getPKCEVerifier(state)
      }

      const tokenParams: Record<string, string> = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded'
      }

      if (codeVerifier) {
        // PKCE flow - send verifier, no Basic auth
        tokenParams.code_verifier = codeVerifier
        console.log('Using PKCE flow for token exchange')
      } else if (clientSecret) {
        // Standard flow - use Basic auth
        headers['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        console.log('Using standard flow for token exchange')
      } else {
        throw new Error('Neither PKCE verifier nor client secret available')
      }

      const tokenResponse = await axios.post(XERO_TOKEN_URL,
        new URLSearchParams(tokenParams), { headers }
      )

      // Get tenant ID
      const connectionsResponse = await axios.get('https://api.xero.com/connections', {
        headers: { 'Authorization': `Bearer ${tokenResponse.data.access_token}` }
      })

      const tenantId = connectionsResponse.data[0]?.tenantId
      if (!tenantId) {
        throw new Error('No Xero organization found')
      }

      const tokens: XeroTokens = {
        access_token: tokenResponse.data.access_token,
        refresh_token: tokenResponse.data.refresh_token,
        expires_at: Date.now() + (tokenResponse.data.expires_in * 1000),
        tenant_id: tenantId
      }

      await this.storeTokens(tokens)
      return tokens
    } catch (error: any) {
      console.error('Xero token exchange failed:', error.response?.data || error.message)
      return null
    }
  }
}

export const xeroClient = new XeroClient()
