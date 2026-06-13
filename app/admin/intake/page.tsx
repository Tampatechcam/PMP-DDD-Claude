import { IntakeForm } from './IntakeForm'

/**
 * /admin/intake — standardized bulk-CSV intake for orders.
 *
 * Every client (Will Warner, FTA, Sentinel, etc.) uses the same template:
 *   /templates/standard-intake.csv
 *
 * The page is a thin server shell — all UI lives in IntakeForm (client component)
 * which calls previewIntakeCsv / commitIntakeCsv server actions.
 */
export default function AdminIntakePage() {
  return (
    <section className="space-y-6 max-w-4xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bulk order intake</h1>
        <p className="text-sm text-muted">
          Upload a CSV that matches the standard template. Every client uses the same shape — no
          format-specific code, no AI guessing. Strict schema validation catches problems before
          any row touches the database.
        </p>
      </header>

      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">1. Get the template</h2>
        <p className="text-sm text-muted">
          Download the CSV, fill it row-per-event, save as <code>.csv</code>, then upload below.
        </p>
        <a
          href="/templates/standard-intake.csv"
          download
          className="inline-block bg-fg text-bg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90"
        >
          ⬇ Download standard-intake.csv
        </a>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">2. Upload</h2>
        <IntakeForm />
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Required columns</h2>
        <ul className="text-xs text-muted space-y-1 font-mono">
          <li>client_name (required) — must match <code>clients.name</code> exactly</li>
          <li>office_name (optional) — must match an office within the client</li>
          <li>advisor_name, class_type, mailing_quantity (required)</li>
          <li>event_1_date, venue_text, venue_address_text (required)</li>
          <li>event_2_date, first_class_day, order_sent_deadline, start_time, end_time, event_1_room, order_instructions (optional)</li>
        </ul>
        <p className="text-xs text-muted">
          Dates: <code>YYYY-MM-DD</code>. Times: <code>HH:MM</code> (24h). Quantity: positive integer.
        </p>
      </div>
    </section>
  )
}
