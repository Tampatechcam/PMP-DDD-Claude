'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/db/auth'
import { adminGetInvoiceForOrder } from '@/lib/db/invoices'
import { getStripe, flTaxRateId } from '@/lib/stripe/server'
import { computeInvoiceLineItems, toCents } from '@/lib/invoices/compute'

/** Total tax in cents. Stripe v22 moved tax from `invoice.tax` to `total_taxes[]`. */
function invoiceTaxCents(inv: Stripe.Invoice): number {
  return (inv.total_taxes ?? []).reduce((sum, t) => sum + (t.amount ?? 0), 0)
}

function s(form: FormData, name: string): string | null {
  const v = form.get(name)
  if (v == null) return null
  const t = String(v).trim()
  return t ? t : null
}
function num(form: FormData, name: string): number | null {
  const v = s(form, name)
  if (v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Generate a Stripe invoice for an order and mirror it locally.
 *
 * We compute the line-item amounts (so we keep a breakdown + show a preview),
 * push them to Stripe, let Stripe own the tax + grand total (FL TaxRate on the
 * DM line), then FINALIZE without sending — Stripe issues a hosted payment URL
 * + PDF but emails nobody (portal-only delivery, ADR 0008). The webhook flips
 * the row to Paid when the client pays.
 */
export async function generateInvoice(form: FormData) {
  await requireAdmin()
  const supabase = createClient()

  const orderId = s(form, 'order_id')
  if (!orderId) throw new Error('order_id is required.')

  // One invoice per order — if one exists, send the admin to it.
  const existing = await adminGetInvoiceForOrder(orderId)
  if (existing) redirect(`/admin/invoices/${existing.id}`)

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(
      'id, order_number, display_ref, client_id, office_id, needs_direct_mail, mailing_quantity, class_type, offices ( state )'
    )
    .eq('id', orderId)
    .maybeSingle()
  if (orderErr) throw orderErr
  if (!order) throw new Error('Order not found.')

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, stripe_customer_id, default_mailer_rate, billing_email')
    .eq('id', order.client_id)
    .maybeSingle()
  if (clientErr) throw clientErr
  if (!client) throw new Error('Client not found.')

  // Stripe requires a customer email for send_invoice invoices. Take it from
  // the form (pre-filled from the client when known) and remember it.
  const billingEmail = s(form, 'billing_email') ?? client.billing_email
  if (!billingEmail) {
    throw new Error(
      'A billing email is required to generate an invoice — Stripe needs one. Add it on the form.'
    )
  }

  const officeRel = order.offices as { state: string | null } | { state: string | null }[] | null
  const officeState = Array.isArray(officeRel)
    ? officeRel[0]?.state ?? null
    : officeRel?.state ?? null

  // Admin can override the rate; default to the client's standard rate.
  const dmRate = num(form, 'invoiced_dm_rate') ?? client.default_mailer_rate
  const calc = computeInvoiceLineItems({
    dmRate,
    mailingQuantity: order.mailing_quantity,
    needsDirectMail: order.needs_direct_mail,
    digital: num(form, 'invoiced_digital'),
    tech: num(form, 'invoiced_tech'),
    officeState,
  })

  const stripe = getStripe()
  const taxRate = flTaxRateId()
  if (calc.flTaxable && !taxRate) {
    console.warn(
      '[invoices] FL order but STRIPE_FL_TAX_RATE_ID is unset — invoice will have NO tax. Run scripts/stripe-setup.ts.'
    )
  }

  // 1. Ensure a Stripe Customer for this client (lazy create). Keep its email
  //    in sync with the billing email and persist the email for reuse.
  let customerId = client.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: client.name,
      email: billingEmail,
      metadata: { client_id: client.id },
    })
    customerId = customer.id
    const { error: updErr } = await supabase
      .from('clients')
      .update({ stripe_customer_id: customerId, billing_email: billingEmail })
      .eq('id', client.id)
    if (updErr) throw updErr
  } else {
    await stripe.customers.update(customerId, { email: billingEmail })
    if (billingEmail !== client.billing_email) {
      await supabase
        .from('clients')
        .update({ billing_email: billingEmail })
        .eq('id', client.id)
    }
  }

  const orderRef = order.display_ref ?? `#${order.order_number}`

  // 2. Create the pending invoice items. Skip zero lines. FL tax rides on the
  //    DM line only.
  const items: Stripe.InvoiceItemCreateParams[] = []
  if (calc.dmTotal > 0) {
    items.push({
      customer: customerId,
      amount: toCents(calc.dmTotal),
      currency: 'usd',
      description: `Direct mail — order ${orderRef}${
        order.mailing_quantity ? ` (${order.mailing_quantity} pcs @ $${dmRate})` : ''
      }`,
      ...(calc.flTaxable && taxRate ? { tax_rates: [taxRate] } : {}),
    })
  }
  if (calc.digital > 0) {
    items.push({
      customer: customerId,
      amount: toCents(calc.digital),
      currency: 'usd',
      description: `Digital advertising — order ${orderRef}`,
    })
  }
  if (calc.tech > 0) {
    items.push({
      customer: customerId,
      amount: toCents(calc.tech),
      currency: 'usd',
      description: `Tech / sequences — order ${orderRef}`,
    })
  }
  if (calc.ccProcessing > 0) {
    items.push({
      customer: customerId,
      amount: toCents(calc.ccProcessing),
      currency: 'usd',
      description: 'Card processing fee (3%)',
    })
  }
  if (items.length === 0) {
    throw new Error('Nothing to invoice — all line items are $0.')
  }
  for (const item of items) {
    await stripe.invoiceItems.create(item)
  }

  // 3. Create + finalize (no send → no email).
  const created = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: 30,
    pending_invoice_items_behavior: 'include',
    description: `Power Mailers Plus — order ${orderRef}`,
    metadata: { order_id: order.id, order_ref: orderRef },
  })
  const finalized = await stripe.invoices.finalizeInvoice(created.id)

  // 4. Mirror locally. Stripe owns the final tax + total.
  const { data: inserted, error: insErr } = await supabase
    .from('invoices')
    .insert({
      order_id: order.id,
      status: 'Sent',
      invoice_sent_date: new Date().toISOString().slice(0, 10),
      invoiced_dm_rate: dmRate,
      invoiced_dm_total: calc.dmTotal || null,
      invoiced_digital: calc.digital || null,
      invoiced_tech: calc.tech || null,
      cc_processing: calc.ccProcessing || null,
      fl_state_tax: invoiceTaxCents(finalized) / 100 || null,
      total_invoice: finalized.total / 100,
      stripe_invoice_id: finalized.id,
      hosted_invoice_url: finalized.hosted_invoice_url,
      invoice_pdf_url: finalized.invoice_pdf,
      stripe_status: finalized.status,
    })
    .select('id')
    .single()
  if (insErr) throw insErr

  await supabase.from('order_events').insert({
    order_id: order.id,
    event: 'Invoice generated',
    payload: {
      stripe_invoice_id: finalized.id,
      total: finalized.total / 100,
      taxed: calc.flTaxable,
    },
  })

  revalidatePath('/admin/invoices')
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${order.display_ref ?? order.order_number}`)
  redirect(`/admin/invoices/${inserted.id}`)
}

/**
 * Void an open invoice in Stripe and locally. Admin-only. A paid invoice
 * cannot be voided (Stripe rejects it) — surface the error.
 */
export async function voidInvoice(form: FormData) {
  await requireAdmin()
  const supabase = createClient()

  const id = s(form, 'invoice_id')
  const stripeInvoiceId = s(form, 'stripe_invoice_id')
  if (!id || !stripeInvoiceId) throw new Error('invoice_id + stripe_invoice_id required.')

  const stripe = getStripe()
  const voided = await stripe.invoices.voidInvoice(stripeInvoiceId)

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'Void', stripe_status: voided.status })
    .eq('id', id)
  if (error) throw error

  revalidatePath('/admin/invoices')
  revalidatePath(`/admin/invoices/${id}`)
}
