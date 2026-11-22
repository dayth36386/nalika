"use client"

import { useRef } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { BriefcaseIcon, ClockIcon, TimerIcon, DropletsIcon, PencilLineIcon, ImageIcon, MonitorIcon, MousePointer2Icon, MoveIcon, PauseIcon, WavesIcon, MoonIcon, SunIcon, Trash2Icon, UploadIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimezonePicker } from "@/components/timezone-picker"
import { SpotifySettings } from "@/components/spotify-settings"
import type { SpotifyStore } from "@/hooks/use-spotify"
import { compressImage, type ImageEffect, type ScenePalette, type Settings, type useSettings } from "@/lib/settings"
import { cityName, offsetLabel } from "@/lib/time"
import { cn } from "@/lib/utils"
import { LANGS, translator, type Lang, type TKey } from "@/lib/i18n"

const PALETTES: { id: ScenePalette; name: string; swatch: string }[] = [
  { id: "aurora", name: "Aurora", swatch: "from-indigo-500 to-cyan-400" },
  { id: "sunset", name: "Sunset", swatch: "from-rose-500 to-amber-400" },
  { id: "ocean", name: "Ocean", swatch: "from-sky-500 to-emerald-400" },
  { id: "mono", name: "Mono", swatch: "from-zinc-500 to-zinc-100" },
]

const IMAGE_EFFECTS: { id: ImageEffect; label: TKey; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "none", label: "effectNone", icon: PauseIcon },
  { id: "drift", label: "effectDrift", icon: MoveIcon },
  { id: "parallax", label: "effectParallax", icon: MousePointer2Icon },
  { id: "liquid", label: "effectLiquid", icon: WavesIcon },
  { id: "ripple", label: "effectRipple", icon: DropletsIcon },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={htmlFor} className="font-normal">
        {label}
      </Label>
      {children}
    </div>
  )
}

export function SettingsSheet({
  open,
  onOpenChange,
  store,
  spotify,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  store: ReturnType<typeof useSettings>
  spotify: SpotifyStore
}) {
  const { settings: s, update, reset, image, setImage } = store
  const { theme, setTheme } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)
  const t = translator(s.lang)
  const tzText = { searchPlaceholder: t("searchCity"), emptyText: t("noTimezone") }
  const isWorkPreset =
    !s.progressTitle && !s.progressTextBefore && !s.progressTextDuring && !s.progressTextAfter && s.progressScale === 1
  const isExamPreset =
    s.progressTitle === t("examTitle") &&
    s.progressTextBefore === t("examBefore") &&
    s.progressTextDuring === t("examDuring") &&
    s.progressTextAfter === t("examAfter")

  const set =
    <K extends keyof Settings>(key: K) =>
    (v: Settings[K]) =>
      update(key, v)

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const dataUrl = await compressImage(file)
      if (!setImage(dataUrl)) {
        toast.error(t("imageTooLarge"))
        return
      }
      update("backgroundMode", "image")
      toast.success(t("imageSet"))
    } catch {
      toast.error(t("imageInvalid"))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle>{t("settings")}</SheetTitle>
          <SheetDescription>{t("settingsDesc")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-8 p-4">
          <Section title={t("language")}>
            <Tabs value={s.lang} onValueChange={(v) => update("lang", v as Lang)}>
              <TabsList className="w-full">
                {LANGS.map((l) => (
                  <TabsTrigger key={l.id} value={l.id}>
                    {l.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </Section>

          <Section title={t("theme")}>
            <Tabs value={theme ?? "system"} onValueChange={setTheme}>
              <TabsList className="w-full">
                <TabsTrigger value="light">
                  <SunIcon /> {t("themeLight")}
                </TabsTrigger>
                <TabsTrigger value="dark">
                  <MoonIcon /> {t("themeDark")}
                </TabsTrigger>
                <TabsTrigger value="system">
                  <MonitorIcon /> {t("themeSystem")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Section>

          <Separator />

          <Section title={t("mode")}>
            <Tabs value={s.mode} onValueChange={(v) => update("mode", v as Settings["mode"])}>
              <TabsList className="w-full">
                <TabsTrigger value="clock">
                  <ClockIcon /> {t("modeClock")}
                </TabsTrigger>
                <TabsTrigger value="countdown">
                  <TimerIcon /> {t("modeCountdown")}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </Section>

          <Separator />

          <Section title={t("time")}>
            <div className="space-y-2">
              <Label className="font-normal">{t("mainTimezone")}</Label>
              <TimezonePicker value={s.timezone} onChange={set("timezone")} placeholder={t("pickTimezone")} {...tzText} />
            </div>
            <Row label={t("hour12")} htmlFor="h12">
              <Switch id="h12" checked={s.hour12} onCheckedChange={set("hour12")} />
            </Row>
            <Row label={t("showSeconds")} htmlFor="sec">
              <Switch id="sec" checked={s.showSeconds} onCheckedChange={set("showSeconds")} />
            </Row>
            <Row label={t("showDate")} htmlFor="date">
              <Switch id="date" checked={s.showDate} onCheckedChange={set("showDate")} />
            </Row>
            <div className="space-y-3">
              <Row label={t("clockSize")}>
                <span className="text-xs tabular-nums text-muted-foreground">{Math.round(s.clockScale * 100)}%</span>
              </Row>
              <Slider min={0.5} max={1.5} step={0.05} value={[s.clockScale]} onValueChange={([v]) => update("clockScale", v)} />
            </div>
          </Section>

          <Separator />

          <Section title={t("otherCities")}>
            {s.extraZones.length > 0 && (
              <ul className="space-y-2">
                {s.extraZones.map((z) => (
                  <li key={z} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span>
                      {cityName(z)} <span className="text-xs text-muted-foreground">{offsetLabel(z)}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${t("remove")} ${cityName(z)}`}
                      onClick={() => update("extraZones", s.extraZones.filter((x) => x !== z))}
                    >
                      <XIcon />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {s.extraZones.length < 6 && (
              <TimezonePicker
                placeholder={t("addCity")}
                {...tzText}
                exclude={s.extraZones}
                onChange={(z) => update("extraZones", [...s.extraZones, z])}
              />
            )}
          </Section>

          <Separator />

          <Section title={t("workHours")}>
            <Row label={t("showProgress")} htmlFor="work">
              <Switch id="work" checked={s.showWorkHours} onCheckedChange={set("showWorkHours")} />
            </Row>
            {s.showWorkHours && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ws" className="text-xs font-normal text-muted-foreground">
                    {t("workStart")}
                  </Label>
                  <Input id="ws" type="time" value={s.workStart} onChange={(e) => update("workStart", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="we" className="text-xs font-normal text-muted-foreground">
                    {t("workEnd")}
                  </Label>
                  <Input id="we" type="time" value={s.workEnd} onChange={(e) => update("workEnd", e.target.value)} />
                </div>
              </div>
            )}
            {s.showWorkHours && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Label className="font-normal">{t("preset")}</Label>
                  <div className="flex gap-1.5">
                    <Button
                      variant={isWorkPreset ? "default" : "outline"}
                      size="sm"
                      aria-pressed={isWorkPreset}
                      onClick={() => {
                        update("progressTitle", "")
                        update("progressTextBefore", "")
                        update("progressTextDuring", "")
                        update("progressTextAfter", "")
                        update("progressScale", 1)
                      }}
                    >
                      <BriefcaseIcon /> {t("presetWork")}
                    </Button>
                    <Button
                      variant={isExamPreset ? "default" : "outline"}
                      size="sm"
                      aria-pressed={isExamPreset}
                      onClick={() => {
                        update("progressTitle", t("examTitle"))
                        update("progressTextBefore", t("examBefore"))
                        update("progressTextDuring", t("examDuring"))
                        update("progressTextAfter", t("examAfter"))
                        update("progressScale", 2)
                      }}
                    >
                      <PencilLineIcon /> {t("presetExam")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Row label={t("progressSize")}>
                    <span className="text-xs tabular-nums text-muted-foreground">{Math.round(s.progressScale * 100)}%</span>
                  </Row>
                  <Slider min={0.75} max={3} step={0.05} value={[s.progressScale]} onValueChange={([v]) => update("progressScale", v)} />
                </div>

                <div className="space-y-2.5">
                  <Label className="font-normal">{t("progressTexts")}</Label>
                  {(
                    [
                      ["progressTitle", "progressTitle", t("examTitle")],
                      ["progressTextBefore", "textBefore", t("startsIn", { d: "{left}" })],
                      ["progressTextDuring", "textDuring", t("leftUntilEnd", { d: "{left}" })],
                      ["progressTextAfter", "textAfter", t("workDone")],
                    ] as const
                  ).map(([key, label, placeholder]) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={key} className="text-xs font-normal text-muted-foreground">
                        {t(label)}
                      </Label>
                      <Input
                        id={key}
                        value={s[key]}
                        placeholder={placeholder}
                        onChange={(e) => update(key, e.target.value)}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">{t("textHint")}</p>
                </div>
              </>
            )}
          </Section>

          <Separator />

          <Section title={t("background")}>
            <Tabs value={s.backgroundMode} onValueChange={(v) => update("backgroundMode", v as Settings["backgroundMode"])}>
              <TabsList className="w-full">
                <TabsTrigger value="three">{t("scene3d")}</TabsTrigger>
                <TabsTrigger value="image" disabled={!image}>
                  <ImageIcon /> {t("image")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {s.backgroundMode === "three" && (
              <>
                <div className="grid grid-cols-4 gap-2">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => update("palette", p.id)}
                      className={cn(
                        "group flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-colors hover:bg-muted",
                        s.palette === p.id && "border-foreground/60 bg-muted"
                      )}
                    >
                      <span className={cn("h-8 w-full rounded-md bg-gradient-to-br", p.swatch)} />
                      {p.name}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  <Row label={t("waveSpeed")}>
                    <span className="text-xs tabular-nums text-muted-foreground">{s.sceneSpeed.toFixed(1)}×</span>
                  </Row>
                  <Slider min={0} max={3} step={0.1} value={[s.sceneSpeed]} onValueChange={([v]) => update("sceneSpeed", v)} />
                </div>
              </>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onFile(e.target.files?.[0])
                e.target.value = ""
              }}
            />

            {image ? (
              <div className="space-y-4">
                <div
                  className="relative aspect-video overflow-hidden rounded-lg border bg-cover bg-center"
                  style={{ backgroundImage: `url(${image})` }}
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
                    <UploadIcon /> {t("changeImage")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImage(null)
                      update("backgroundMode", "three")
                    }}
                  >
                    <Trash2Icon /> {t("deleteImage")}
                  </Button>
                </div>
                {s.backgroundMode === "image" && (
                  <>
                    <div className="space-y-2">
                      <Label className="font-normal">{t("imageEffect")}</Label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {IMAGE_EFFECTS.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => update("imageEffect", e.id)}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] leading-tight transition-colors hover:bg-muted",
                              s.imageEffect === e.id && "border-foreground/60 bg-muted"
                            )}
                          >
                            <e.icon className="size-4" />
                            {t(e.label)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {s.imageEffect !== "none" && (
                      <div className="space-y-3">
                        <Row label={t("effectStrength")}>
                          <span className="text-xs tabular-nums text-muted-foreground">{s.imageEffectStrength.toFixed(1)}×</span>
                        </Row>
                        <Slider
                          min={0.2}
                          max={2}
                          step={0.1}
                          value={[s.imageEffectStrength]}
                          onValueChange={([v]) => update("imageEffectStrength", v)}
                        />
                      </div>
                    )}
                    <Row label={t("particles")} htmlFor="img-particles">
                      <Switch id="img-particles" checked={s.imageParticles} onCheckedChange={set("imageParticles")} />
                    </Row>
                    <Row label={t("grain")} htmlFor="img-grain">
                      <Switch id="img-grain" checked={s.imageGrain} onCheckedChange={set("imageGrain")} />
                    </Row>
                    <div className="space-y-3">
                      <Row label={t("dim")}>
                        <span className="text-xs tabular-nums text-muted-foreground">{s.imageDim}%</span>
                      </Row>
                      <Slider min={0} max={90} step={1} value={[s.imageDim]} onValueChange={([v]) => update("imageDim", v)} />
                    </div>
                    <div className="space-y-3">
                      <Row label={t("blur")}>
                        <span className="text-xs tabular-nums text-muted-foreground">{s.imageBlur}px</span>
                      </Row>
                      <Slider min={0} max={30} step={1} value={[s.imageBlur]} onValueChange={([v]) => update("imageBlur", v)} />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  onFile(e.dataTransfer.files?.[0])
                }}
                className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                <UploadIcon className="size-5" />
                {t("uploadHint")}
              </button>
            )}
          </Section>

          <Separator />

          <Section title={t("spotify")}>
            <Row label={t("spotifyShow")} htmlFor="sp-show">
              <Switch id="sp-show" checked={s.showSpotify} onCheckedChange={set("showSpotify")} />
            </Row>
            <SpotifySettings spotify={spotify} t={t} />
          </Section>

          <Separator />

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => {
              reset()
              toast(t("resetDone"))
            }}
          >
            {t("reset")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
