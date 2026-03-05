export interface XeroTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  tenant_id: string
}

export interface XeroInvoice {
  InvoiceID: string
  InvoiceNumber: string
  Type: string
  Status: string
  Total: number
  AmountDue: number
  AmountPaid: number
  CurrencyCode: string
  Date: string
  DueDate: string
  Contact?: {
    ContactID: string
    Name: string
  }
}

export interface XeroAccount {
  AccountID: string
  Code: string
  Name: string
  Type: string
  Class: string
  Status: string
}

export interface XeroBankTransaction {
  BankTransactionID: string
  Type: string
  Date: string
  Total: number
  Contact?: {
    Name: string
  }
  LineItems: Array<{
    Description: string
    AccountCode: string
    LineAmount: number
  }>
}

export interface XeroSyncResult {
  success: boolean
  data?: {
    invoices?: number
    accounts?: number
    transactions?: number
    revenue?: number
    expenses?: number
  }
  error?: string
}
