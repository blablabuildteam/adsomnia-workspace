# Slack integration (distributable app)

Create Slack channels from **Project Setup** using a distributable Slack app. Install it in your Adsomnia/partner Slack first; later install the same app in a client workspace and pick that workspace in the UI.

## Identity model

| Piece | Meaning |
|-------|---------|
| **Workspace install** | Shared bot token for a Slack team (`slack_workspaces`) — first Connect installs the app |
| **User link** | Each Adsomnia user who creates channels Connects Slack **once** → we store their Slack user id (`slack_user_links`) |
| **Create channel** | Uses the bot to create the channel, then invites **the current user’s** linked Slack id |

Later, Google login only changes how Adsomnia knows who you are; the Slack link stays per user.

## Create the Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**.
2. Under **Manage Distribution**, activate public distribution (unlisted is fine). Do **not** leave the app as Internal-only — that locks it to one workspace.
3. **OAuth & Permissions** → Bot Token Scopes:
   - `channels:manage`
   - `channels:read`
   - `groups:write`
   - `groups:read`
   - `chat:write`
   - `bookmarks:write` (channel bookmarks for Drive / Jira links)
   - `im:write` (submitter DMs)
   - `users:read`
   - `users:read.email` (resolve submitter by Workspace email)
4. **Redirect URL** (HTTPS required — Slack rejects `http://localhost`):
   - Production: `https://adsomnia-workspace.vercel.app/api/integrations/slack/oauth/callback`
   - Local Slack OAuth: `https://localhost:3000/api/integrations/slack/oauth/callback` — only when running `npm run dev:https`. Default `npm run dev` is HTTP, so Connect Slack will not work locally.
5. Copy **Client ID**, **Client Secret**, and **Signing Secret** into env (below).

No Slack app setting changes are required for per-user linking beyond the scopes above — each user reuses the same OAuth install URL; Slack returns `authed_user.id` for whoever clicks Approve.

## Environment variables

| Variable | Scope | Purpose |
|----------|-------|---------|
| `SLACK_CLIENT_ID` | Server | Slack app Client ID |
| `SLACK_CLIENT_SECRET` | Server | Slack app Client Secret |
| `SLACK_SIGNING_SECRET` | Server | Reserved for future request verification |
| `SLACK_NOTIFICATIONS_TEAM_ID` | Server | Home Slack workspace `team_id` for submitter DMs (blablabuild now; Adsomnia later) |
| `NEXT_PUBLIC_APP_URL` | Public | App origin used to build the OAuth redirect URI (no trailing slash) |

Example `.env.local` entries:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_SIGNING_SECRET=
SLACK_NOTIFICATIONS_TEAM_ID=
```

`SLACK_NOTIFICATIONS_TEAM_ID` is the Slack `team_id` already stored on `slack_workspaces` after Connect. DMs go only to that workspace; client Slack installs stay for channel creation. After adding DM scopes, **Reconnect Slack** once so the stored bot token picks them up.

On Vercel, production/preview should use `https://adsomnia-workspace.vercel.app` for `NEXT_PUBLIC_APP_URL`.

## Connect (workspace + your Slack user)

1. Sign in as a user who can manage Project Setup.
2. Open an initiative in **Project Setup** → Kickoff Preparation → **Create Slack Channel** (after Google Drive and Jira are set up).
3. Click **Connect Slack** / **Connect My Slack Account**.
4. Approve while logged into the **Slack account you want invited** to new channels.
5. We store the workspace bot (if new) and your personal Slack user link.

Other Setup users each Connect once for the same workspace so *they* get invited when *they* create channels.

## Create a channel

1. Choose the Slack workspace (if more than one is connected).
2. Enter a channel name (suggested slug is prefilled).
3. Choose **Public** or **Private** (default Public).
4. Click **Create Channel**.

The tool creates the channel, invites you, bookmarks the project **Google Drive** and **Jira** URLs, stores ids/urls on `setupData.slack`, and sets `onboardingData.links.slackChannelUrl`. Slack creation lives in Kickoff Preparation so those links already exist.

**Confirm existing** remains available if the channel was created outside the tool.

### Finding channels in Slack

- Channels are created in the **workspace shown in the picker** (e.g. blablabuild), not necessarily another Slack org you also use.
- The sidebar often shows only channels you have **joined**. Use **Browse channels** (or the channel deep link from Project Setup) to find a new public channel if you were not invited yet.
- Private channels are invisible until you are invited — that is why per-user Connect + invite matters.

## Submitter notifications

The bot DMs the initiative **submitter** on the home workspace (`SLACK_NOTIFICATIONS_TEAM_ID`) after leadership leaves a remark or the workstream advances. Resolution: `users.email` via `users.lookupByEmail`, with `slack_user_links` as fallback. The actor is skipped when they are the submitter. Slack errors never fail the approval.

**Feedback / decision remark**

- Initiative: feedback, reject, on hold
- Validation: feedback, reject, on hold
- Go/No-Go: feedback, reject
- Fast-Track conversion

**Phase advanced**

- Initiative → Validation
- Validation → Scoping
- Go/No-Go → Project Setup
- Project Setup → Onboarding & Kickoff
- Onboarding → Production & Reporting

Submitter-driven submits and informal comments are not notified.

Each DM includes ticket id, title, remark (when present), actor name, and a button to `/workstreams/{id}`.

## Switch to a client Slack later

1. Client Slack admin installs the **same** Slack app (OAuth).
2. A new row appears in `slack_workspaces`.
3. Each creator Connects once for that workspace, then picks it when creating channels.

## Move notifications to Adsomnia Slack later

Code does not assume who owns the Slack app. Switching environments is env + reconnect:

1. Recreate the same app under Adsomnia’s Slack developer account (same scopes + redirect URLs above).
2. Swap `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_SIGNING_SECRET`.
3. Reconnect Slack so `slack_workspaces` gets their bot token.
4. Point `SLACK_NOTIFICATIONS_TEAM_ID` at the Adsomnia team id.

## Out of scope (v1)

- Auto-invite the full project team by email
- Slash commands / bot mention replies / Events API
- Encrypting bot tokens at rest
