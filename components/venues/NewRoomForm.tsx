'use client'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createRoom } from '@/lib/actions/venues'

export function NewRoomForm({ buildingId }: { buildingId: string }) {
  const ref = useRef<HTMLFormElement>(null)
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await createRoom(fd)
        ref.current?.reset()
      }}
      className="flex items-end gap-2"
    >
      <input type="hidden" name="building_id" value={buildingId} />
      <div className="flex-1">
        <Input name="name" label="New room" required placeholder="e.g. Room 101" />
      </div>
      <div className="w-24">
        <Input name="capacity" label="Capacity" type="number" min={0} step={1} />
      </div>
      <Button type="submit" variant="secondary">Add room</Button>
    </form>
  )
}
