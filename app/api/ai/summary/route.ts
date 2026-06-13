import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthUser } from '@/lib/db/auth'
import { adminListOrders } from '@/lib/db/orders'

/**
 * POST /api/ai/summary
 *
 * Server-side AI ops summary, equivalent to the Cowork artifact's
 * `window.cowork.askClaude` calls — but available to any admin in
 * the production app, not just one user in Cowork.
 *
 * Body: { kind: 'upcoming' | 'deadlines' | 'revenue' }
 *
 * Returns: { summary: string }
 *
 * Requires ANTHROPIC_API_KEY in env.
 */

const KINDS = ['upcoming', 'deadlines', 'revenue'] as const
type Kind = (typeof KINDS)[number]

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin sign-in required.' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured.' }, { status: 500 })
  }

  let body: { kind?: string } = {}
  try { body = await req.json() } catch {}
  const kind = (body.kind as Kind) ?? 'upcoming'
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: `kind must be one of ${KINDS.join(', ')}` }, { status: 400 })
  }

  // Pull the data Claude needs to reason about.
  const orders = await adminListOrders({ limit: 500 })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const inDays = (iso: string | null) => {
    if (!iso) return Infinity
    const d = new Date(iso); d.setHours(0, 0, 0, 0)
    return Math.round((d.getTime() - today.getTime()) / 86400000)
  }

  let prompt = ''
  let payload: unknown = null

  if (kind === 'upcoming') {
    const upcoming = orders.filter((o) => o.needs_direct_mail && o.event_1_date && inDays(o.event_1_date) >= 0 && inDays(o.event_1_date) <= 28)
    payload = upcoming.slice(0, 80).map((o) => ({
      ref: o.display_ref ?? `#${o.order_number}`,
      advisor: o.advisor_name,
      event: o.event_1_date,
      due: o.order_sent_deadline,
      status: o.display_status,
      qty: o.mailing_quantity
    }))
    prompt = 'You are PMP\'s ops manager. Looking at the next 4 weeks of upcoming events. Write 5-8 sentences in plain prose: what\'s hot, what\'s blocking shipment, which orders risk missing the order-sent deadline, any patterns by advisor or class. No bullets, no markdown.'
  } else if (kind === 'deadlines') {
    const tight = orders.filter((o) => o.needs_direct_mail && o.order_sent_deadline && inDays(o.order_sent_deadline) >= 0 && inDays(o.order_sent_deadline) <= 7 && !/order sent|complete/i.test(o.dm_status ?? ''))
    payload = tight.map((o) => ({
      ref: o.display_ref ?? `#${o.order_number}`,
      advisor: o.advisor_name,
      due: o.order_sent_deadline,
      status: o.display_status
    }))
    prompt = 'Write short one-line Slack pings (under 25 words each) nudging the team about each order\'s order-sent deadline. Format: "REF — message". No greetings, no emojis.'
  } else {
    return NextResponse.json({ error: 'revenue kind not implemented yet' }, { status: 501 })
  }

  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ summary: 'Nothing to report — queue is clean.' })
  }

  const client = new Anthropic({ apiKey })
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        { role: 'user', content: `${prompt}\n\nData:\n${JSON.stringify(payload, null, 2)}` }
      ]
    })
    const block = msg.content[0]
    const text = block && block.type === 'text' ? block.text : ''
    return NextResponse.json({ summary: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    re