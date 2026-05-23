'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createBuilding } from '@/lib/actions/venues'

export function NewBuildingForm({ venueId }: { venueId: string }) {
  const ref = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await createBuilding(fd)
        ref.current?.reset()
      }}
      className="flex items-end gap-2"
    >
      <input type="hidden" name="venue_id" value={venueId} />
      <div className="flex-1">
        <Input name="name" label="New building" required placeholder="e.g. Johnson County Campus" />
      </div>
      <Button type="submit" variant="secondary">Add building</Button>
    </form>
  )
}
