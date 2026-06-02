'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Live data, the simple way: subscribe to Supabase Realtime and re-run the
 * server render (`router.refresh()`) whenever a watched table changes. The
 * Server Components re-fetch through `lib/db` + the RLS'd view, so the UI
 * updates with correct, tenant-scoped, view-computed data — no client-side
 * query/status logic to keep in sync.
 *
 * Drop it into any Server Component page; it renders nothing.
 *
 *   <LiveRefresh />                       // watch orders + proofs (default)
 *   <LiveRefresh tables={['orders']} />   // narrow the tables
 *   <LiveRefresh filter="order_id=eq.123" /> // narrow events (on top of RLS)
 *
 * RLS still gates Realtime: a session only receives events for rows it can
 * SELECT, so this is safe in the multi-tenant client portal as-is.
 */

let channelSeq = 0

interface Props {
  /** Tables to watch in the `public` schema. Defaults to orders + proofs. */
  tables?: string[]
  /** Optional postgres_changes filter, e.g. `client_id=eq.<uuid>`. */
  filter?: string
  /** Debounce window (ms) so a burst of changes coalesces into one refresh. */
  debounceMs?: number
}

export function LiveRefresh({
  tables = ['orders', 'proofs'],
  filter,
  debounceMs = 400
}: Props) {
  const router = useRouter()
  // Stable primitive dep so the effect doesn't re-subscribe on every render.
  const tablesKey = tables.join(',')

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`live-refresh-${++channelSeq}`)

    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => router.refresh(), debounceMs)
    }

    for (const table of tablesKey.split(',')) {
      channel.on(
        'postgres_changes',
        // event '*' = INSERT | UPDATE | DELETE
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        scheduleRefresh
      )
    }
    channel.subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [router, tablesKey, filter, debounceMs])

  return null
}
