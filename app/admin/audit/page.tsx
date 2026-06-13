import { requireAdmin } from '@/lib/db/auth'
import { listAuditEntries, auditDistinctSources, type AuditFilters } from '@/lib/db/audit-query'

interface Props {
  searchParams: {
    source?: string
    table?: string
    action?: string
    actor?: string
    limit?: string
  }
}

/**
 * /admin/audit — recent admin-side writes from every code path.
 *
 * Filters by source (admin-ui / admin-bulk-intake / cowork-artifact / sheet-sync),
 * table_name (orders / invoices / proofs / venues), action (INSERT / UPDATE / DELETE),
 * and actor email. Drill into a row's JSON diff inline.
 */
export default async function AuditLogPage({ searchParams }: Props) {
  await requireAdmin()

  const filters: AuditFilters = {
    source: searchParams.source || undefined,
    table: searchParams.table || undefined,
    action: (searchParams.action as 'INSERT' | 'UPDATE' | 'DELETE') || undefined,
    actor: searchParams.actor || undefined,
    limit: searchParams.limit ? Number(searchParams.limit) : 200
  }

  const [entries, sources] = await Promise.all([
    listAuditEntries(filters),
    auditDistinctSources()
  ])

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-sm text-muted">
          Every admin-side write (production <code>/admin</code>, Cowork artifact, scheduled
          jobs, sheet sync). Use the <code>source</code> column to tell them apart.
        </p>
      </header>

      <form className="bg-surface border border-border rounded-xl p-4 flex flex-wrap gap-3 items-end" method="get">
        <label className="text-xs space-y-1">
          <span className="block">Source</span>
          <select name="source" defaultValue={filters.source ?? ''} className="text-sm px-3 py-1.5 rounded-md border border-border bg-bg">
            <option value="">All</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="block">Table</span>
          <select name="table" defaultValue={filters.table ?? ''} className="text-sm px-3 py-1.5 rounded-md border border-border bg-bg">
            <option value="">All</option>
            <option value="orders">orders</option>
            <option value="invoices">invoices</option>
            <option value="proofs">proofs</option>
            <option value="venues">venues</option>
            <option value="clients">clients</option>
            <option value="offices">offices</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="block">Action</span>
          <select name="action" defaultValue={filters.action ?? ''} className="text-sm px-3 py-1.5 rounded-md border border-border bg-bg">
            <option value="">All</option>
            <option>INSERT</option>
            <option>UPDATE</option>
            <option>DELETE</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="block">Actor email</span>
          <input name="actor" defaultValue={filters.actor ?? ''} placeholder="cam@…" className="text-sm px-3 py-1.5 rounded-md border border-border bg-bg" />
        </label>
        <label className="text-xs space-y-1">
          <span className="block">Limit</span>
          <input name="limit" type="number" defaultValue={filters.limit} className="text-sm px-3 py-1.5 rounded-md border border-border bg-bg w-24" />
        </label>
        <button type="submit" className="text-sm font-medium px-4 py-1.5 rounded-md bg-fg text-bg">Filter</button>
        <a href="/admin/audit" className="text-sm text-muted underline">reset</a>
      </form>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted bg-bg/40">
            <tr>
              <th className="text-left px-3 py-2">At</th>
              <th className="text-left px-3 py-2">Source</th>
              <th className="text-left px-3 py-2">Table</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Actor</th>
              <th className="text-left px-3 py-2">Row</th>
              <th className="text-left px-3 py-2">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={7} className="text-center text-muted py-6">No audit entries match.</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border align-top">
                <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(e.at).toLocaleString()}</td>
                <td className="px-3 py-2"><code className="text-xs">{e.source}</code></td>
                <td className="px-3 py-2"><code className="text-xs">{e.table_name}</code></td>
                <td className="px-3 py-2"><span className={`text-xs font-semibold ${e.action === 'DELETE' ? 'text-danger' : e.action === 'INSERT' ? 'text-success' : ''}`}>{e.action}</span></td>
                <td className="px-3 py-2 text-xs">{e.actor_email ?? '—'}</td>
                <td className="px-3 py-2"><code className="text-xs">{e.row_id?.slice(0, 8) ?? '—'}…</code></td>
                <td className="px-3 py-2">
                  {(e.before_data || e.after_data) ? (
                    <details>
                      <summary className="cursor-pointer text-xs text-muted">show diff</summary>
                      <pre className="text-xs mt-1 bg-bg p-2 rounded border border-border overflow-x-auto max-w-xl whitespace-pre-wrap">
{JSON.stringify({ before: e.before_data, after: e.after_data }, null, 2)}
                      </pre>
                    </details>
                  ) : <span className="text-xs text-muted">—</span>}
       