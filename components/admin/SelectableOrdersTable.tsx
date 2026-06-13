'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusPill } from '@/components/orders/StatusPill'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatEventDate, formatRelativeDate, orderHref, orderLabel } from '@/lib/utils/format'
import { bulkDeleteOrders } from '@/lib/actions/orders'
import type { OrderRow } from '@/lib/db/orders'

/**
 * Admin orders table with row checkboxes + a bulk-delete toolbar. Same columns
 * as the read-only OrdersList table, plus selection. Orders with an invoice are
 * skipped server-side (billing records survive) and reported back.
 */
export function SelectableOrdersTable({
  orders,
  showClient,
  clientNameById,
  isPast,
  ordersBasePath,
}: {
  orders: OrderRow[]
  showClient?: boolean
  clientNameById?: Record<string, string>
  isPast: boolean
  ordersBasePath?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, setPending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const allRef = useRef<HTMLInputElement>(null)

  const allChecked = orders.length > 0 && selected.size === orders.length
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = selected.size > 0 && !allChecked
  }, [selected, allChecked])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(orders.map((o) => o.id)))
  }

  async function onConfirm() {
    setPending(true)
    setMsg(null)
    try {
      const form = new FormData()
      form.set('order_ids', [...selected].join(','))
      const res = await bulkDeleteOrders(form)
      setSelected(new Set())
      setMsg(
        `Deleted ${res.deleted} order${res.deleted === 1 ? '' : 's'}` +
          (res.skipped ? ` · skipped ${res.skipped} with an invoice` : '')
      )
      router.refresh()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Bulk delete failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between min-h-[2rem]">
        <p className="text-sm text-muted">
          {selected.size > 0 ? `${selected.size} selected` : 'Tick rows to bulk-delete'}
          {msg && <span className="ml-2 text-ink">· {msg}</span>}
        </p>
        {selected.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="danger" size="sm" disabled={pending}>
                Delete selected ({selected.size})
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selected.size} order{selected.size === 1 ? '' : 's'}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the selected orders and their proofs and event
                  history. Orders that have an invoice are skipped. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <Button type="button" variant="secondary" disabled={pending}>Cancel</Button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" variant="danger" loading={pending} disabled={pending}
                    onClick={(e) => { e.preventDefault(); onConfirm() }}>
                    Delete selected
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="border border-border rounded-lg bg-surface shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="label bg-bg/80 sticky top-0 z-10">
            <tr className="border-b border-border">
              <th className="w-8 px-3 py-2.5">
                <input ref={allRef} type="checkbox" checked={allChecked} onChange={toggleAll}
                  aria-label="Select all" className="align-middle accent-accent" />
              </th>
              <Th className="w-[7%]">Order</Th>
              {!isPast && <Th className="w-[16%]">Order Sent Deadline</Th>}
              <Th className="w-[12%]">First Event</Th>
              <Th className="w-[12%]">Second Event</Th>
              {showClient && <Th className="w-[10%]">Client</Th>}
              <Th className="w-[9%]">Advisor</Th>
              <Th>Venue</Th>
              <Th className="w-[11%]">Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((o) => {
              const checked = selected.has(o.id)
              return (
                <tr key={o.id} className={`transition-colors ${checked ? 'bg-accent/5' : 'hover:bg-bg'}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.id)}
                      aria-label={`Select order ${orderLabel(o)}`} className="align-middle accent-accent" />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link href={orderHref(o, ordersBasePath)} className="font-medium underline-offset-2 hover:underline">
                      {orderLabel(o)}
                    </Link>
                    {o.class_type && <span className="ml-2 align-middle"><Badge>{o.class_type}</Badge></span>}
                  </td>
                  {!isPast && (
                    <td className="px-3 py-2.5 tnum">
                      {o.order_sent_deadline ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Icon name="calendar" className="w-3.5 h-3.5 text-muted" />
                          {formatEventDate(o.order_sent_deadline)}
                          {formatRelativeDate(o.order_sent_deadline) && (
                            <span className="text-xs text-muted ml-1">{formatRelativeDate(o.order_sent_deadline)}</span>
                          )}
                        </span>
                      ) : <span className="italic text-muted/70">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-2.5 whitespace-nowrap tnum">
                    {o.event_1_date ? formatEventDate(o.event_1_date) : <span className="italic text-muted/70">pending</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted tnum">
                    {o.event_2_date ? formatEventDate(o.event_2_date) : <span className="italic text-muted/70">—</span>}
                  </td>
                  {showClient && (
                    <td className="px-3 py-2.5 truncate max-w-[14rem]">{clientNameById?.[o.client_id] ?? <span className="text-muted">—</span>}</td>
                  )}
                  <td className="px-3 py-2.5 truncate max-w-[10rem]">{o.advisor_name ?? <span className="text-muted">—</span>}</td>
                  <td className="px-3 py-2.5 max-w-[32rem]"><span className="line-clamp-2">{o.venue_text ?? o.market ?? <span className="text-muted italic">pending</span>}</span></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><StatusPill status={o.display_status} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={`text-left px-3 py-2.5 font-semibold whitespace-nowrap${className ? ` ${className}` : ''}`}>{children}</th>
}
