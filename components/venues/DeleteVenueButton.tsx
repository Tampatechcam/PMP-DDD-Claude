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
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { deleteVenue } from '@/lib/actions/venues'

export function DeleteVenueButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function onConfirm() {
    setPending(true)
    try {
      const form = new FormData()
      form.set('id', id)
      await deleteVenue(form)
      setOpen(false)
    } finally {
      setPending(false)
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
          <AlertDialogTitle>Delete venue?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete &ldquo;{name}&rdquo;? Buildings and rooms inside it will also be deleted.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
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
              onClick={onConfirm}
            >
              Delete venue
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
