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
