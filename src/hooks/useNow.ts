import { useEffect, useState } from 'react'
import { tbilisiNow, type TbilisiNow } from '@/lib/schedule'

/** Tbilisi wall-clock time, refreshed often enough for a live countdown. */
export function useNow(intervalMs = 30_000): TbilisiNow {
  const [now, setNow] = useState<TbilisiNow>(() => tbilisiNow())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(tbilisiNow()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
