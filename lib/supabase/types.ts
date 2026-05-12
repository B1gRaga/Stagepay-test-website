export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'overdue' | 'paid'
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled'
export type ReminderChannel = 'whatsapp' | 'email'
export type Plan = 'free' | 'pro' | 'business'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          name: string | null
          firm_name: string | null
          phone: string | null
          address: string | null
          city: string | null
          country: string
          vat_number: string | null
          currency: string
          logo_url: string | null
          plan: Plan
          invoice_theme: string | null
          brand_color_primary: string | null
          brand_color_header: string | null
          subscription_expires_at: string | null
          dpo_transaction_ref: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          country: string | null
          vat_number: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['clients']['Insert'], 'user_id'>>
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          client_id: string | null
          invoice_number: string
          status: InvoiceStatus
          client_name: string
          client_email: string | null
          client_phone: string | null
          client_address: string | null
          client_vat: string | null
          project: string | null
          notes: string | null
          issue_date: string
          due_date: string | null
          subtotal: number
          vat_rate: number
          vat_amount: number
          deposit_amount: number
          total: number
          currency: string
          whatsapp_sent_at: string | null
          whatsapp_to: string | null
          email_sent_at: string | null
          email_to: string | null
          public_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'public_token' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['invoices']['Insert'], 'user_id'>>
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          user_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'amount' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['invoice_items']['Insert'], 'user_id' | 'invoice_id'>>
      }
      reminders: {
        Row: {
          id: string
          user_id: string
          invoice_id: string
          send_at: string
          days_after_due: number | null
          channel: ReminderChannel
          recipient_phone: string | null
          recipient_email: string | null
          status: ReminderStatus
          sent_at: string | null
          message_preview: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reminders']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['reminders']['Insert'], 'user_id' | 'invoice_id'>>
      }
    }
  }
}
