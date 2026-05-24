import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type InvoiceRow = {
  id: string
  order_id: string
  status: string
  invoice_sent_date: string | null
  invoice_paid_date: string | null
  invoiced_dm_rate: number | null
  invoiced_dm_total: number | null
  invoiced_digital: number | null
  invoiced_tech: number | null
  cc_processing: number | null
  fl_state_tax: number | null
  total_invoice: number | null
  created_at: string
  orders: { order_number: number; display_ref: string | null; client_id: string } | null
}

// Admin-only. RLS rejects non-admin callers; the layout's role check is
// belt-and-braces UI nav.
export async function adminListInvoices(): Promise<InvoiceRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, orders ( order_number, display_ref, client_id )')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as InvoiceRow[]
}

/** Single invoice by uuid for the detail page. */
export async function adminGetInvoice(id: string): Promise<InvoiceRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, orders ( order_number, display_ref, client_id )')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as unknown as InvoiceRow | null
}
