"use client"

import { useEffect, useState } from "react"
import type { Lang } from "@/lib/i18n"

/**
 * Human place name ("ราชบุรี", "Ratchaburi") for where the browser is.
 * Uses the Geolocation API (browser asks permission once), rounds the
 * coordinates to ~1 km, then reverse-geocodes with BigDataCloud's free
 * client-side endpoint. Results are cached per language in localStorage.
 */

const CACHE_KEY = "work-clock:place"
const MAX_AGE = 1000 * 60 * 60 * 24 * 7 // re-check location weekly

type Cache = { lat: number; lon: number; at: number; names: Partial<Record<Lang, string>> }

export type PlaceStatus = "idle" | "loading" | "ok" | "denied" | "error"

function readCache(): Cache | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Cache) : null
  } catch {
    return null
  }
}

function writeCache(c: Cache) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(c))
  } catch {}
}

/** "จังหวัดราชบุรี" → "ราชบุรี", "ラーチャブリー県" → "ラーチャブリー", "Ratchaburi Province" → "Ratchaburi" */
function cleanProvince(name: string) {
  return name
    .replace(/^จังหวัด/, "")
    .replace(/\s*Province$/i, "")
    .replace(/[県府省]$/, "")
    .trim()
}

type Geo = { countryCode?: string; principalSubdivision?: string; city?: string; locality?: string }

function pickName(g: Geo) {
  // In Thailand the province is what people expect ("ราชบุรี"), not the municipality.
  if (g.countryCode === "TH" && g.principalSubdivision) return cleanProvince(g.principalSubdivision)
  return g.city || g.locality || (g.principalSubdivision ? cleanProvince(g.principalSubdivision) : "")
}

async function reverseGeocode(lat: number, lon: number, lang: Lang) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${lang}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`geocode ${res.status}`)
  return pickName((await res.json()) as Geo)
}

function getPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("unsupported"))
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          // ~1 km precision is plenty for a city name and keeps the exact spot private
          lat: Math.round(p.coords.latitude * 100) / 100,
          lon: Math.round(p.coords.longitude * 100) / 100,
        }),
      reject,
      { enableHighAccuracy: false, timeout: 15000, maximumAge: MAX_AGE }
    )
  })
}

export function usePlaceName(enabled: boolean, lang: Lang) {
  const [name, setName] = useState<string | null>(null)
  const [status, setStatus] = useState<PlaceStatus>("idle")
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      const cache = readCache()
      const fresh = cache && Date.now() - cache.at < MAX_AGE
      if (fresh && cache.names[lang]) {
        setName(cache.names[lang]!)
        setStatus("ok")
        return
      }
      setStatus("loading")
      try {
        const pos = fresh ? { lat: cache.lat, lon: cache.lon } : await getPosition()
        const n = await reverseGeocode(pos.lat, pos.lon, lang)
        if (cancelled) return
        const names = fresh && cache.lat === pos.lat && cache.lon === pos.lon ? cache.names : {}
        writeCache({ ...pos, at: fresh ? cache.at : Date.now(), names: { ...names, [lang]: n } })
        setName(n || null)
        setStatus(n ? "ok" : "error")
      } catch (e) {
        if (cancelled) return
        const denied = typeof GeolocationPositionError !== "undefined" && e instanceof GeolocationPositionError && e.code === e.PERMISSION_DENIED
        setStatus(denied ? "denied" : "error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled, lang, nonce])

  /** Forget the cached place and look it up again (e.g. after moving). */
  const refresh = () => {
    clearPlaceCache()
    setName(null)
    setNonce((n) => n + 1)
  }

  return { name: enabled ? name : null, status: enabled ? status : "idle", refresh }
}

function clearPlaceCache() {
  try {
    window.localStorage.removeItem(CACHE_KEY)
  } catch {}
}
