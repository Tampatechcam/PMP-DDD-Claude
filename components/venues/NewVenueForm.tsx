'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createVenue } from '@/lib/actions/venues'

const CLASS_TYPES = ['R101', 'W101', 'SS101', 'WAT', 'R90', 'Taxes']

export function NewVenueForm() {
  const ref = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await createVenue(fd)
        ref.current?.reset()
      }}
      className="space-y-3"
    >
      <Input name="name" label="Venue name" required placeholder="University of Saint Mary" />
      <Input name="notes" label="Notes (optional)" />

      <fieldset>
        <legend className="block text-xs font-medium text-ink mb-1">
          Applicable class types
        </legend>
        <div className="flex flex-wrap gap-3">
          {CLASS_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="applicable_class_types" value={t} />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Add address (optional)</summary>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-6 gap-2">
          <div className="sm:col-span-4">
            <Input name="address_street" label="Street" />
          </div>
          <div className="sm:col-span-3">
            <Input name="address_city" label="City" />
          </div>
          <div className="sm:col-span-1">
            <Input name="address_state" label="State" maxLength={2} />
          </div>
          <div className="sm:col-span-2">
            <Input name="address_zip" label="Zip" />
          </div>
        </div>
      </details>

      <Button type="submit">Add venue</Button>
    </form>
  )
}
