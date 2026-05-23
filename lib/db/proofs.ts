import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function listProofsForOrder(orderId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proofs')
    .select('*')
    .eq('order_id', orderId)
    .order('version', { ascending: false })
  if (error) throw error
  return data
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
