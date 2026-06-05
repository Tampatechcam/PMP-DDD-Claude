import type Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getInvoiceByStripeId } from '@/lib/db/invoices'

// Stripe needs the raw request body to verify the signature, and the SDK is
// Node-only — keep this off the Edge runtime.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Stripe webhook. Payment status is owned here, not by the admin UI: when a
 * client pays the hosted invoice, `invoice.paid` flips the mirrored row to
 * Paid. Verified with STRIPE_WEBHOOK_SECRET; updates run as service-role
 * (no user cookie on this public route).
 *
 * Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET is not set.')
    return NextResponse.json({ error: 'not configured' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'no signature' }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  try {
    await handleEvent(event)
  } catch (err) {
    console.error(`[stripe webhook] handler error for ${event.type}:`, err)
    return NextResponse.json({ error: 'handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.finalized':
    case 'invoice.voided':
    case 'invoice.marked_uncollectible': {
      const inv = event.data.object as Stripe.Invoice
      await syncInvoice(inv, event.type)
      break
    }
    default:
      // Ignore unrelated events.
      break
  }
}

const STATUS_FOR_EVENT: Record<string, string> = {
  'invoice.paid': 'Paid',
  'invoice.payment_failed': 'Payment failed',
  'invoice.finalized': 'Sent',
  'invoice.voided': 'Void',
  'invoice.marked_uncollectible': 'Uncollectible',
}

/**
 * Total tax in cents, tolerant of the destination's API version: newer
 * versions serialize tax under `total_taxes[]`, older ones under `tax`.
 */
function taxCents(inv: Stripe.Invoice): number {
  const fromArray = (inv.total_taxes ?? []).reduce((s, t) => s + (t.amount ?? 0), 0)
  if (fromArray) return fromArray
  const legacy = (inv as unknown as { tax?: number | null }).tax
  return legacy ?? 0
}

async function syncInvoice(inv: Stripe.Invoice, eventType: string) {
  if (!inv.id) return
  const row = await getInvoiceByStripeId(inv.id)
  if (!row) {
    // Not one of ours (or generated against a different env) — ignore quietly.
    return
  }

  const patch: Record<string, unknown> = {
    status: STATUS_FOR_EVENT[eventType] ?? inv.status ?? 'Sent',
    stripe_status: inv.status,
    hosted_invoice_url: inv.hosted_invoice_url,
    invoice_pdf_url: inv.invoice_pdf,
    total_invoice: inv.total / 100,
    fl_state_tax: taxCents(inv) / 100 || undefined,
  }
  if (eventType === 'invoice.paid') {
    // status_transitions.paid_at is a unix seconds timestamp.
    const paidAt = inv.status_transitions?.paid_at
    patch.invoice_paid_date = paidAt
      ? new Date(paidAt * 1000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  }

  const { error } = await supabaseAdmin
    .from('invoices')
    .update(patch)
    .eq('id', row.id)
  if (error) throw error

  await supabaseAdmin.from('order_events').insert({
    order_id: row.order_id,
    event: `Invoice ${STATUS_FOR_EVENT[eventType]?.toLowerCase() ?? eventType}`,
    payload: { stripe_invoice_id: inv.id, stripe_status: inv.status },
  })
}
