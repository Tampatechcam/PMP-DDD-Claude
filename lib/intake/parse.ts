import { intakeRowSchema, INTAKE_COLUMNS, type ValidatedRow } from './schema'

/**
 * Parse a CSV string into rows of objects keyed by the standard column names.
 *
 * Handles quoted fields, embedded commas, doubled-quote escapes, and CRLF endings.
 * Rejects up front if the header doesn't match the standard template.
 */
export function parseIntakeCsv(text: string): { headers: string[]; rows: Record<string, string>[]; error?: string } {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { cur.push(field); field = '' }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++
        cur.push(field); rows.push(cur); cur = []; field = ''
      } else field += c
    }
  }
  if (field || cur.length) { cur.push(field); rows.push(cur) }
  while (rows.length && rows[rows.length - 1].every((c) => !c?.trim())) rows.pop()

  if (rows.length < 2) return { headers: [], rows: [], error: 'CSV needs a header row and at least one data row.' }

  const headers = rows[0].map((h) => h.trim())
  const missing = INTAKE_COLUMNS.filter((c) => !headers.includes(c))
  if (missing.length) return { headers, rows: [], error: `Missing required columns: ${missing.join(', ')}. Download the template from /templates/standard-intake.csv.` }

  const dataRows = rows.slice(1).map((r) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim() })
    return obj
  })
  return { headers, rows: dataRows }
}

/** Validate each row against the schema. Returns the per-row result; never throws. */
export function validateIntakeRows(rawRows: Record<string, string>[]): ValidatedRow[] {
  return rawRows.map((raw, i) => {
    const parsed = intakeRowSchema.safeParse(raw)
    if (parsed.success) return { ok: true, line: i + 2, row: parsed.data }
    const errors = parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
    ret