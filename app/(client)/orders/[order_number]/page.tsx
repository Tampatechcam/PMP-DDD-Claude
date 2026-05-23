/** Day 4 — see Part 8 for the card layout. */
export default function OrderCardPage({ params }: { params: { order_number: string } }) {
  return (
    <section>
      <h1 className="text-xl font-medium mb-4">Order #{params.order_number}</h1>
      <p className="text-muted text-sm">Order card lands here (Day 4).</p>
    </section>
  )
}
