"use client"

import { InfoIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import type { T } from "@/lib/i18n"
import { SITE } from "@/lib/site"
import { cn } from "@/lib/utils"

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px]">
      {children}
    </kbd>
  )
}

export function AboutButton({ t, className }: { t: T; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("about")}
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-background/50 hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
        >
          <InfoIcon className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-64 text-sm">
        <div className="font-medium">
          {SITE.name} <span className="text-xs font-normal text-muted-foreground">v{SITE.version}</span>
        </div>
        <div className="text-muted-foreground">
          {t("madeBy")}{" "}
          {SITE.creatorUrl ? (
            <a href={SITE.creatorUrl} target="_blank" rel="noreferrer" className="text-foreground underline-offset-4 hover:underline">
              {SITE.creator}
            </a>
          ) : (
            <span className="text-foreground">{SITE.creator}</span>
          )}{" "}
          · © {SITE.year}
        </div>
        <Separator />
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground">{t("shortcuts")}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1"><Kbd>F</Kbd> {t("fullscreen")}</span>
            <span className="flex items-center gap-1"><Kbd>S</Kbd> {t("settings")}</span>
            <span className="flex items-center gap-1"><Kbd>T</Kbd> {t("theme")}</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">{t("savedLocally")}</p>
      </PopoverContent>
    </Popover>
  )
}
