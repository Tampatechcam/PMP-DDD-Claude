'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Proofs: admin issues signed upload URL → browser uploads PDF directly to
 * Storage → admin's browser confirms with finalizeProofUpload, which writes
 * the proofs row + an audit event.
 *
 * Client side: a client owning the order can approve / request revision via
 * decideProof. RLS lets them flip pending → approved | revision_requested
 * but the proofs_client_decide with-check forbids any other transition.
 *
 * Storage path convention (Part 5.3):
 *   proofs/{client_id}/{order_number}/{version}.pdf
 */

async function requireAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not signed in')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Admin only')
  return { user }
}

/**
 * Compute the next proof version for an order and mint a signed upload URL
 * the browser can PUT to. We use the service-role client so admin actions
 * don't depend on Storage RLS catching every edge case — the requireAdmin
 * check above is the real gate.
 */
export async function issueProofUploadUrl(orderId: string): Promise<{
  signedUrl: string
  token: string
  path: string
  version: number
  orderNumber: number
}> {
  await requireAdmin()

  // Need order_number + client_id for the path; both live on orders.
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('order_number, client_id')
    .eq('id', orderId)
    .single()
  if (orderErr || !order) throw orderErr ?? new Error('Order not found')

  const { data: lastProof } = await supabaseAdmin
    .from('proofs')
    .select('version')
    .eq('order_id', orderId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (lastProof?.version ?? 0) + 1

  const path = `${order.client_id}/${order.order_number}/${nextVersion}.pdf`
  const { data: signed, error: signedErr } = await supabaseAdmin
    .storage
    .from('proofs')
    .createSignedUploadUrl(path)
  if (signedErr || !signed) throw signedErr ?? new Error('Could not create upload URL')

  return {
    signedUrl: signed.signedUrl,
    token: signed.token,
    path,
    version: nextVersion,
    orderNumber: order.order_number as number
  }
}

/**
 * Called by the admin browser after the PUT to Storage succeeds. Inserts the
 * proofs row + an order_events row, then redirects the admin back to the
 * order's admin detail page.
 */
export async function finalizeProofUpload(
  orderId: string,
  version: number,
  path: string
) {
  await requireAdmin()

  const supabase = createClient()
  const { error: insertErr } = await supabase
    .from('proofs')
    .insert({ order_id: orderId, version, storage_path: path, status: 'pending' })
  if (insertErr) throw insertErr

  await supabase.from('order_events').insert({
    order_id: orderId,
    event: `Proof v${version} uploaded`,
    payload: { version, path }
  })

  // Pull the URL slug — digital orders redirect to /admin/orders/DIG-001,
  // DM orders to /admin/orders/651.
  const { data: order } = await supabase
    .from('orders')
    .select('order_number, display_ref')
    .eq('id', orderId)
    .single()

  revalidatePath('/orders', 'layout')
  revalidatePath('/admin', 'layout')
  if (order) {
    redirect(`/admin/orders/${order.display_ref ?? order.order_number}`)
  }
  redirect('/admin')
}

/**
 * Client decision on a pending proof. RLS guarantees:
 *   1. The caller owns the order (proofs_client_decide using-clause).
 *   2. The new status is one of 'approved' / 'revision_requested'
 *      (with-check).
 */
export async function decideProof(
  proofId: string,
  decision: 'approved' | 'revision_requested',
  comment?: string
) {
  const supabase = createClient()

  // We need order_id + version for the audit event.
  const { data: proof, error: getErr } = await supabase
    .from('proofs')
    .select('order_id, version')
    .eq('id', proofId)
    .single()
  if (getErr || !proof) throw getErr ?? new Error('Proof not found')

  const { error } = await supabase
    .from('proofs')
    .update({
      status: decision,
      client_comment: comment ?? null,
      decided_at: new Date().toISOString()
    })
    .eq('id', proofId)
  if (error) throw error

  await supabase.from('order_events').insert({
    order_id: proof.order_id,
    event: decision === 'approved'
      ? `Proof v${proof.version} approved`
      : `Proof v${proof.version} revision requested`,
    payload: comment ? { comment } : null
  })

  revalidatePath('/orders', 'layout')
}

/**
 * Server-side helper that mints a short-lived signed download URL for a
 * proof PDF. The caller's RLS already vets read access on the proofs row;
 * the storage policy on `proofs read own client` does the same for the
 * file, so we can use the user's session client here.
 */
export async function getProofDownloadUrl(proofId: string): Promise<string> {
  const supabase = createClient()
  const { data: proof, error } = await supabase
    .from('proofs')
    .select('storage_path')
    .eq('id', proofId)
    .single()
  if (error || !proof) throw error ?? new Error('Proof not found')

  const { data: signed, error: signedErr } = await supabase
    .storage
    .from('proofs')
    .createSignedUrl(proof.storage_path, 600)
  if (signedErr || !signed) throw signedErr ?? new Error('Could not sign URL')

  return signed.signedUrl
}
