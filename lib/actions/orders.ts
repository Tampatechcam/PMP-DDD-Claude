'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Server Actions for orders.
 *
 * Day 5 deliverable. Stub for now so route imports compile during scaffolding.
 * Real implementation: validate input, fetch defaults from office/client,
 * insert into orders, append an order_events row.
 */
export async function createOrder(_form: FormData) {
  const supabase = createClient()
  // TODO Day 5 — see Part 7 of the implementation plan.
  void supabase
  revalidatePath('/orders')
  throw new Error('createOrder not implemented yet')
}
