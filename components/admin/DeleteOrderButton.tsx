'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteOrder } from '@/lib/actions/orders'

/**
 * Admin-only delete on the order detail page. Confirms first (deleting cascades
 * to proofs + events). Disabled when the order has an invoice — the action
 * refuses that too, but disabling avoids a dead-end click; void the invoice first.
 */
export function DeleteOrderButton({
  orderId,
  orderRef,
  hasInvoice,
}: {
  orderId: string
  orderRef: string
  hasInvoice: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (hasInvoice) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="text-muted"
        disabled
        title="This order has an invoice — void or remove it before deleting the order."
      >
        Delete
      </Button>
    )
  }

  async function onConfirm() {
    setPending(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('order_id', orderId)
      await deleteOrder(form) // redirects on success
    } catch (e) {
      setPending(false)
      setError(e instanceof Error ? e.message : 'Could not delete the order.')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-danger">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete order {orderRef}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes order {orderRef} and its proofs and event
            history. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-danger">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button type="button" variant="secondary" disabled={pending}>
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant="danger"
              loading={pending}
              disabled={pending}
              onClick={(e) => {
                e.preventDefault() // keep the dialog open until the action resolves/redirects
                onConfirm()
              }}
            >
              Delete order
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
