# Work Clock

A full-screen clock to keep open while you work. Next.js 16 + shadcn/ui + Three.js (React Three Fiber). No login; all settings live in `localStorage`.

## Features
- Large clock + date for any time zone, plus up to 6 extra cities
- Languages: ไทย / 中文 / English / 日本語 (UI and date format)
- Background: animated 3D wave scene (4 palettes, adjustable speed) or your own image (darken/blur)
- Dark / Light / System theme
- Work-hours progress bar (start/end time)
- Fullscreen, controls auto-hide after 3 s

Shortcuts: `F` fullscreen · `S` settings · `T` toggle theme

## Run
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Spotify "now playing"
Runs fully in the browser (OAuth Authorization Code + PKCE, no backend, no client secret). Tokens are kept in `localStorage`.

1. Go to https://developer.spotify.com/dashboard → **Create app** (select *Web API*).
2. Add Redirect URI **`http://127.0.0.1:3000/`** — Spotify no longer accepts `localhost`, so open the app at `http://127.0.0.1:3000` too. For a deployed site use `https://your-domain/`.
3. Put the **Client ID** in `.env.local` as `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` (see `.env.example`). In CI it comes from the GitHub secret `SPOTIFY_CLIENT_ID`.
4. Settings → Spotify → **Connect Spotify**.

Notes (Spotify rules, 2026): Development-mode apps require the app owner to have **Premium** and allow up to 5 authorized users (add them under *User Management*). Play/pause/skip needs Premium and an active Spotify device.

## Deploy to Vercel (GitHub Actions)
`.github/workflows/deploy.yml` builds on GitHub and uploads to Vercel. The Spotify Client ID is read from a **GitHub secret**, so it never lives in the repo. Vercel's own Git auto-deploy is turned off in `vercel.json` to avoid double deploys.

1. Push this folder to its own GitHub repo.
2. Link a Vercel project once locally: `npx vercel link` → copy `orgId` and `projectId` from `.vercel/project.json`.
3. Create a token at https://vercel.com/account/tokens.
4. GitHub repo → Settings → Secrets and variables → Actions → add:
   - `SPOTIFY_CLIENT_ID`
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
5. Push to `main` → production deploy. Pull requests → preview deploy.
6. In the Spotify dashboard add the production Redirect URI, e.g. `https://your-app.vercel.app/`.

Note: a Spotify Client ID isn't a secret (it's visible in the login URL); keeping it in secrets just keeps it out of git.
# workclock
