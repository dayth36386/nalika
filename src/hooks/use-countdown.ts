"use client"

import { useCallback, useEffect, useState } from "react"

const KEY = "work-clock:countdown"

/**
 * Countdown persisted in localStorage as absolute timestamps, so a reload
 * (or a sleeping laptop) never loses or drifts the remaining time.
 */
export type CountdownData = {
  /** Total length of the current countdown, for the progress bar. */
  durationMs: number
  /** Wall-clock end time while running. */
  endAt: number | null
  /** Remaining time while paused. */
  pausedRemaining: number | null
  title: string
  sound: boolean
}

export type CountdownStatus = "idle" | "running" | "paused" | "done"

const EMPTY: CountdownData = { durationMs: 0, endAt: null, pausedRemaining: null, title: "", sound: true }

export function useCountdown() {
  const [data, setData] = useState<CountdownData>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage
      if (raw) setData({ ...EMPTY, ...JSON.parse(raw) })
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data))
    } catch {}
  }, [data, hydrated])

  const start = useCallback((durationMs: number) => {
    if (durationMs <= 0) return
    setData((d) => ({ ...d, durationMs, endAt: Date.now() + durationMs, pausedRemaining: null }))
  }, [])

  const pause = useCallback(() => {
    setData((d) =>
      d.endAt === null ? d : { ...d, endAt: null, pausedRemaining: Math.max(0, d.endAt - Date.now()) }
    )
  }, [])

  const resume = useCallback(() => {
    setData((d) => (d.pausedRemaining === null ? d : { ...d, endAt: Date.now() + d.pausedRemaining, pausedRemaining: null }))
  }, [])

  const reset = useCallback(() => {
    // keep durationMs so the setup screen offers the last length again
    setData((d) => ({ ...d, endAt: null, pausedRemaining: null }))
  }, [])

  const addTime = useCallback((ms: number) => {
    setData((d) => {
      if (d.pausedRemaining !== null) return { ...d, durationMs: d.durationMs + ms, pausedRemaining: d.pausedRemaining + ms }
      if (d.endAt === null) return d
      const now = Date.now()
      // already finished: restart from now with the extra time
      const base = Math.max(d.endAt, now)
      return { ...d, durationMs: d.durationMs + ms + Math.max(0, now - d.endAt), endAt: base + ms }
    })
  }, [])

  const setTitle = useCallback((title: string) => setData((d) => ({ ...d, title })), [])
  const setSound = useCallback((sound: boolean) => setData((d) => ({ ...d, sound })), [])

  return { data, hydrated, start, pause, resume, reset, addTime, setTitle, setSound }
}

export type CountdownStore = ReturnType<typeof useCountdown>

export function countdownRemaining(d: CountdownData, now: number) {
  if (d.pausedRemaining !== null) return d.pausedRemaining
  if (d.endAt !== null) return Math.max(0, d.endAt - now)
  return 0
}

export function countdownStatus(d: CountdownData, now: number): CountdownStatus {
  if (d.pausedRemaining !== null) return "paused"
  if (d.endAt === null) return "idle"
  return d.endAt - now <= 0 ? "done" : "running"
}

/* ---------- alarm sound (Web Audio, no asset needed) ---------- */

let audioCtx: AudioContext | null = null

/** Call from a user gesture (e.g. the Start click) so browsers allow sound later. */
export function primeAudio() {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === "suspended") void audioCtx.resume()
  } catch {}
}

export function playAlarm() {
  try {
    audioCtx ??= new AudioContext()
    const ctx = audioCtx
    const t0 = ctx.currentTime + 0.05
    // three soft double-beeps
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const t = t0 + i * 0.9 + j * 0.22
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.value = 880
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.35, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.2)
      }
    }
  } catch {}
}
