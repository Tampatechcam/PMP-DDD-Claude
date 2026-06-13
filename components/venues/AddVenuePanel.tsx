'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'

const NewVenueForm = dynamic(
  () => import('./NewVenueForm').then((m) => ({ default: m.NewVenueForm })),
  {
    loading: () => (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    )
  }
)

/**
 * Collapsible "Add a venue" panel. The form bundle loads only after the
 * user opens the details element, keeping /venues lean on first paint.
 */
export function AddVenuePanel() {
  const [open, setOpen] = useState(false)

  return (
    <details
      className="bg-surface border border-border rounded-lg"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex items-center gap-2 cursor-pointer px-4 py-3 hover:bg-bg list-none [&::-webkit-details-marker]:hidden">
        <Icon name="plus" className="w-4 h-4 text-muted" />
        <span className="text-sm font-medium">Add a venue</span>
      </summary>
      <div className="border-t border-border p-4">
        {open ? <NewVenueForm /> : null}
      </div>
    </details>
  )
}
