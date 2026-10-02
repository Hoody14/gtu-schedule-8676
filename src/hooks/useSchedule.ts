import { useCallback, useEffect, useRef, useState } from 'react'
import type { Schedule } from '@/lib/schedule'
import { reloadIfStale } from '@/lib/version'

type Status = 'loading' | 'ready' | 'error'

const DATA_URL = `${import.meta.env.BASE_URL}data/schedule.json`

export interface UseScheduleResult {
  schedule: Schedule | null
  status: Status
  error: string | null
  /** Re-reads the published JSON, bypassing the HTTP cache. */
  reload: () => Promise<{ changed: boolean }>
}

export function useSchedule(): UseScheduleResult {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const signature = useRef<string>('')

  const load = useCallback(async (bustCache: boolean) => {
    const url = bustCache ? `${DATA_URL}?t=${Date.now()}` : DATA_URL
    const response = await fetch(url, { cache: bustCache ? 'reload' : 'default' })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`)
    }

    const payload = (await response.json()) as Schedule
    const next = JSON.stringify({ ...payload, scrapedAt: '' })
    const changed = signature.current !== '' && signature.current !== next

    signature.current = next
    setSchedule(payload)
    setStatus('ready')
    setError(null)
    return { changed }
  }, [])

  useEffect(() => {
    let cancelled = false
    load(false).catch((cause: unknown) => {
      if (cancelled) return
      setStatus('error')
      setError(cause instanceof Error ? cause.message : String(cause))
    })
    void reloadIfStale()
    return () => {
      cancelled = true
    }
  }, [load])

  const reload = useCallback(async () => {
    // A new deployment changes the code as well as the data, so check for one
    // before bothering to diff the JSON.
    if (await reloadIfStale()) return { changed: true }
    return load(true)
  }, [load])

  return { schedule, status, error, reload }
}
