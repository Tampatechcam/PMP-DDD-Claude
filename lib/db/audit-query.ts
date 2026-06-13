import { createClient as createAdminClient } from '@/lib/supabase/admin'

/**
 * Read recent audit log entries. Admin-only — uses service-role so audit
 * rows are visible regardless of caller RLS.
 */

export interface AuditEntry {
  id: string
  table_name: string
  row_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  source: string
  actor_email: string | null
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  at: string
}

export interface AuditFilters {
  source?: string
  table?: string
  action?: 'INSERT' | 'UPDATE' | 'DELETE'
  actor?: string
  limit?: number
}

export async function listAuditEntries(filters: AuditFilters = {}): Promise<AuditEntry[]> {
  const supabase = createAdminClient()
  let q = supabase
    .from('audit_log')
    .select('*')
    .order('at', { ascending: false })
    .limit(filters.limit ?? 200)
  if (filters.source) q = q.eq('source', filters.source)
  if (filters.table) q = q.eq('table_name', filters.table)
  if (filters.action) q = q.eq('action', filters.action)
  if (filters.actor) q = q.ilike('actor_email', `%${filters.actor}%`)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as AuditEntry[]
}

export async function auditDistinctSources(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('audit_log')
    .select('source')
    .limit(1000)
  if (error) return []
  return Array.from(new Set((data