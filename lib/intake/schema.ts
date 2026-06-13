import { z } from 'zod'

/**
 * Standard intake CSV row schema.
 *
 * Every client uses the same template (download from /templates/standard-intake.csv).
 * Required fields enforce a clean shape; optionals fall back to client defaults
 * pulled from the `clients` row at INSERT time.
 *
 * Dates are ISO YYYY-MM-DD. Times are 24h HH:MM. Mailing quantity must be a positive int.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const time24 = z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM')

export const intakeRowSchema = z.object({
  client_name: z.string().min(1, 'client_name is required'),
  office_name: z.string().optional().default(''),
  advisor_name: z.string().min(1, 'advisor_name is required'),
  class_type: z.string().min(1, 'class_type is required'),
  mailing_quantity: z.coerce.number().int().positive('mailing_quantity must be > 0'),
  event_1_date: isoDate,
  event_2_date: isoDate.optional().or(z.literal('')),
  first_class_day: isoDate.optional().or(z.literal('')),
  order_sent_deadline: isoDate.optional().or(z.literal('')),
  start_time: time24.optional().or(z.literal('')),
  end_time: time24.optional().or(z.literal('')),
  venue_text: z.string().min(1, 'venue_text is required'),
  venue_address_text: z.string().min(1, 'venue_address_text is required'),
  event_1_room: z.string().optional().default(''),
  order_instructions: z.string().optional().default('')
})

export type IntakeRow = z.infer<typeof intakeRowSchema>

/** The exact column order clients should use in their CSV. */
export const INTAKE_COLUMNS = [
  'client_name', 'office_name', 'advisor_name', 'class_type', 'mailing_quantity',
  'event_1_date', 'event_2_date', 'first_class_day', 'order_sent_deadline',
  'start_time', 'end_time', 'venue_text', 'venue_address_text', 'event_1_room',
  'order_instructions'
] as const

/** Per-row validation result for the preview screen. */
export type ValidatedRow =
  | { ok: true; line: number; row: IntakeRow }
  | { ok: false; line: number; er