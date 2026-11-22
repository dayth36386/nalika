"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { ClockIcon, MaximizeIcon, TimerIcon, MinimizeIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock } from "@/components/clock"
import { Countdown } from "@/components/countdown"
import { countdownStatus, useCountdown } from "@/hooks/use-countdown"
import { SettingsSheet } from "@/components/settings-sheet"
import { AboutButton } from "@/components/about-button"
import { NowPlaying } from "@/components/now-playing"
import { useSpotify } from "@/hooks/use-spotify"
import { toast } from "sonner"
import { useNow } from "@/hooks/use-now"
import { browserTimezone, useSettings } from "@/lib/settings"
import { usePlaceName } from "@/hooks/use-place-name"
import { cityName } from "@/lib/time"
import { cn } from "@/lib/utils"
import { translator } from "@/lib/i18n"

const ThreeBackground = dynamic(() => import("@/components/three-background"), { ssr: false })
const ImageBackground = dynamic(() => import("@/components/image-background"), { ssr: false })
const WebcamPixelGrid = dynamic(() => import("@/components/ui/webcam-pixel-grid"), { ssr: false })

function useIdle(ms: number) {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const wake = () => {
      setIdle(false)
      clearTimeout(t)
      t = setTimeout(() => setIdle(true), ms)
    }
    wake()
    const events = ["mousemove", "mousedown", "keydown", "touchstart"] as const
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => {
      clearTimeout(t)
      events.forEach((e) => window.removeEventListener(e, wake))
    }
  }, [ms])
  return idle
}

function useFullscreen() {
  const [isFs, setIsFs] = useState(false)
  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", on)
    return () => document.removeEventListener("fullscreenchange", on)
  }, [])
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }
  return { isFs, toggle }
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={label}
          onClick={onClick}
          className="rounded-full border-border/50 bg-background/40 backdrop-blur-md hover:bg-background/70"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function Home() {
  const store = useSettings()
  const { settings, image, hydrated } = store
  const now = useNow()
  const { resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const idle = useIdle(3000)
  const { isFs, toggle } = useFullscreen()

  // resolvedTheme is only known on the client; assume dark until mounted so SSR and hydration match
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag
  useEffect(() => setMounted(true), [])
  const dark = !mounted || resolvedTheme !== "light"
  const onWebcam = settings.backgroundMode === "webcam"
  // photo or camera background: use white text with a shadow for contrast
  const onImage = (settings.backgroundMode === "image" && !!image) || onWebcam
  const t = translator(settings.lang)
  const spotify = useSpotify(hydrated && settings.showSpotify)
  const countdown = useCountdown()
  const isCountdown = settings.mode === "countdown"

  // Device location only describes the selected time zone if it's the device's own zone.
  const [deviceTz, setDeviceTz] = useState<string | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only value
  useEffect(() => setDeviceTz(browserTimezone()), [])
  const placeAutoUsable = settings.placeMode === "auto" && settings.timezone === deviceTz
  const place = usePlaceName(hydrated && placeAutoUsable, settings.lang)
  const placeLabel =
    settings.placeMode === "custom" && settings.customPlace.trim()
      ? settings.customPlace.trim()
      : placeAutoUsable && place.name
        ? place.name
        : cityName(settings.timezone)

  useEffect(() => {
    if (spotify.status === "error") toast.error(t("spotifyConnectError"))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to status changes
  }, [spotify.status])

  useEffect(() => {
    document.documentElement.lang = settings.lang
  }, [settings.lang])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      // never steal keys while the user is typing
      if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable=true]")) return
      // e.code is the physical key, so shortcuts also work with a Thai (or any non-Latin) keyboard layout
      const inDialog = e.target instanceof Element && !!e.target.closest("[role=dialog]")
      switch (e.code) {
        case "KeyS":
          e.preventDefault()
          setOpen((o) => !o)
          break
        case "KeyF":
          if (!inDialog) toggle()
          break
        case "KeyT":
          if (!inDialog) setTheme(dark ? "light" : "dark")
          break
        case "KeyC":
          if (!inDialog) store.update("mode", isCountdown ? "clock" : "countdown")
          break
        case "Space": {
          if (inDialog || !isCountdown || e.target instanceof HTMLButtonElement) break
          const st = countdownStatus(countdown.data, Date.now())
          if (st === "running") countdown.pause()
          else if (st === "paused") countdown.resume()
          else break
          e.preventDefault()
          break
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const hideUi = idle && !open

  // camera denied / unavailable: tell the user and fall back to the 3D scene
  const onWebcamError = useCallback(() => {
    toast.error(t("webcamError"))
    store.update("backgroundMode", "three")
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t/store.update are stable enough for a one-shot fallback
  }, [settings.lang])

  return (
    <main
      className={cn(
        // m-auto on the content centers it when it fits and lets it scroll when it doesn't (e.g. phone landscape)
        "relative isolate flex h-dvh w-full overflow-x-hidden overflow-y-auto overscroll-none",
        hideUi && "cursor-none"
      )}
    >
      {/* Background */}
      {hydrated &&
        (onWebcam ? (
          <div className="fixed inset-0 -z-10 bg-black">
            <WebcamPixelGrid
              gridCols={settings.webcamDensity}
              gridRows={Math.round(settings.webcamDensity * 0.75)}
              colorMode={settings.webcamColorMode}
              monochromeColor={settings.webcamColor}
              darken={settings.webcamDarken}
              mirror={settings.webcamMirror}
              backgroundColor="#000000"
              showErrorUi={false}
              onWebcamError={onWebcamError}
            />
          </div>
        ) : onImage ? (
          <ImageBackground
            src={image!}
            effect={settings.imageEffect}
            strength={settings.imageEffectStrength}
            particles={settings.imageParticles}
            grain={settings.imageGrain}
            blur={settings.imageBlur}
            dim={settings.imageDim}
          />
        ) : (
          <ThreeBackground palette={settings.palette} dark={dark} speed={settings.sceneSpeed} />
        ))}

      {/* Soft vignette so text stays readable over the scene */}
      {!onImage && (
        <div className="pointer-events-none fixed inset-0 -z-[5] bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_100%)] opacity-40" />
      )}

      {/* Clock */}
      <div
        className={cn(
          "m-auto w-full pt-[max(4.5rem,env(safe-area-inset-top))] pb-[max(4.5rem,env(safe-area-inset-bottom))] transition-opacity duration-700",
          "phone-landscape:pt-3 phone-landscape:pb-3",
          settings.showSpotify && spotify.track && "pb-36 phone-landscape:pb-3",
          now && hydrated ? "opacity-100" : "opacity-0"
        )}
      >
        {now &&
          hydrated &&
          (isCountdown ? (
            <Countdown
              store={countdown}
              now={now}
              settings={settings}
              onImage={onImage}
              hideUi={hideUi}
              t={t}
              placeLabel={placeLabel}
            />
          ) : (
            <Clock now={now} settings={settings} onImage={onImage} placeLabel={placeLabel} />
          ))}
      </div>

      {/* Controls */}
      <div
        className={cn(
          "fixed right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-10 flex gap-2 transition-all duration-500",
          hideUi ? "pointer-events-none -translate-y-2 opacity-0" : "opacity-100"
        )}
      >
        <IconButton
          label={`${isCountdown ? t("modeClock") : t("modeCountdown")} (C)`}
          onClick={() => store.update("mode", isCountdown ? "clock" : "countdown")}
        >
          {isCountdown ? <ClockIcon /> : <TimerIcon />}
        </IconButton>
        <IconButton label={`${dark ? t("lightMode") : t("darkMode")} (T)`} onClick={() => setTheme(dark ? "light" : "dark")}>
          {dark ? <SunIcon /> : <MoonIcon />}
        </IconButton>
        <IconButton label={`${isFs ? t("exitFullscreen") : t("fullscreen")} (F)`} onClick={toggle}>
          {isFs ? <MinimizeIcon /> : <MaximizeIcon />}
        </IconButton>
        <IconButton label={`${t("settings")} (S)`} onClick={() => setOpen(true)}>
          <SettingsIcon />
        </IconButton>
      </div>

      {/* Spotify now playing */}
      {hydrated && now && settings.showSpotify && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-10 origin-bottom-left phone-landscape:scale-75">
          <NowPlaying spotify={spotify} now={now} t={t} onImage={onImage} />
        </div>
      )}

      {/* Credit */}
      <div
        className={cn(
          "fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-10 transition-opacity duration-500",
          hideUi ? "pointer-events-none opacity-0" : "opacity-100",
          onImage && "[&_button]:text-white/50 [&_button:hover]:text-white"
        )}
      >
        <AboutButton t={t} />
      </div>

      <SettingsSheet open={open} onOpenChange={setOpen} store={store} spotify={spotify} place={place} placeAutoUsable={placeAutoUsable} />
    </main>
  )
}
