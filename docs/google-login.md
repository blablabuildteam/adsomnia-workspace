# Google login (Workspace SSO)

Sign in with Google on `/login`. Uses a dedicated OAuth Web client (not the Drive Picker client). After Google verifies the account, the app checks an allowed-domain list and matches an **existing** user by email, then creates the same JWT session cookie as password login.

## Identity model

| Piece | Meaning |
|-------|---------|
| **OAuth client** | Separate Web application credentials for login (`GOOGLE_LOGIN_CLIENT_ID` / `SECRET`) |
| **Domain allowlist** | `GOOGLE_ALLOWED_DOMAINS` — comma-separated (e.g. `adsomnia.com,blablabuild.com`) |
| **User match** | Allowed-domain Google accounts are matched or **created** on first login (`team` by default) |
| **Profile signup** | Users missing first name, last name, or job title are sent to `/complete-profile` before the workspace (required after Google or password login) |
| **Admins** | Emails in `LOGIN_*_EMAIL` (Adsomnia Sietse/Oleg/Jasper/Coen + blablabuild Xennith/Kevin) are assigned `leadership` on Google login (create or promote) |
| **Session** | Same `adsomnia-session` cookie via `createSession()` |

Drive Picker keeps using `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — do not reuse that client for login.

## Google Cloud setup

Use the existing **Adsomnia** Google Cloud project.

1. **APIs & Services → OAuth consent screen** (project configuration wizard if shown)
   - App name: `Adsomnia Workspace`
   - Support / developer emails: Adsomnia addresses you monitor
   - Audience: **Internal** for Adsomnia-only testing; switch to **External** before non-Adsomnia Workspace domains (e.g. `blablabuild.com`) can complete Google sign-in
   - Scopes: `openid`, `email`, `profile` only
2. **Credentials → Create OAuth client ID → Web application**
   - Name: e.g. `Adsomnia Workspace Login`
   - Authorized JavaScript origins: `http://localhost:3000` and production origin
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback`
     - `http://localhost:3001/api/auth/google/callback` (if port 3000 is already in use)
     - `https://<prod-host>/api/auth/google/callback`
3. Copy Client ID and Client secret into env (below).

## Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `GOOGLE_LOGIN_CLIENT_ID` | Server | Login OAuth Client ID |
| `GOOGLE_LOGIN_CLIENT_SECRET` | Server | Login OAuth Client secret |
| `GOOGLE_ALLOWED_DOMAINS` | Server | Comma-separated email domains allowed after Google auth |
| `LOGIN_*_EMAIL` | Server | Leadership admin emails (Sietse/Oleg/Jasper/Coen/Xennith/Kevin) — assigned `leadership` on Google login |
| `NEXT_PUBLIC_APP_URL` | Public | App origin used to build the redirect URI (no trailing slash) |

Example `.env.local` entries:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_LOGIN_CLIENT_ID=
GOOGLE_LOGIN_CLIENT_SECRET=
GOOGLE_ALLOWED_DOMAINS=adsomnia.com,blablabuild.com
```

Sync to Vercel with `npm run env:sync-vercel` after the keys are in `.env.local`.

## Routes

| Path | Role |
|------|------|
| `/api/auth/google/start` | Redirects to Google authorize |
| `/api/auth/google/callback` | Exchanges code, allowlists domain, looks up user, sets session |

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| `Error 400: redirect_uri_mismatch` | Google received a callback URL that is not on the OAuth client. Local login uses `http://localhost:3000/api/auth/google/callback` (`npm run dev` is HTTP). Add that exact URI (and `http://localhost:3000` as a JavaScript origin) on the **Adsomnia Workspace Login** client. Click **error details** on the Google page to see the URI that was sent. |
| `This action with HTTP GET is not supported by NextAuth.js` | Another app is running on port 3000 (often a different Next.js project with NextAuth). Stop it and restart this app on `:3000`, **or** add `http://localhost:3001/api/auth/google/callback` to the Google OAuth client redirect URIs and use `http://localhost:3001` locally. In dev, OAuth now uses the port you are actually on. |
| Google sign-in fails after account picker | Confirm the redirect URI in Google Cloud matches the port you use (`3000` vs `3001`). |
| Domain not allowed | Add the email domain to `GOOGLE_ALLOWED_DOMAINS`. |

## Opening additional Workspaces

1. Ensure consent is **External** (Internal blocks non-Adsomnia Google Workspace accounts).
2. Add the domain to `GOOGLE_ALLOWED_DOMAINS`.
3. Seed (or insert) a `users` row whose `email` matches the Google account exactly.
4. Add production redirect URI / origin if the host changes.

No second OAuth client is required per Workspace.
