import { notFound, redirect } from 'next/navigation'
import { getProofOrderRef } from '@/lib/db/proofs'

/** Deep-link shim: `/proofs/[id]` → parent order's proof section. */
export default async function ProofPage({ params }: { params: { id: string } }) {
  const target = await getProofOrderRef(params.id)
  if (!target) notFound()
  redirect(`/orders/${target.orderRef}#proof-${params.id}`)
}
