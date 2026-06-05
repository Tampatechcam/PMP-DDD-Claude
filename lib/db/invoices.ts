import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonatedClientId } from '@/lib/db/impersonation'

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
  // Stripe mirror (migration 015). Null until the invoice is generated.
  stripe_invoice_id: string | null
  hosted_invoice_url: string | null
  invoice_pdf_url: string | null
  stripe_status: string | null
  created_at: string
  orders: {
    order_number: number
    display_ref: string | null
    client_id: string
    clients?: { name: string } | null
  } | null
}

const INVOICE_SELECT =
  '*, orders ( order_number, display_ref, client_id, clients ( name ) )'

// Admin-only. RLS rejects non-admin callers; the layout's role check is
// belt-and-braces UI nav.
export async function adminListInvoices(): Promise<InvoiceRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as InvoiceRow[]
}

/** Single invoice by uuid for the admin detail page. */
export async function adminGetInvoice(id: string): Promise<InvoiceRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as unknown as InvoiceRow | null
}

/**
 * Existing invoice for an order, if any. Drives "Generate invoice" vs "View
 * invoice" on the admin order page and enforces one invoice per order in the
 * generate action.
 */
export async function adminGetInvoiceForOrder(
  orderId: string
): Promise<InvoiceRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data ?? null) as unknown as InvoiceRow | null
}

/**
 * Client portal: the signed-in client's invoices. RLS (invoices_client_select)
 * scopes real clients to their own orders. An admin "viewing as" a client must
 * be scoped explicitly — admin RLS would otherwise return every invoice — so we
 * filter by the impersonated client's orders in JS (invoice volume is low).
 */
export async function listInvoicesForClient(): Promise<InvoiceRow[]> {
  const supabase = createClient()
  const impersonatedId = await getImpersonatedClientId()
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .order('created_at', { ascending: false })
  if (error) throw error
  let rows = (data ?? []) as unknown as InvoiceRow[]
  if (impersonatedId) {
    rows = rows.filter((r) => r.orders?.client_id === impersonatedId)
  }
  return rows
}

/** Client portal: one invoice by uuid, with the same impersonation guard. */
export async function getInvoiceForClient(
  id: string
): Promise<InvoiceRow | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  const row = (data ?? null) as unknown as InvoiceRow | null
  if (!row) return null
  const impersonatedId = await getImpersonatedClientId()
  if (impersonatedId && row.orders?.client_id !== impersonatedId) return null
  return row
}

/**
 * Webhook lookup. Runs from a public route handler (no user cookie), so it
 * uses the service-role client and is keyed by the Stripe invoice id.
 */
export async function getInvoiceByStripeId(
  stripeInvoiceId: string
): Promise<{ id: string; order_id: string } | null> {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('id, order_id')
    .eq('stripe_invoice_id', stripeInvoiceId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}
