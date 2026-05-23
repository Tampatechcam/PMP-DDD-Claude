'use client'
import { Button } from '@/components/ui/Button'
import { deleteVenue } from '@/lib/actions/venues'

export function DeleteVenueButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteVenue}
      onSubmit={(e) => {
        if (!confirm(`Delete venue "${name}"? Buildings and rooms inside it will also be deleted.`)) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" className="text-danger">Delete</Button>
    </form>
  )
}
