export default function AdminClientDetailPage({ params }: { params: { id: string } }) {
  return (
    <section>
      <h1 className="text-xl font-medium mb-4">Client {params.id}</h1>
      <p className="text-muted text-sm">Client detail (Day 7).</p>
    </section>
  )
}
