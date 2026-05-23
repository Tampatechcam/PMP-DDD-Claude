import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function listOfficesForCurrentClient() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('offices')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}
