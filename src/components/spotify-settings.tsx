"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { CopyIcon, LogOutIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SpotifyGlyph } from "@/components/now-playing"
import type { SpotifyStore } from "@/hooks/use-spotify"
import type { T } from "@/lib/i18n"
import { isOnLocalhostAlias, redirectUri } from "@/lib/spotify"

export function SpotifySettings({ spotify, t }: { spotify: SpotifyStore; t: T }) {
  const { status, profile, clientId, saveClientId, connect, disconnect } = spotify
  const [draft, setDraft] = useState(clientId)
  const [uri, setUri] = useState("")
  const [onLocalhost, setOnLocalhost] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window-only values
    setUri(redirectUri())
    setOnLocalhost(isOnLocalhostAlias())
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync draft when stored id loads
    setDraft(clientId)
  }, [clientId])

  if (status === "connected" && profile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <SpotifyGlyph className="size-4 shrink-0 text-[#1DB954]" />
            <span className="truncate">{t("spotifyConnectedAs", { name: profile.name })}</span>
          </span>
          <Button variant="ghost" size="sm" onClick={disconnect}>
            <LogOutIcon /> {t("spotifyDisconnect")}
          </Button>
        </div>
        {!profile.premium && <p className="text-xs text-muted-foreground">{t("spotifyFreeNote")}</p>}
      </div>
    )
  }

  const fixedUrl = uri // redirectUri() already rewrites localhost -> 127.0.0.1

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("spotifyClientIdHint")}</p>
      <div className="flex gap-2">
        <Input readOnly value={uri} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <Button
          variant="outline"
          size="icon"
          aria-label="Copy"
          onClick={() => {
            navigator.clipboard?.writeText(uri).then(() => toast(t("copied")), () => {})
          }}
        >
          <CopyIcon />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sp-client" className="text-xs font-normal text-muted-foreground">
          {t("spotifyClientId")}
        </Label>
        <Input
          id="sp-client"
          value={draft}
          placeholder="e.g. 1a2b3c4d5e6f…"
          className="font-mono text-xs"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => saveClientId(draft)}
        />
      </div>

      {onLocalhost && (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <span>
            {t("spotifyLocalhost")}
            <a className="font-mono underline underline-offset-2" href={fixedUrl}>
              {fixedUrl}
            </a>
          </span>
        </div>
      )}

      <Button
        className="w-full bg-[#1DB954] text-black hover:bg-[#1ed760]"
        disabled={!draft.trim() || onLocalhost || status === "connecting"}
        onClick={async () => {
          saveClientId(draft)
          try {
            await connect()
          } catch {
            toast.error(t("spotifyConnectError"))
          }
        }}
      >
        <SpotifyGlyph className="size-4" /> {t("spotifyConnect")}
      </Button>
    </div>
  )
}
