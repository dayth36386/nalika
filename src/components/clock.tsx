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

  // custom text (if set) with {left} {start} {end}; otherwise the built-in translated text
  const fill = (tpl: string, leftMin: number) =>
    tpl
      .replaceAll("{left}", formatDuration(t, leftMin))
      .replaceAll("{start}", s.workStart)
      .replaceAll("{end}", s.workEnd)

  let label: string
  if (curAdj < start) {
    const left = Math.ceil(start - curAdj)
    label = s.progressTextBefore.trim() ? fill(s.progressTextBefore, left) : t("startsIn", { d: formatDuration(t, left) })
  } else if (curAdj >= end) {
    label = s.progressTextAfter.trim() ? fill(s.progressTextAfter, 0) : t("workDone")
  } else {
    const left = Math.ceil(end - curAdj)
    label = s.progressTextDuring.trim() ? fill(s.progressTextDuring, left) : t("leftUntilEnd", { d: formatDuration(t, left) })
  }

  const scale = s.progressScale || 1
  const custom = !!s.textColor
  const muted = custom ? "opacity-70" : onImage ? "text-white/70" : "text-muted-foreground"

  return (
    <div
      className="mx-auto mt-[2.5em] w-full phone-landscape:mt-[1em]"
      style={{ maxWidth: `min(100%, ${28 * scale}rem)`, fontSize: `${0.75 * scale}rem` }}
    >
      {s.progressTitle.trim() && (
        <div className="mb-[0.5em] text-[1.6em] font-medium leading-tight">{s.progressTitle}</div>
      )}
      <div className={cn("mb-[0.6em] flex items-baseline justify-between gap-[1em] tabular-nums", muted)}>
        <span>{s.workStart}</span>
        <span className="text-[1.15em] text-balance">{label}</span>
        <span>{s.workEnd}</span>
      </div>
      <div
        className={cn("overflow-hidden rounded-full", custom ? "bg-current/20" : onImage ? "bg-white/20" : "bg-foreground/10")}
        style={{ height: `${0.375 * scale}rem` }}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-1000 ease-linear", custom ? "bg-current" : onImage ? "bg-white" : "bg-foreground/80")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Clock({
  now,
  settings: s,
  onImage,
  placeLabel,
}: {
  now: Date
  settings: Settings
  onImage: boolean
  /** City / place shown above the time */
  placeLabel: string
}) {
  const t = formatTime(now, s, s.timezone, s.showSeconds)
  const tr = translator(s.lang)
  const date = new Intl.DateTimeFormat(dateLocale(s.lang), {
    timeZone: s.timezone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now)

  const muted = s.textColor ? "opacity-75" : onImage ? "text-white/75" : "text-muted-foreground"

  return (
    <div
      className={cn(
        "w-full select-none px-4 text-center",
        onImage && "[text-shadow:0_2px_24px_rgb(0_0_0/0.45)]",
        !s.textColor && (onImage ? "text-white" : "text-foreground")
      )}
      style={s.textColor ? { color: s.textColor } : undefined}
    >
      <div className={cn("mb-4 text-sm font-medium uppercase tracking-[0.3em] phone-landscape:mb-1 phone-landscape:text-xs", muted)}>
        {placeLabel} · {offsetLabel(s.timezone, now)}
      </div>

      <div
        className="flex items-baseline justify-center font-mono font-light leading-none tabular-nums tracking-tight"
        style={{ "--clock-scale": s.clockScale || 1 } as React.CSSProperties}
      >
        <span className="text-[calc(clamp(3.5rem,min(20vw,30vh),16rem)*var(--clock-scale))]">{t.h}</span>
        <span className="mx-[0.05em] animate-pulse text-[calc(clamp(3.5rem,min(20vw,30vh),16rem)*var(--clock-scale))] opacity-60">:</span>
        <span className="text-[calc(clamp(3.5rem,min(20vw,30vh),16rem)*var(--clock-scale))]">{t.m}</span>
        {s.showSeconds && (
          <span className={cn("ml-3 text-[calc(clamp(1.25rem,min(5.5vw,8vh),4.5rem)*var(--clock-scale))]", muted)}>{t.s}</span>
        )}
        {s.hour12 && (
          <span className={cn("ml-3 text-[calc(clamp(0.9rem,min(3.2vw,5vh),2.5rem)*var(--clock-scale))] font-medium", muted)}>{t.period}</span>
        )}
      </div>

      {s.showDate && <div className={cn("mt-6 text-[clamp(1rem,2.2vw,1.6rem)] font-light phone-landscape:mt-2 phone-landscape:text-base", muted)}>{date}</div>}

      {s.showWorkHours && <WorkProgress now={now} s={s} onImage={onImage} t={tr} />}

      {s.extraZones.length > 0 && (
        <div className="mx-auto mt-12 flex max-w-3xl flex-wrap justify-center gap-3 phone-landscape:mt-4 phone-landscape:gap-2">
          {s.extraZones.map((z) => {
            const zt = formatTime(now, s, z, false)
            return (
              <div
                key={z}
                className={cn(
                  "min-w-28 rounded-xl border px-4 py-3 backdrop-blur-md sm:min-w-32 phone-landscape:py-1.5",
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
