# Jira integration (multi-instance API)

Adsomnia Workspace talks to **up to three separate Jira Cloud sites** via REST API (Basic auth: email + API token). Unlike Slack (OAuth install per workspace), each party’s credentials live in **server env vars** — no end-user OAuth for v1.

## Goals

| Capability | Status | Notes |
|------------|--------|-------|
| **Create Jira** in Project Setup | Done | Review space title + epics, then create on the lead party’s Cloud site; paste URL remains as fallback |
| **Store board link** on initiative | Done | `setupData.jira` (`boardUrl`, `projectKey`, `workspace`, …) |
| **Tickets per epic** | Manual confirm | Epics are seeded on create; this step is adding tickets/tasks under each epic |
| **Production Overview** (cross-board progress) | Planned | Read epics + nested task status from each lead’s Jira |

## Three instances

| Instance id | Party | Env prefix | When used |
|-------------|-------|------------|-----------|
| `adsomnia` | Adsomnia | `JIRA_ADSOMNIA_*` | Lead party Adsomnia Internal (`as` / `adsomnia`) — **connect first** |
| `btr` | Bending The Rules | `JIRA_BTR_*` | Lead party `btr` |
| `hn` | Harlem Next | `JIRA_HN_*` | Lead party `hn` |

**blablabuild (`bbb`)** has no dedicated Jira Cloud in this model. For BBB-led work, either create the board in **Adsomnia** Jira or keep the existing manual paste fallback.

Lead party is stored on the initiative as `validationData.leadProductionParty`. Mapping helpers live in `src/lib/integrations/jira.ts` (`leadPartyToJiraInstance`).

## Identity model (vs Slack / Drive)

| Piece | Slack | Drive | Jira (this) |
|-------|-------|-------|-------------|
| Auth | Distributable app OAuth | Browser GIS (user) | Shared **API token** per Cloud site |
| Where secrets live | DB (`slack_workspaces`) + app env | Browser session | **Vercel / `.env.local`** only |
| Who provisions | Slack admin installs app | Any Drive user | **Jira site admin** creates token for a service (or admin) user |
| Multi-tenant | Multiple Slack installs | Same Google client | Three env triplets (Adsomnia → BTR → HN) |

We do **not** need Atlassian org admin access ourselves. Adsomnia (then partners) create a user + API token with the right permissions and give us host / email / token to store in env.

## Environment variables

All server-only. Never prefix with `NEXT_PUBLIC_`.

| Variable | Purpose |
|----------|---------|
| `JIRA_ADSOMNIA_HOST` | Cloud host, e.g. `adsomnia.atlassian.net` (with or without `https://`) |
| `JIRA_ADSOMNIA_EMAIL` | Atlassian account email that owns the API token |
| `JIRA_ADSOMNIA_API_TOKEN` | API token from [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_BTR_HOST` / `_EMAIL` / `_API_TOKEN` | Same for Bending The Rules |
| `JIRA_HN_HOST` / `_EMAIL` / `_API_TOKEN` | Same for Harlem Next |

Example `.env.local` (Adsomnia first):

```bash
JIRA_ADSOMNIA_HOST=your-site.atlassian.net
JIRA_ADSOMNIA_EMAIL=jira-integration@adsomnia.com
JIRA_ADSOMNIA_API_TOKEN=

# Later:
# JIRA_BTR_HOST=
# JIRA_BTR_EMAIL=
# JIRA_BTR_API_TOKEN=
# JIRA_HN_HOST=
# JIRA_HN_EMAIL=
# JIRA_HN_API_TOKEN=
```

Sync to Vercel with `npm run env:sync-vercel` (keys are listed in `scripts/sync-vercel-env.ts`).

Status check: `GET /api/integrations/status` → `jira.configured` and `jira.instances`.

## Required Jira permissions (token user)

Minimum for **board create** + **Production Overview reads**:

| Permission / capability | Why |
|-------------------------|-----|
| **Browse projects** / view issues | List epics and child tasks |
| **Create team-managed projects** (`CREATE_PROJECT`) | Project Setup “Create Jira” — uses the simplified create API, not Administer Jira |
| **Browse users** (user picker) | Optional project lead search |
| Issue create / edit (optional later) | Auto-create epics from Scoping milestones |

Prefer a dedicated **service account** (named e.g. `Adsomnia Workspace`) over a personal admin login so tokens survive staff changes.

Client-facing steps: [`docs/jira-client-connect.md`](./jira-client-connect.md).

## Code & API surface (current)

| Path | Role |
|------|------|
| `src/lib/integrations/jira.ts` | Clients, create project, instance list, lead-party map, epic progress reads |
| `GET /api/integrations/jira/workspaces` | Configured instances (`canManageSetup`) |
| `POST /api/integrations/jira/create-project` | Create scrum/kanban software project |
| `GET /api/integrations/jira/users?instance=&query=` | User search for project lead |
| `src/components/initiatives/setup/JiraSetupTask.tsx` | Create Board (lead party → site) + paste fallback |
| `createAndCompleteJiraBoard` | Server action — create project, seed scoping epics, persist setup |

Persisted on complete: `setupData.jira` (`workspace`, `projectKey`, `projectId`, `boardUrl`, `projectName`, `template`).

## Lead party → board instance

During Project Setup, default the Jira instance from `leadProductionParty`:

| `leadProductionParty` | Default `JiraInstance` |
|-----------------------|------------------------|
| `as` / `adsomnia` | `adsomnia` |
| `btr` | `btr` |
| `hn` | `hn` |
| `bbb` | `null` → Adsomnia Jira or manual URL |

Only offer instances that appear in `getAvailableInstances()` (env present).

## Production Overview (planned product)

Cross-initiative view for Head of Production / leadership. For each production initiative with a stored Jira link:

1. Resolve `setupData.jira.workspace` + `projectKey` (or parse board URL).
2. Call the matching instance API.
3. Show **epics / milestones** with **start** and **end** (or due) dates and names.
4. For each epic, count nested tasks by status category: **To Do** / **In Progress** / **Done** → progress %.

Implementation sketch (in `jira.ts`):

- `listProjectEpics(instance, projectKey)` — JQL `project = KEY AND issuetype = Epic`
- `getEpicTaskProgress(instance, epicKey)` — children via parent / Epic Link; group by `statusCategory`

Date fields vary by site (Due date, Start date, Target start/end). Document the Adsomnia field keys once the first Cloud site is connected; optionally map per-instance overrides later.

## Rollout order

1. ~~**Adsomnia** — connect env and smoke-test auth / create-project permission.~~
2. ~~Wire **Create Jira Board** UI (like Slack), preselect instance from lead party, seed scoping epics.~~
3. Build **Production Overview** against Adsomnia boards first.
4. Repeat connect guide for **BTR** (HN env is already present).
5. Optional: push child tasks under seeded epics.

## Out of scope (v1)

- Atlassian OAuth / Forge apps (API token is enough)
- Encrypting tokens at rest beyond Vercel env secrecy
- Auto-invite full project team in Jira
- blablabuild-owned Jira Cloud
- Writing weekly leadership digests from Jira (Overview UI first)

## Related docs

- Client instructions: [`jira-client-connect.md`](./jira-client-connect.md)
- Slack parallel: [`slack-integration.md`](./slack-integration.md)
- Env master table: [`TECHNICAL_APPROACH.md`](./TECHNICAL_APPROACH.md) §8
