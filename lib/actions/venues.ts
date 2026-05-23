'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Day 3 deliverable — see Part 15.
export async function createVenue(_form: FormData) {
  const supabase = createClient()
  void supabase
  revalidatePath('/venues')
  throw new Error('createVenue not implemented yet')
}
