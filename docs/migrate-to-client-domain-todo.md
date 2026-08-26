# Migrate to client domain — to-do

- Update Slack app **Redirect URLs** at [api.slack.com/apps](https://api.slack.com/apps) → OAuth & Permissions to `https://<client-domain>/api/integrations/slack/oauth/callback` (keep localhost if still needed for local dev)
- Switch / select the **client Slack workspace** in Project Setup (client admin installs the same distributable app first if not already connected)
- Point Vercel production to the client custom domain (DNS + SSL) and confirm the app loads on that host
- Set Production `NEXT_PUBLIC_APP_URL` to `https://<client-domain>` (no trailing slash) and redeploy so Slack OAuth builds the correct redirect URI
- Update URLs under the **OAuth 2.0 Client ID** in Google Cloud → APIs & Services → Credentials: set **Authorized JavaScript origins** (and any redirect URIs) to `https://<client-domain>` for Drive Picker
- Create / update the **OAuth 2.0 Client ID** for workspace Drive credentials in Google Cloud → APIs & Services → Credentials, then set Production `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (and API key if needed) for the client domain
- Smoke-test: login, Slack Connect OAuth, create channel in client workspace, Google Drive attach
- Remove or leave old `*.vercel.app` Slack redirect URL only if you still need preview/fallback; otherwise drop it to avoid wrong-origin installs
