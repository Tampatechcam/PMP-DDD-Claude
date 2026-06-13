import { createClient as createAdminClient } from '@/lib/supabase/admin'

/**
 * Record an admin-side write to public.audit_log.
 *
 * Use a service-role client (admin.ts) so the insert always succeeds regardless
 * of the calling user's RLS scope. The actor_email is captured from the supabase
 * session by the caller and passed in — we don't trust the request body for it.
 */

export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface AuditEvent {
  table_name: string
  row_id: string | null
  action: AuditAction
  source: string                  // e.g. 'admin-intake', 'order-edit', 'cowork-artifact'
  actor_email: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
}

export async function recordAudit(ev: AuditEvent | AuditEvent[]): Promise<void> {
  const events = Array.isArray(ev) ? ev : [ev]
  if (!events.length) return
  const supabase = createAdminClient()
  const rows = events.map((e) => ({
    table_name: e.table_name,
    row_id: e.row_id,
    action: e.action,
    source: e.source,
    actor_email: e.actor_email,
    before_data: e.before ?? null,
    after_data: e.after ?? null
  }))
  const { error } = await supabase.from('audit_log').insert(rows)
  if (error) {
    // Never block the caller on audit failure — just log it server-side.
    console.error('[audit] failed to record', { error: error.message, count: rows.length })
  }
}
