export default function AdminOrderDetailPage({ params }: { params: { order_number: string } }) {
  return (
    <section>
      <h1 className="text-xl font-medium mb-4">Order #{params.order_number}</h1>
      <p className="text-muted text-sm">Admin order detail (Day 7).</p>
    </section>
  )
}
