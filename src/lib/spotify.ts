"use client"

/**
 * Spotify Web API via Authorization Code + PKCE, entirely in the browser (no backend, no client secret).
 * Tokens live in localStorage. Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

const AUTH_URL = "https://accounts.spotify.com/authorize"
const TOKEN_URL = "https://accounts.spotify.com/api/token"
const API = "https://api.spotify.com/v1"

const TOKEN_KEY = "work-clock:spotify-token"
const CLIENT_KEY = "work-clock:spotify-client-id"
const VERIFIER_KEY = "work-clock:spotify-verifier"
const STATE_KEY = "work-clock:spotify-state"

export const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-private",
].join(" ")

type Token = { access: string; refresh: string; expiresAt: number }

export type Track = {
  id: string
  title: string
  artists: string
  album: string
  image?: string
  url?: string
  durationMs: number
  progressMs: number
  isPlaying: boolean
  fetchedAt: number
}

export type Profile = { name: string; premium: boolean }

const ls = {
  get(k: string) {
    try {
      return window.localStorage.getItem(k)
    } catch {
      return null
    }
  },
  set(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v)
    } catch {}
  },
  del(k: string) {
    try {
      window.localStorage.removeItem(k)
    } catch {}
  },
}

/** Spotify rejects "localhost"; loopback must be the literal 127.0.0.1. */
export function redirectUri() {
  const { protocol, hostname, port } = window.location
  const host = hostname === "localhost" ? "127.0.0.1" : hostname
  return `${protocol}//${host}${port ? `:${port}` : ""}/`
}

export function isOnLocalhostAlias() {
  return window.location.hostname === "localhost"
}

/** Set at build time from NEXT_PUBLIC_SPOTIFY_CLIENT_ID (.env.local locally, GitHub secret in CI). */
export function getClientId() {
  return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || ""
}

/** Drop the Client ID older versions stored in the browser. */
export function clearLegacyClientId() {
  ls.del(CLIENT_KEY)
}

function readToken(): Token | null {
  const raw = ls.get(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Token
  } catch {
    return null
  }
}

function saveToken(j: { access_token: string; refresh_token?: string; expires_in: number }, prevRefresh?: string) {
  const t: Token = {
    access: j.access_token,
    refresh: j.refresh_token ?? prevRefresh ?? "",
    expiresAt: Date.now() + (j.expires_in - 60) * 1000,
  }
  ls.set(TOKEN_KEY, JSON.stringify(t))
  return t
}

export function hasToken() {
  return !!readToken()
}

export function logout() {
  ls.del(TOKEN_KEY)
}

function base64url(bytes: Uint8Array) {
  let s = ""
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function randomString(len = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return base64url(bytes).slice(0, len)
}

export async function startLogin() {
  const clientId = getClientId()
  if (!clientId) throw new Error("missing-client-id")
  const verifier = randomString(64)
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))))
  const state = randomString(16)
  ls.set(VERIFIER_KEY, verifier)
  ls.set(STATE_KEY, state)

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    redirect_uri: redirectUri(),
    state,
  })
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- external Spotify URL
  window.location.href = `${AUTH_URL}?${params}`
}

/** If the URL carries ?code=… from Spotify, exchange it. Returns "ok" | "error" | null (nothing to do). */
export async function handleRedirect(): Promise<"ok" | "error" | null> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get("code")
  const error = url.searchParams.get("error")
  const state = url.searchParams.get("state")
  if (!code && !error) return null

  // strip auth params from the address bar
  url.searchParams.delete("code")
  url.searchParams.delete("error")
  url.searchParams.delete("state")
  window.history.replaceState(null, "", url.pathname + url.search + url.hash)

  const expectedState = ls.get(STATE_KEY)
  const verifier = ls.get(VERIFIER_KEY)
  ls.del(STATE_KEY)
  ls.del(VERIFIER_KEY)
  if (error || !code || !verifier || state !== expectedState) return "error"

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      client_id: getClientId(),
      code_verifier: verifier,
    }),
  })
  if (!res.ok) return "error"
  saveToken(await res.json())
  return "ok"
}

async function refresh(t: Token): Promise<Token | null> {
  if (!t.refresh) return null
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: t.refresh, client_id: getClientId() }),
  })
  if (!res.ok) {
    logout()
    return null
  }
  return saveToken(await res.json(), t.refresh)
}

async function accessToken(): Promise<string | null> {
  let t = readToken()
  if (!t) return null
  if (Date.now() >= t.expiresAt) t = await refresh(t)
  return t?.access ?? null
}

export class SpotifyAuthError extends Error {}

async function api(path: string, init?: RequestInit, retry = true): Promise<Response> {
  const token = await accessToken()
  if (!token) throw new SpotifyAuthError("not-authenticated")
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 && retry) {
    const t = readToken()
    if (t && (await refresh(t))) return api(path, init, false)
    throw new SpotifyAuthError("expired")
  }
  return res
}

export async function getProfile(): Promise<Profile | null> {
  const res = await api("/me")
  if (!res.ok) return null
  const j = await res.json()
  return { name: j.display_name || j.id, premium: j.product === "premium" }
}

type SpotifyImage = { url: string; width: number }

export async function getCurrentlyPlaying(): Promise<Track | null> {
  const res = await api("/me/player/currently-playing?additional_types=episode")
  if (res.status === 204 || !res.ok) return null
  const j = await res.json()
  const item = j.item
  if (!item) return null
  const isEpisode = item.type === "episode"
  const images: SpotifyImage[] = (isEpisode ? item.images : item.album?.images) ?? []
  const image = [...images].sort((a, b) => a.width - b.width).find((i) => i.width >= 128)?.url ?? images[0]?.url
  return {
    id: item.id,
    title: item.name,
    artists: isEpisode ? item.show?.name ?? "" : item.artists.map((a: { name: string }) => a.name).join(", "),
    album: isEpisode ? "" : item.album?.name ?? "",
    image,
    url: item.external_urls?.spotify,
    durationMs: item.duration_ms,
    progressMs: j.progress_ms ?? 0,
    isPlaying: !!j.is_playing,
    fetchedAt: Date.now(),
  }
}

/** Playback control needs Spotify Premium. Returns false on failure. */
export async function control(action: "play" | "pause" | "next" | "previous") {
  const method = action === "play" || action === "pause" ? "PUT" : "POST"
  const res = await api(`/me/player/${action}`, { method })
  return res.ok
}
