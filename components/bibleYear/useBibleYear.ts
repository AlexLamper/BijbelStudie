'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  BibleYearMutationResponse,
  BibleYearStartBody,
  BibleYearStateResponse,
} from '../../lib/bibleYear/types'
import {
  fetchBibleYearState,
  markBibleYear,
  patchBibleYear,
  startBibleYear,
  startOrRestartBibleYear,
  type BibleYearResult,
} from '../../lib/bibleYear/client'
import { applyRefMark } from '../../lib/bibleYear/display'

export type BibleYearLoadStatus = 'loading' | 'ready' | 'signedOut' | 'error'

export type UseBibleYear = {
  status: BibleYearLoadStatus
  data: BibleYearStateResponse | null
  /** A mutation is in flight. */
  pending: boolean
  /** The last failed load or mutation, in Dutch. */
  error: string | null
  refresh: () => Promise<void>
  markRefs: (refs: { code: string; chapter: number }[], read: boolean) => Promise<boolean>
  markDay: (day: number, read: boolean) => Promise<boolean>
  shift: () => Promise<boolean>
  stop: () => Promise<boolean>
  /** POST; on 409 the state is reloaded so the running plan shows. */
  start: (body: BibleYearStartBody) => Promise<boolean>
  /** POST, falling back to PATCH restart - only for an explicit "Opnieuw beginnen". */
  restart: (body: BibleYearStartBody) => Promise<boolean>
}

/**
 * The state behind every "Bijbel in een jaar" screen on the web: one GET, then
 * each mutation replaces `enrollment` and `today` with the server's answer.
 * Ticking a chapter is optimistic so the box answers the tap at once.
 *
 * Pass `initial` to skip the first fetch (a server component that already
 * has the state), or `enabled: false` to hold off, e.g. for a guest.
 */
export function useBibleYear(
  options: { initial?: BibleYearStateResponse | null; enabled?: boolean } = {},
): UseBibleYear {
  const { initial = null, enabled = true } = options
  const [data, setData] = useState<BibleYearStateResponse | null>(initial)
  const [status, setStatus] = useState<BibleYearLoadStatus>(initial ? 'ready' : 'loading')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  // Mutations run one after another (a serial queue), so the server sees rapid
  // ticks in the order they were made. Only the newest mutation's answer is
  // applied: it already reflects every earlier one, and an older answer would
  // undo the optimistic ticks made after it. `inflight` keeps `pending` true
  // until the last one lands.
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const seq = useRef(0)
  const inflight = useRef(0)
  const reloadAfterQueue = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const begin = useCallback(() => {
    inflight.current += 1
    setPending(true)
    setError(null)
  }, [])

  const end = useCallback(() => {
    inflight.current = Math.max(0, inflight.current - 1)
    if (mounted.current && inflight.current === 0) setPending(false)
  }, [])

  const refresh = useCallback(async () => {
    const result = await fetchBibleYearState()
    if (!mounted.current) return
    if (result.ok) {
      setData(result.data)
      setStatus('ready')
      setError(null)
    } else if (result.kind === 'unauthorized') {
      setStatus('signedOut')
    } else {
      setStatus(current => (current === 'ready' ? current : 'error'))
      setError(result.message)
    }
  }, [])

  useEffect(() => {
    if (!enabled || initial) return
    void refresh()
  }, [enabled, initial, refresh])

  const apply = useCallback(
    (
      run: () => Promise<BibleYearResult<BibleYearMutationResponse>>,
      reloadOnFailure = false,
    ): Promise<boolean> => {
      const mine = ++seq.current
      begin()
      const task = queue.current.then(async (): Promise<boolean> => {
        const result = await run()
        const latest = mine === seq.current
        end()
        if (!mounted.current) return result.ok
        if (result.ok) {
          if (latest) {
            reloadAfterQueue.current = false
            setData(current => ({
              catalogue: current?.catalogue ?? [],
              tracks: current?.tracks ?? [],
              enrollment: result.data.enrollment,
              today: result.data.today,
            }))
          }
          return true
        }
        if (result.kind === 'unauthorized') {
          setStatus('signedOut')
        } else if (reloadOnFailure || reloadAfterQueue.current) {
          // An optimistic tick that did not land: take the server's word
          // again, once the queue is empty so the reload cannot race a write.
          if (latest) {
            reloadAfterQueue.current = false
            void refresh()
          } else {
            reloadAfterQueue.current = true
          }
        }
        setError(result.message)
        return false
      })
      queue.current = task.catch(() => undefined)
      return task
    },
    [begin, end, refresh],
  )

  const markRefs = useCallback(
    (refs: { code: string; chapter: number }[], read: boolean) => {
      setData(current =>
        current?.today ? { ...current, today: applyRefMark(current.today, refs, read) } : current,
      )
      return apply(() => markBibleYear({ refs, read }), true)
    },
    [apply],
  )

  const markDay = useCallback(
    (day: number, read: boolean) => apply(() => markBibleYear({ day, read })),
    [apply],
  )

  const shift = useCallback(() => apply(() => patchBibleYear({ action: 'shift' })), [apply])
  const stop = useCallback(() => apply(() => patchBibleYear({ action: 'stop' })), [apply])

  const start = useCallback(
    async (body: BibleYearStartBody) => {
      begin()
      const result = await startBibleYear(body)
      end()
      if (!mounted.current) return result.ok
      if (result.ok) {
        setData(current => ({
          catalogue: current?.catalogue ?? [],
          tracks: current?.tracks ?? [],
          enrollment: result.data.enrollment,
          today: result.data.today,
        }))
        return true
      }
      if (result.kind === 'conflict') {
        // Started elsewhere (the app, another tab): show that plan.
        await refresh()
        return false
      }
      if (result.kind === 'unauthorized') setStatus('signedOut')
      setError(result.message)
      return false
    },
    [begin, end, refresh],
  )

  const restart = useCallback(
    (body: BibleYearStartBody) => apply(() => startOrRestartBibleYear(body)),
    [apply],
  )

  return { status, data, pending, error, refresh, markRefs, markDay, shift, stop, start, restart }
}
