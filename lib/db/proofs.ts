import 'server-only'
import { createClient } from '@/lib/supabase/server'

export type ProofRow = {
  id: string
  order_id: string
  version: number
  storage_path: string
  status: string
  client_comment: string | null
  decided_at: string | null
  decided_by: string | null
  created_at: string
}

export async function listProofsForOrder(orderId: string): Promise<ProofRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proofs')
    .select('*')
    .eq('order_id', orderId)
    .order('version', { ascending: false })
  if (error) throw error
  return (data ?? []) as ProofRow[]
}

export async function getSignedProofUrl(storagePath: string, expiresInSec = 600) {
  const supabase = createClient()
  const { data, error } = await supabase
    .storage
    .from('proofs')
    .createSignedUrl(storagePath, expiresInSec)
  if (error) throw error
  return data.signedUrl
}

/**
 * Resolve a proof id to its parent order's URL slug (`display_ref` or
 * `order_number`). Used by `/proofs/[id]` to redirect into the order's
 * proof section instead of rendering a stub page.
 */
export async function getProofOrderRef(
  proofId: string
): Promise<{ orderRef: string } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proofs')
    .select('order_id, orders(display_ref, order_number)')
    .eq('id', proofId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  const raw = data.orders as
    | { display_ref: string | null; order_number: number }
    | { display_ref: string | null; order_number: number }[]
    | null
  const order = Array.isArray(raw) ? raw[0] : raw
  if (!order) return null
  const orderRef = order.display_ref ?? String(order.order_number)
  return { orderRef }
}
