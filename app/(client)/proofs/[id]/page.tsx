/** Day 6 — proof viewer + approve/revise actions. */
export default function ProofPage({ params }: { params: { id: string } }) {
  return (
    <section>
      <h1 className="text-xl font-medium mb-4">Proof</h1>
      <p className="text-muted text-sm">Proof {params.id} viewer lands here (Day 6).</p>
    </section>
  )
}
