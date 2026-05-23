import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function listVenuesForCurrentClient() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('venues')
    .select('id, name, address, applicable_class_types, buildings ( id, name, rooms ( id, name, capacity ) )')
    .order('name')
  if (error) throw error
  return data
}
