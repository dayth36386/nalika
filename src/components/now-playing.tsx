"use client"

import { PauseIcon, PlayIcon, SkipBackIcon, SkipForwardIcon } from "lucide-react"
import { toast } from "sonner"
import { livePosition, type SpotifyStore } from "@/hooks/use-spotify"
import type { T } from "@/lib/i18n"
import { cn } from "@/lib/utils"

function fmt(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}

function SpotifyGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.8-1.7-6.4-2.1-10.5-1.2a.75.75 0 1 1-.33-1.46c4.5-1 8.5-.6 11.6 1.4.35.2.46.67.24 1Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.2-2-8.1-2.55-11.9-1.4a.94.94 0 0 1-.55-1.8c4.3-1.3 9.7-.68 13.4 1.6.44.27.58.85.31 1.29Zm.13-3.4C15.24 8.35 8.9 8.14 5.2 9.26a1.13 1.13 0 1 1-.65-2.16c4.25-1.29 11.3-1.04 15.7 1.6a1.13 1.13 0 0 1-1.15 1.94Z" />
    </svg>
  )
}

export function NowPlaying({
  spotify,
  now,
  t,
  onImage,
  className,
}: {
  spotify: SpotifyStore
  now: Date
  t: T
  onImage: boolean
  className?: string
}) {
  const { track, profile, control } = spotify
  if (!track) return null

  const pos = livePosition(track, now.getTime())
  const pct = track.durationMs ? (pos / track.durationMs) * 100 : 0

  async function act(a: "play" | "pause" | "next" | "previous") {
    const ok = await control(a)
    if (!ok) toast.error(profile && !profile.premium ? t("spotifyNeedsPremium") : t("spotifyControlFailed"))
  }

  const btn = cn(
    "flex size-7 items-center justify-center rounded-full transition-colors",
    onImage ? "hover:bg-white/15" : "hover:bg-foreground/10"
  )

  return (
    <div
      className={cn(
        "group flex w-80 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border p-2.5 pr-3 shadow-lg backdrop-blur-xl",
        onImage ? "border-white/15 bg-black/30 text-white" : "border-border/60 bg-background/50 text-foreground",
        className
      )}
    >
      <a
        href={track.url}
        target="_blank"
        rel="noreferrer"
        className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
        aria-label={t("openInSpotify")}
      >
        {track.image && (
          // eslint-disable-next-line @next/next/no-img-element -- remote Spotify CDN art, no optimization needed
          <img src={track.image} alt="" className="size-full object-cover" />
        )}
      </a>

      <div className="min-w-0 flex-1">
        <div className={cn("flex items-center gap-1.5 text-[10px] uppercase tracking-wider", onImage ? "text-white/60" : "text-muted-foreground")}>
          <SpotifyGlyph className="size-3 text-[#1DB954]" />
          {track.isPlaying ? t("nowPlaying") : t("paused")}
        </div>
        <div className="truncate text-sm font-medium" title={track.title}>
          {track.title}
        </div>
        <div className={cn("truncate text-xs", onImage ? "text-white/70" : "text-muted-foreground")} title={track.artists}>
          {track.artists}
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className={cn("w-8 text-[10px] tabular-nums", onImage ? "text-white/60" : "text-muted-foreground")}>{fmt(pos)}</span>
          <div className={cn("h-1 flex-1 overflow-hidden rounded-full", onImage ? "bg-white/20" : "bg-foreground/10")}>
            <div
              className="h-full rounded-full bg-[#1DB954] transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn("w-8 text-right text-[10px] tabular-nums", onImage ? "text-white/60" : "text-muted-foreground")}>
            {fmt(track.durationMs)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <button type="button" className={btn} onClick={() => act(track.isPlaying ? "pause" : "play")} aria-label={track.isPlaying ? t("pause") : t("play")}>
          {track.isPlaying ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
        </button>
        <div className="flex">
          <button type="button" className={cn(btn, "size-6")} onClick={() => act("previous")} aria-label={t("previous")}>
            <SkipBackIcon className="size-3" />
          </button>
          <button type="button" className={cn(btn, "size-6")} onClick={() => act("next")} aria-label={t("next")}>
            <SkipForwardIcon className="size-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

export { SpotifyGlyph }
