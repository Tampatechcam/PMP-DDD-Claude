/** Day 6 — admin proof upload (direct browser → Storage via signed URL). */
export default function AdminProofUploadPage({ params }: { params: { id: string } }) {
  return (
    <section>
      <h1 className="text-xl font-medium mb-4">Upload proof</h1>
      <p className="text-muted text-sm">Proof {params.id} upload (Day 6).</p>
    </section>
  )
}
