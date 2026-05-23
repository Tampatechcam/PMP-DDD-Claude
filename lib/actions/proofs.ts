'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Client decisions on a proof. RLS guarantees the caller owns the order and
 * that the only allowed terminal statuses are 'approved' / 'revision_requested'.
 * Day 6 deliverable.
 */
export async function decideProof(
  proofId: string,
  decision: 'approved' | 'revision_requested',
  comment?: string
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('proofs')
    .update({
      status: decision,
      client_comment: comment ?? null,
      decided_at: new Date().toISOString()
    })
    .eq('id', proofId)
  if (error) throw error
  revalidatePath('/orders', 'layout')
}
