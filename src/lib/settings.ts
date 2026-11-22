"use client"

import { useCallback, useEffect, useState } from "react"
import { detectLang, type Lang } from "@/lib/i18n"

export type BackgroundMode = "three" | "image"
export type AppMode = "clock" | "countdown"
export type ScenePalette = "aurora" | "sunset" | "ocean" | "mono"
export type ImageEffect = "none" | "drift" | "parallax" | "liquid" | "ripple"

export type Settings = {
  mode: AppMode
  timezone: string
  extraZones: string[]
  hour12: boolean
  showSeconds: boolean
  showDate: boolean
  lang: Lang
  backgroundMode: BackgroundMode
  palette: ScenePalette
  sceneSpeed: number
  imageDim: number
  imageBlur: number
  imageEffect: ImageEffect
  imageEffectStrength: number
  imageParticles: boolean
  imageGrain: boolean
  showWorkHours: boolean
  workStart: string
  workEnd: string
  /** Optional heading above the progress bar, e.g. "Math exam". */
  progressTitle: string
  /** Custom progress texts; "" = built-in text. Placeholders: {left} {start} {end} */
  progressTextBefore: string
  progressTextDuring: string
  progressTextAfter: string
  progressScale: number
  clockScale: number
  showSpotify: boolean
}

const SETTINGS_KEY = "work-clock:settings"
const IMAGE_KEY = "work-clock:bg-image"

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Bangkok"
  } catch {
    return "Asia/Bangkok"
  }
}

export function defaultSettings(): Settings {
  return {
    mode: "clock",
    timezone: browserTimezone(),
    extraZones: [],
    hour12: false,
    showSeconds: true,
    showDate: true,
    lang: detectLang(),
    backgroundMode: "three",
    palette: "aurora",
    sceneSpeed: 1,
    imageDim: 35,
    imageBlur: 0,
    imageEffect: "drift",
    imageEffectStrength: 1,
    imageParticles: true,
    imageGrain: true,
    showWorkHours: true,
    workStart: "09:00",
    workEnd: "18:00",
    progressTitle: "",
    progressTextBefore: "",
    progressTextDuring: "",
    progressTextAfter: "",
    progressScale: 1,
    clockScale: 1,
    showSpotify: true,
  }
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Settings + background image persisted in localStorage. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [image, setImageState] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = readJSON<Partial<Settings>>(SETTINGS_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time load from localStorage
    if (saved) setSettings((s) => ({ ...s, ...saved }))
    try {
      setImageState(window.localStorage.getItem(IMAGE_KEY))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {}
  }, [settings, hydrated])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])

  const reset = useCallback(() => setSettings(defaultSettings()), [])

  /** Returns false when the image is too large for localStorage. */
  const setImage = useCallback((dataUrl: string | null): boolean => {
    try {
      if (dataUrl) window.localStorage.setItem(IMAGE_KEY, dataUrl)
      else window.localStorage.removeItem(IMAGE_KEY)
      setImageState(dataUrl)
      return true
    } catch {
      return false
    }
  }, [])

  return { settings, update, reset, image, setImage, hydrated }
}

/** Downscale + re-encode an image file so it fits comfortably in localStorage. */
export function compressImage(file: File, maxSide = 2560, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext("2d")
      if (!ctx) return reject(new Error("canvas unsupported"))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL("image/jpeg", quality))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("invalid image"))
    }
    img.src = url
  })
}
