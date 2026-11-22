"use client"

import { cn } from "@/lib/utils"
import type { Settings } from "@/lib/settings"
import { cityName, offsetLabel, parseHHMM, zonedParts } from "@/lib/time"
import { dateLocale, formatDuration, translator, type T } from "@/lib/i18n"

function formatTime(now: Date, s: Settings, timeZone: string, withSeconds: boolean) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hourCycle: s.hour12 ? "h12" : "h23",
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ""
  return { h: get("hour"), m: get("minute"), s: get("second"), period: get("dayPeriod") }
}

function WorkProgress({ now, s, onImage, t }: { now: Date; s: Settings; onImage: boolean; t: T }) {
  const { h, m, s: sec } = zonedParts(now, s.timezone)
  const cur = h * 60 + m + sec / 60
  const start = parseHHMM(s.workStart)
  let end = parseHHMM(s.workEnd)
  if (end <= start) end += 24 * 60
  const curAdj = cur < start && end > 24 * 60 ? cur + 24 * 60 : cur

  const total = end - start
  const done = Math.min(Math.max(curAdj - start, 0), total)
  const pct = (done / total) * 100

  let label: string
  if (curAdj < start) {
    label = t("startsIn", { d: formatDuration(t, Math.ceil(start - curAdj)) })
  } else if (curAdj >= end) {
    label = t("workDone")
  } else {
    label = t("leftUntilEnd", { d: formatDuration(t, Math.ceil(end - curAdj)) })
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-md">
      <div className={cn("mb-2 flex justify-between text-xs tabular-nums", onImage ? "text-white/70" : "text-muted-foreground")}>
        <span>{s.workStart}</span>
        <span>{label}</span>
        <span>{s.workEnd}</span>
      </div>
      <div className={cn("h-1.5 overflow-hidden rounded-full", onImage ? "bg-white/20" : "bg-foreground/10")}>
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", onImage ? "bg-white" : "bg-foreground/80")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Clock({ now, settings: s, onImage }: { now: Date; settings: Settings; onImage: boolean }) {
  const t = formatTime(now, s, s.timezone, s.showSeconds)
  const tr = translator(s.lang)
  const date = new Intl.DateTimeFormat(dateLocale(s.lang), {
    timeZone: s.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now)

  const muted = onImage ? "text-white/75" : "text-muted-foreground"

  return (
    <div
      className={cn(
        "w-full select-none px-4 text-center",
        onImage ? "text-white [text-shadow:0_2px_24px_rgb(0_0_0/0.45)]" : "text-foreground"
      )}
    >
      <div className={cn("mb-4 text-sm font-medium uppercase tracking-[0.3em]", muted)}>
        {cityName(s.timezone)} · {offsetLabel(s.timezone, now)}
      </div>

      <div className="flex items-baseline justify-center font-mono font-light leading-none tabular-nums tracking-tight">
        <span className="text-[clamp(4.5rem,18vw,16rem)]">{t.h}</span>
        <span className="mx-[0.05em] animate-pulse text-[clamp(4.5rem,18vw,16rem)] opacity-60">:</span>
        <span className="text-[clamp(4.5rem,18vw,16rem)]">{t.m}</span>
        {s.showSeconds && (
          <span className={cn("ml-3 text-[clamp(1.5rem,5vw,4.5rem)]", muted)}>{t.s}</span>
        )}
        {s.hour12 && (
          <span className={cn("ml-3 text-[clamp(1rem,3vw,2.5rem)] font-medium", muted)}>{t.period}</span>
        )}
      </div>

      {s.showDate && <div className={cn("mt-6 text-[clamp(1rem,2.2vw,1.6rem)] font-light", muted)}>{date}</div>}

      {s.showWorkHours && <WorkProgress now={now} s={s} onImage={onImage} t={tr} />}

      {s.extraZones.length > 0 && (
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-3">
          {s.extraZones.map((z) => {
            const zt = formatTime(now, s, z, false)
            return (
              <div
                key={z}
                className={cn(
                  "min-w-32 rounded-xl border px-4 py-3 backdrop-blur-md",
                  onImage ? "border-white/15 bg-black/20" : "border-border/60 bg-background/40"
                )}
              >
                <div className={cn("text-xs", muted)}>{cityName(z)}</div>
                <div className="font-mono text-2xl tabular-nums">
                  {zt.h}:{zt.m}
                  {s.hour12 && <span className={cn("ml-1 text-xs", muted)}>{zt.period}</span>}
                </div>
                <div className={cn("text-[10px]", muted)}>{offsetLabel(z, now)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
