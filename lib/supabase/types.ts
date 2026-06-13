export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type InvoiceStatus      = 'draft' | 'pending' | 'sent' | 'overdue' | 'paid' | 'cancelled'
export type ReminderStatus     = 'scheduled' | 'sent' | 'failed' | 'cancelled'
export type ReminderChannel    = 'whatsapp' | 'email'
export type Plan               = 'free' | 'pro' | 'business'
export type RecurrenceInterval = 'monthly' | 'quarterly' | 'yearly'
export type BusinessType       = 'tuition_centre' | 'contractor' | 'freelancer' | 'salon' | 'agency' | 'other'

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
          whatsapp_reminders_enabled: boolean
          subscription_expires_at: string | null
          dpo_transaction_ref: string | null
          two_fa_enabled: boolean
          totp_secret: string | null
          deleted_at: string | null
          default_currency: string
          tax_label: string
          default_vat_rate: number
          pending_plan: string | null
          business_type: BusinessType | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          name?: string | null
          firm_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string
          vat_number?: string | null
          currency?: string
          logo_url?: string | null
          plan?: Plan
          invoice_theme?: string | null
          brand_color_primary?: string | null
          brand_color_header?: string | null
          whatsapp_reminders_enabled?: boolean
          subscription_expires_at?: string | null
          dpo_transaction_ref?: string | null
          two_fa_enabled?: boolean
          totp_secret?: string | null
          deleted_at?: string | null
          default_currency?: string
          tax_label?: string
          default_vat_rate?: number
          pending_plan?: string | null
          business_type?: BusinessType | null
        }
        Update: {
          email?: string | null
          name?: string | null
          firm_name?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string
          vat_number?: string | null
          currency?: string
          logo_url?: string | null
          plan?: Plan
          invoice_theme?: string | null
          brand_color_primary?: string | null
          brand_color_header?: string | null
          whatsapp_reminders_enabled?: boolean
          subscription_expires_at?: string | null
          dpo_transaction_ref?: string | null
          two_fa_enabled?: boolean
          totp_secret?: string | null
          deleted_at?: string | null
          default_currency?: string
          tax_label?: string
          default_vat_rate?: number
          pending_plan?: string | null
          business_type?: BusinessType | null
        }
        Relationships: []
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
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          vat_number?: string | null
          notes?: string | null
          deleted_at?: string | null
        }
        Update: {
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          country?: string | null
          vat_number?: string | null
          notes?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'clients_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
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
          discount_amount: number
          is_recurring: boolean
          recurrence_interval: RecurrenceInterval | null
          next_recurring_date: string | null
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
        Insert: {
          user_id: string
          invoice_number: string
          status: InvoiceStatus
          client_name: string
          issue_date: string
          subtotal: number
          vat_rate: number
          vat_amount: number
          deposit_amount: number
          discount_amount: number
          is_recurring: boolean
          total: number
          currency: string
          client_id?: string | null
          client_email?: string | null
          client_phone?: string | null
          client_address?: string | null
          client_vat?: string | null
          project?: string | null
          notes?: string | null
          due_date?: string | null
          recurrence_interval?: RecurrenceInterval | null
          next_recurring_date?: string | null
          whatsapp_sent_at?: string | null
          whatsapp_to?: string | null
          email_sent_at?: string | null
          email_to?: string | null
        }
        Update: {
          status?: InvoiceStatus
          client_id?: string | null
          client_name?: string
          client_email?: string | null
          client_phone?: string | null
          client_address?: string | null
          client_vat?: string | null
          project?: string | null
          notes?: string | null
          issue_date?: string
          due_date?: string | null
          subtotal?: number
          vat_rate?: number
          vat_amount?: number
          deposit_amount?: number
          discount_amount?: number
          is_recurring?: boolean
          recurrence_interval?: RecurrenceInterval | null
          next_recurring_date?: string | null
          total?: number
          currency?: string
          whatsapp_sent_at?: string | null
          whatsapp_to?: string | null
          email_sent_at?: string | null
          email_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'invoices_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          }
        ]
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
        Insert: {
          invoice_id: string
          user_id: string
          description: string
          quantity: number
          unit_price: number
          sort_order: number
          amount?: number
        }
        Update: {
          description?: string
          quantity?: number
          unit_price?: number
          sort_order?: number
          amount?: number
        }
        Relationships: [
          {
            foreignKeyName: 'invoice_items_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          }
        ]
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
          error_message: string | null
          message_preview: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          invoice_id: string
          send_at: string
          channel: ReminderChannel
          status: ReminderStatus
          days_after_due?: number | null
          recipient_phone?: string | null
          recipient_email?: string | null
          sent_at?: string | null
          error_message?: string | null
          message_preview?: string | null
        }
        Update: {
          send_at?: string
          days_after_due?: number | null
          channel?: ReminderChannel
          recipient_phone?: string | null
          recipient_email?: string | null
          status?: ReminderStatus
          sent_at?: string | null
          error_message?: string | null
          message_preview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reminders_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_invoice_number: {
        Args: { p_user_id: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience row types used across the app
export type ProfileRow      = Database['public']['Tables']['profiles']['Row']
export type InvoiceRow      = Database['public']['Tables']['invoices']['Row']
export type InvoiceItemRow  = Database['public']['Tables']['invoice_items']['Row']
export type ClientRow       = Database['public']['Tables']['clients']['Row']
export type ReminderRow     = Database['public']['Tables']['reminders']['Row']

// Insert types (used for type-casting insert payloads)
export type ProfileInsert   = Database['public']['Tables']['profiles']['Insert']
export type InvoiceInsert   = Database['public']['Tables']['invoices']['Insert']
export type ClientInsert    = Database['public']['Tables']['clients']['Insert']
export type ReminderInsert  = Database['public']['Tables']['reminders']['Insert']

// Update types (used for type-casting update payloads)
export type ProfileUpdate   = Database['public']['Tables']['profiles']['Update']
export type InvoiceUpdate   = Database['public']['Tables']['invoices']['Update']
export type ClientUpdate    = Database['public']['Tables']['clients']['Update']
export type ReminderUpdate  = Database['public']['Tables']['reminders']['Update']

// Join types for queries that embed related rows
export type InvoiceWithItems = InvoiceRow & { invoice_items: InvoiceItemRow[] }
