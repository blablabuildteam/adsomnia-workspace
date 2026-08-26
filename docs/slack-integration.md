# Slack integration (distributable app)

Create Slack channels from **Project Setup** using a distributable Slack app. Install it in your Adsomnia workspace first; later install the same app in a client workspace and pick that workspace in the UI.

## Create the Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**.
2. Under **Manage Distribution**, activate public distribution (unlisted is fine). Do **not** leave the app as Internal-only — that locks it to one workspace.
3. **OAuth & Permissions** → Bot Token Scopes:
   - `channels:manage`
   - `channels:read`
   - `groups:write`
   - `groups:read`
   - `chat:write`
4. **Redirect URL**:
   - Local: `http://localhost:3000/api/integrations/slack/oauth/callback`
   - Production: `https://<your-domain>/api/integrations/slack/oauth/callback`
5. Copy **Client ID**, **Client Secret**, and **Signing Secret** into env (below).

## Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `SLACK_CLIENT_ID` | Server | Slack app Client ID |
| `SLACK_CLIENT_SECRET` | Server | Slack app Client Secret |
| `SLACK_SIGNING_SECRET` | Server | Reserved for future request verification |
| `NEXT_PUBLIC_APP_URL` | Public | App origin used to build the OAuth redirect URI (no trailing slash) |

Example `.env.local` entries:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
```

On Vercel, set the same keys for Production / Preview / Development. `NEXT_PUBLIC_APP_URL` must match the deployment URL that Slack will redirect to (or use a stable production domain).

## Connect a workspace

1. Sign in as a user who can manage Project Setup (leadership / Head of Production).
2. Open an initiative in **Project Setup** → **Create Slack Channel**.
3. Click **Connect Slack** and approve the app install.
4. The install is stored in `slack_workspaces` (bot token + team id/name).

## Create a channel

1. Choose the Slack workspace (if more than one is connected).
2. Enter a channel name (suggested slug is prefilled).
3. Choose **Public** or **Private** (default Public).
4. Click **Create Channel**.

The tool calls Slack `conversations.create`, stores `channelId` / `channelUrl` / `teamId` on `setupData.slack`, and writes `onboardingData.links.slackChannelUrl` for deep links in Invite Team / Onboarding.

**Confirm existing** remains available if the channel was created outside the tool.

## Switch to a client Slack later

1. Client Slack admin installs the **same** Slack app (OAuth).
2. A new row appears in `slack_workspaces`.
3. In Project Setup, pick their workspace when creating channels.

No code change required if bot scopes stay the same.

## Out of scope (v1)

- Auto-invite team members by email
- Slash commands / bot mention replies / Events API
- Encrypting bot tokens at rest
