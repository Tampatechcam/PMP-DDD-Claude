'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentClientIdOrThrow } from '@/lib/db/profiles'

/**
 * Venue / building / room mutations.
 *
 * RLS does the auth check; we still fetch client_id explicitly because the
 * insert needs to satisfy the with-check (client_id = current_client_id()).
 * For buildings + rooms, RLS walks up to the venue and we don't need to
 * pass client_id at all.
 */

function asArray(values: FormDataEntryValue[]): string[] | null {
  const cleaned = values.map((v) => String(v).trim()).filter(Boolean)
  return cleaned.length > 0 ? cleaned : null
}

function asJsonAddress(form: FormData): object | null {
  const street = String(form.get('address_street') ?? '').trim()
  const city = String(form.get('address_city') ?? '').trim()
  const state = String(form.get('address_state') ?? '').trim()
  const zip = String(form.get('address_zip') ?? '').trim()
  if (!street && !city && !state && !zip) return null
  return { street, city, state, zip }
}

export async function createVenue(form: FormData) {
  const name = String(form.get('name') ?? '').trim()
  if (!name) return // HTML required attribute should have caught this

  const client_id = await getCurrentClientIdOrThrow()

  const supabase = createClient()
  const { error } = await supabase.from('venues').insert({
    client_id,
    name,
    notes: String(form.get('notes') ?? '') || null,
    applicable_class_types: asArray(form.getAll('applicable_class_types')),
    address: asJsonAddress(form)
  })
  if (error) throw error

  revalidatePath('/venues')
}

export async function createBuilding(form: FormData) {
  const venue_id = String(form.get('venue_id') ?? '')
  const name = String(form.get('name') ?? '').trim()
  if (!venue_id || !name) return

  const supabase = createClient()
  const { error } = await supabase
    .from('buildings')
    .insert({ venue_id, name })
  if (error) throw error

  revalidatePath('/venues')
}

export async function createRoom(form: FormData) {
  const building_id = String(form.get('building_id') ?? '')
  const name = String(form.get('name') ?? '').trim()
  const capacityRaw = String(form.get('capacity') ?? '').trim()
  const capacity = capacityRaw ? Number(capacityRaw) : null
  if (!building_id || !name) return
  if (capacity !== null && (!Number.isFinite(capacity) || capacity < 0)) return

  const supabase = createClient()
  const { error } = await supabase
    .from('rooms')
    .insert({ building_id, name, capacity })
  if (error) throw error

  revalidatePath('/venues')
}

export async function deleteVenue(form: FormData) {
  const id = String(form.get('id') ?? '')
  if (!id) return
  const supabase = createClient()
  // FK cascades drop buildings + rooms with the venue.
  const { error } = await supabase.from('venues').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/venues')
}
