"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import * as sp from "@/lib/spotify"

export type SpotifyStatus = "idle" | "connecting" | "connected" | "error"

const POLL_MS = 5000

export function useSpotify(enabled: boolean) {
  const [status, setStatus] = useState<SpotifyStatus>("idle")
  const [profile, setProfile] = useState<sp.Profile | null>(null)
  const [track, setTrack] = useState<sp.Track | null>(null)
  const redirectHandled = useRef(false)

  const disconnect = useCallback(() => {
    sp.logout()
    setProfile(null)
    setTrack(null)
    setStatus("idle")
  }, [])

  const poll = useCallback(async () => {
    try {
      setTrack(await sp.getCurrentlyPlaying())
    } catch (e) {
      if (e instanceof sp.SpotifyAuthError) disconnect()
    }
  }, [disconnect])

  // Initial load: finish an OAuth redirect if present, then fetch profile.
  useEffect(() => {
    sp.clearLegacyClientId()
    if (redirectHandled.current) return
    redirectHandled.current = true
    ;(async () => {
      const result = await sp.handleRedirect()
      if (result === "error") {
        setStatus("error")
        return
      }
      if (!sp.hasToken()) return
      setStatus("connecting")
      try {
        const p = await sp.getProfile()
        setProfile(p)
        setStatus(p ? "connected" : "error")
      } catch {
        disconnect()
      }
    })()
  }, [disconnect])

  // Poll now-playing while connected, enabled and the tab is visible.
  useEffect(() => {
    if (status !== "connected" || !enabled) return
    let timer: ReturnType<typeof setInterval> | undefined
    const start = () => {
      poll()
      timer = setInterval(poll, POLL_MS)
    }
    const stop = () => clearInterval(timer)
    const onVis = () => (document.hidden ? stop() : start())
    if (!document.hidden) start()
    document.addEventListener("visibilitychange", onVis)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [status, enabled, poll])

  const control = useCallback(
    async (action: "play" | "pause" | "next" | "previous") => {
      // optimistic play/pause
      if (action === "play" || action === "pause")
        setTrack((t) => (t ? { ...t, isPlaying: action === "play", progressMs: livePosition(t), fetchedAt: Date.now() } : t))
      let ok = false
      try {
        ok = await sp.control(action)
      } catch {}
      setTimeout(poll, 400)
      return ok
    },
    [poll]
  )

  return {
    status,
    profile,
    track,
    configured: !!sp.getClientId(),
    connect: sp.startLogin,
    disconnect,
    control,
  }
}

export type SpotifyStore = ReturnType<typeof useSpotify>

/** Playback position extrapolated from the last poll. */
export function livePosition(t: sp.Track, now = Date.now()) {
  if (!t.isPlaying) return t.progressMs
  return Math.min(t.durationMs, t.progressMs + (now - t.fetchedAt))
}
