"use client"

import { useEffect, useState } from "react"

/** Current time, re-rendered right on each second boundary. */
export function useNow() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const d = new Date()
      setNow(d)
      timer = setTimeout(tick, 1000 - d.getMilliseconds() + 5)
    }
    tick()
    return () => clearTimeout(timer)
  }, [])

  return now
}
