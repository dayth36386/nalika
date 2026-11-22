"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { LogOutIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpotifyGlyph } from "@/components/now-playing"
import type { SpotifyStore } from "@/hooks/use-spotify"
import type { T } from "@/lib/i18n"
import { isOnLocalhostAlias, redirectUri } from "@/lib/spotify"

export function SpotifySettings({ spotify, t }: { spotify: SpotifyStore; t: T }) {
  const { status, profile, configured, connect, disconnect } = spotify
  const [loopbackUrl, setLoopbackUrl] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window-only value
    if (isOnLocalhostAlias()) setLoopbackUrl(redirectUri())
  }, [])

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

  if (!configured) {
    return <p className="text-xs text-muted-foreground">{t("spotifyNotConfigured")}</p>
  }

  return (
    <div className="space-y-3">
      {/* Dev only: Spotify rejects "localhost" redirect URIs */}
      {loopbackUrl && (
        <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
          <span>
            {t("spotifyLocalhost")}
            <a className="font-mono underline underline-offset-2" href={loopbackUrl}>
              {loopbackUrl}
            </a>
          </span>
        </div>
      )}

      <Button
        className="w-full bg-[#1DB954] text-black hover:bg-[#1ed760]"
        disabled={!!loopbackUrl || status === "connecting"}
        onClick={async () => {
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
