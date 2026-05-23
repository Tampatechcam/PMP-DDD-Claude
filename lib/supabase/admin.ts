import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * NEVER import this file from a Client Component, a public Route Handler
 * without explicit auth checks, or anywhere the result could leak to the
 * browser. The `import 'server-only'` above will fail the build if it ends
 * up in a client bundle.
 *
 * Used by: admin-only Server Actions, the one-shot import script, RLS tests.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
