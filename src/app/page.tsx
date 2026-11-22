"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { MaximizeIcon, MinimizeIcon, MoonIcon, SettingsIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Clock } from "@/components/clock"
import { SettingsSheet } from "@/components/settings-sheet"
import { AboutButton } from "@/components/about-button"
import { NowPlaying } from "@/components/now-playing"
import { useSpotify } from "@/hooks/use-spotify"
import { toast } from "sonner"
import { useNow } from "@/hooks/use-now"
import { useSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { translator } from "@/lib/i18n"

const ThreeBackground = dynamic(() => import("@/components/three-background"), { ssr: false })
const ImageBackground = dynamic(() => import("@/components/image-background"), { ssr: false })

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

  const dark = resolvedTheme !== "light"
  const onImage = settings.backgroundMode === "image" && !!image
  const t = translator(settings.lang)
  const spotify = useSpotify(hydrated && settings.showSpotify)

  useEffect(() => {
    if (spotify.status === "error") toast.error(t("spotifyConnectError"))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to status changes
  }, [spotify.status])

  useEffect(() => {
    document.documentElement.lang = settings.lang
  }, [settings.lang])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof Element && e.target.closest("input, textarea, [role=dialog]")) return
      const key = e.key.toLowerCase()
      if (key === "f") toggle()
      if (key === "s") setOpen((o) => !o)
      if (key === "t") setTheme(dark ? "light" : "dark")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const hideUi = idle && !open

  return (
    <main className={cn("relative isolate flex h-dvh w-full items-center justify-center overflow-hidden", hideUi && "cursor-none")}>
      {/* Background */}
      {hydrated &&
        (onImage ? (
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
      <div className={cn("transition-opacity duration-700", now && hydrated ? "opacity-100" : "opacity-0")}>
        {now && hydrated && <Clock now={now} settings={settings} onImage={onImage} />}
      </div>

      {/* Controls */}
      <div
        className={cn(
          "fixed right-4 top-4 flex gap-2 transition-all duration-500",
          hideUi ? "pointer-events-none -translate-y-2 opacity-0" : "opacity-100"
        )}
      >
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
        <div className="fixed bottom-4 left-4">
          <NowPlaying spotify={spotify} now={now} t={t} onImage={onImage} />
        </div>
      )}

      {/* Credit */}
      <div
        className={cn(
          "fixed bottom-3 right-3 transition-opacity duration-500",
          hideUi ? "pointer-events-none opacity-0" : "opacity-100",
          onImage && "[&_button]:text-white/50 [&_button:hover]:text-white"
        )}
      >
        <AboutButton t={t} />
      </div>

      <SettingsSheet open={open} onOpenChange={setOpen} store={store} spotify={spotify} />
    </main>
  )
}
