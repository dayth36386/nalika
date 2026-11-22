"use client"

import { useEffect, useRef, useState } from "react"
import { MinusIcon, PauseIcon, PlayIcon, PlusIcon, RotateCcwIcon, Volume2Icon, VolumeXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { countdownRemaining, countdownStatus, playAlarm, primeAudio, type CountdownStore } from "@/hooks/use-countdown"
import type { T } from "@/lib/i18n"
import type { Settings } from "@/lib/settings"
import { cn } from "@/lib/utils"

const PRESETS = [15, 30, 60, 90, 120, 180]

function fmtCountdown(ms: number) {
  const total = Math.ceil(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, "0")
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

function presetLabel(min: number, t: T) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return t("minutes", { m })
  return m === 0 ? t("hours", { h }) : t("hours", { h: min / 60 }) // 90 → "1.5h"
}

function Stepper({
  value,
  onChange,
  max,
  label,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  max: number
  label: string
  step?: number
}) {
  const clamp = (v: number) => Math.min(max, Math.max(0, v))
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button variant="outline" size="icon" aria-label={`- ${label}`} onClick={() => onChange(clamp(value - step))}>
          <MinusIcon />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          className="h-14 w-16 px-1 text-center font-mono text-3xl tabular-nums sm:h-16 sm:w-24 sm:text-4xl md:text-4xl phone-landscape:h-12 phone-landscape:text-3xl"
          aria-label={label}
        />
        <Button variant="outline" size="icon" aria-label={`+ ${label}`} onClick={() => onChange(clamp(value + step))}>
          <PlusIcon />
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Setup({ store, t }: { store: CountdownStore; t: T }) {
  const last = store.data.durationMs || 60 * 60_000
  const [hours, setHours] = useState(Math.floor(last / 3_600_000))
  const [minutes, setMinutes] = useState(Math.round((last % 3_600_000) / 60_000))
  const totalMin = hours * 60 + minutes

  return (
    <div className="mx-4 rounded-3xl border border-border/60 bg-background/60 p-5 shadow-2xl backdrop-blur-xl sm:mx-auto sm:w-full sm:max-w-lg sm:p-8 phone-landscape:mx-auto phone-landscape:w-[calc(100%-2rem)] phone-landscape:max-w-3xl phone-landscape:p-5">
      <h2 className="mb-5 text-center text-lg font-semibold phone-landscape:hidden">{t("modeCountdown")}</h2>

      <div className="phone-landscape:grid phone-landscape:grid-cols-2 phone-landscape:items-center phone-landscape:gap-6">
        <div>
          <Input
            value={store.data.title}
            onChange={(e) => store.setTitle(e.target.value)}
            placeholder={t("cdTitlePlaceholder")}
            className="mb-5 text-center phone-landscape:mb-4"
          />

          <div className="flex items-start justify-center gap-3 sm:gap-6">
            <Stepper value={hours} onChange={setHours} max={23} label={t("cdHours")} />
            <Stepper value={minutes} onChange={setMinutes} max={59} label={t("cdMinutes")} step={5} />
          </div>
        </div>

        <div>
          <div className="mt-5 flex flex-wrap justify-center gap-2 phone-landscape:mt-0">
            {PRESETS.map((m) => (
              <Button
                key={m}
                variant={totalMin === m ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setHours(Math.floor(m / 60))
                  setMinutes(m % 60)
                }}
              >
                {presetLabel(m, t)}
              </Button>
            ))}
          </div>

          <label className="mt-5 flex items-center justify-center gap-3 text-sm phone-landscape:mt-3">
            <Switch checked={store.data.sound} onCheckedChange={store.setSound} />
            {t("cdSound")}
          </label>

          <Button
            size="lg"
            className="mt-5 h-14 w-full rounded-2xl text-lg phone-landscape:mt-3 phone-landscape:h-12"
            disabled={totalMin <= 0}
            onClick={() => {
              primeAudio()
              store.start(totalMin * 60_000)
            }}
          >
            <PlayIcon className="fill-current" /> {t("cdStart")}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Countdown({
  store,
  now,
  settings: s,
  onImage,
  hideUi,
  t,
  placeLabel,
}: {
  store: CountdownStore
  now: Date
  settings: Settings
  onImage: boolean
  hideUi: boolean
  t: T
  placeLabel: string
}) {
  const nowMs = now.getTime()
  const { data } = store
  const status = countdownStatus(data, nowMs)
  const remaining = countdownRemaining(data, nowMs)
  const [confirmReset, setConfirmReset] = useState(false)

  // Beep once when a running countdown crosses zero (not when reloading long after it ended).
  const prevRemaining = useRef<number | null>(null)
  useEffect(() => {
    const prev = prevRemaining.current
    prevRemaining.current = remaining
    if (status === "done" && prev !== null && prev > 0 && data.sound) playAlarm()
  }, [remaining, status, data.sound])

  useEffect(() => {
    if (!confirmReset) return
    const id = setTimeout(() => setConfirmReset(false), 3000)
    return () => clearTimeout(id)
  }, [confirmReset])

  if (!store.hydrated) return null
  if (status === "idle") return <Setup store={store} t={t} />

  const pct = data.durationMs ? Math.min(100, ((data.durationMs - remaining) / data.durationMs) * 100) : 100
  const endAt = data.endAt ?? nowMs + remaining
  const timeFmt = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: s.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: s.hour12 ? "h12" : "h23",
    }).format(d)

  const display = fmtCountdown(remaining)
  const urgent = status !== "done" && remaining <= 60_000
  const warning = status !== "done" && !urgent && remaining <= 5 * 60_000
  const custom = !!s.textColor
  const muted = custom ? "opacity-70" : onImage ? "text-white/70" : "text-muted-foreground"

  return (
    <div
      className={cn(
        "w-full select-none px-4 text-center",
        onImage && "[text-shadow:0_2px_24px_rgb(0_0_0/0.45)]",
        !custom && (onImage ? "text-white" : "text-foreground"),
      )}
      style={custom ? { color: s.textColor } : undefined}
    >
      {/* small wall clock */}
      <div
        className={cn(
          "mb-6 font-mono text-[clamp(1rem,2.4vw,1.75rem)] tabular-nums tracking-wider phone-landscape:mb-1 phone-landscape:text-sm",
          muted,
        )}
      >
        {timeFmt(now)}{" "}
        <span className="font-sans text-[0.6em] uppercase tracking-[0.3em]">· {placeLabel}</span>
      </div>

      {data.title.trim() && (
        <div className="mb-4 text-[clamp(1.25rem,min(4.5vw,7vh),3.5rem)] font-medium leading-tight text-balance phone-landscape:mb-1">
          {data.title}
        </div>
      )}

      {/* big countdown */}
      <div
        className={cn(
          "font-mono font-light leading-none tabular-nums tracking-tight transition-colors duration-700",
          warning && "text-amber-400",
          urgent && "text-red-500",
          status === "done" && "animate-pulse text-red-500",
          status === "paused" && "opacity-50",
        )}
        style={{
          // mono digits are ~0.6em wide: fit the string to ~88% of the width, capped by height
          fontSize: `calc(min(${(88 / (display.length * 0.6)).toFixed(2)}vw, 36vh, 22rem) * ${s.clockScale || 1})`,
        }}
        aria-live="polite"
      >
        {display}
      </div>

      <div
        className={cn(
          "mt-4 text-[clamp(1rem,2.6vw,2rem)] font-medium phone-landscape:mt-1 phone-landscape:text-base",
          status === "done" ? "text-red-500" : muted,
        )}
      >
        {status === "done"
          ? t("cdTimeUp")
          : status === "paused"
            ? t("cdPaused")
            : t("cdEndsAt", { time: timeFmt(new Date(endAt)) })}
      </div>

      <div className="mx-auto mt-6 w-full max-w-2xl phone-landscape:mt-2">
        <div className={cn("h-2 overflow-hidden rounded-full", custom ? "bg-current/20" : onImage ? "bg-white/20" : "bg-foreground/10")}>
          <div
            className={cn(
              "h-full rounded-full transition-[width,background-color] duration-1000 ease-linear",
              urgent || status === "done"
                ? "bg-red-500"
                : warning
                  ? "bg-amber-400"
                  : onImage
                    ? "bg-white"
                    : custom
                      ? "bg-current"
                      : "bg-foreground/80",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* controls — fade out with the rest of the UI */}
      <div
        className={cn(
          "mt-8 flex flex-wrap items-center justify-center gap-2 transition-opacity duration-500 sm:gap-3 phone-landscape:mt-3",
          hideUi ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        {status !== "done" && (
          <Button
            size="lg"
            className="min-w-36 rounded-full"
            onClick={() => (status === "paused" ? store.resume() : store.pause())}
          >
            {status === "paused" ? <PlayIcon className="fill-current" /> : <PauseIcon className="fill-current" />}
            {status === "paused" ? t("cdResume") : t("cdPause")}
            <kbd className="ml-1 hidden rounded bg-background/20 px-1.5 text-[10px] font-normal [@media(pointer:fine)]:inline">Space</kbd>
          </Button>
        )}
        <Button size="lg" variant="outline" className="rounded-full" onClick={() => store.addTime(5 * 60_000)}>
          <PlusIcon /> {t("cdAdd5")}
        </Button>
        <Button
          size="lg"
          variant={confirmReset ? "destructive" : "outline"}
          className="rounded-full"
          onClick={() => {
            if (confirmReset || status === "done") {
              store.reset()
              setConfirmReset(false)
            } else setConfirmReset(true)
          }}
        >
          <RotateCcwIcon /> {confirmReset ? t("cdResetConfirm") : t("cdReset")}
        </Button>
        <Button
          size="icon-lg"
          variant="ghost"
          className="rounded-full"
          aria-label={t("cdSound")}
          onClick={() => store.setSound(!data.sound)}
        >
          {data.sound ? <Volume2Icon /> : <VolumeXIcon />}
        </Button>
      </div>
    </div>
  )
}
