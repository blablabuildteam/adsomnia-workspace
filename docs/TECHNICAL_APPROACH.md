# Adsomnia Workspace — Technical Approach

> Living document. Updated as the system evolves through production phases.

---

## 1. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js (App Router) | 16.x | Server Components + Server Actions |
| UI | React | 19.x | RSC-first, client components where needed |
| Language | TypeScript | 5.x | Strict mode enabled |
| ORM | Drizzle ORM | latest | Type-safe, lightweight, Neon-native |
| Database | Neon Postgres | Serverless (pooled) | `DATABASE_URL` via `.env.local` |
| Styling | Tailwind CSS | 4.x | Custom theme tokens in `globals.css` |
| Icons | Lucide React | latest | Consistent icon library |
| Fonts | Sen (display) + Libre Franklin (body) | Google Fonts | Loaded via `next/font/google` |
| Email (planned) | Resend | — | Transactional email for auth & notifications |
| AI (planned) | Google Gemini | — | Chat agent and workspace assistance |

---

## 2. Database Design

### Philosophy

The `initiatives` table is the central record that evolves through the 7-stage Production Framework pipeline. Each stage adds data to the initiative rather than creating new records. Supporting tables track users, approval decisions, and an audit trail.

### Schema

#### `users`

Seeded team members. No self-registration in Phase 1.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | Primary key, auto-generated |
| `name` | `varchar(255)` | Display name |
| `email` | `varchar(255)` | Unique, used for login |
| `password_hash` | `varchar(255)` | bcrypt hash |
| `role` | `enum('leadership', 'production', 'team')` | Determines approval permissions |
| `created_at` | `timestamp` | Default `now()` |

#### `initiatives`

Core record — one per initiative/project. Grows through stages.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | Auto-increment PK |
| `ticket_id` | `varchar(20)` | Display ID, e.g. `WS-1001` |
| `title` | `varchar(500)` | From Initiative stage |
| `description` | `text` | Short description |
| `problem_statement` | `text` | From Initiative stage |
| `opportunity_solution` | `text` | From Initiative stage |
| `expected_impact` | `text` | From Initiative stage |
| `target_audience` | `varchar(500)` | From Initiative stage |
| `submitter_id` | `uuid FK → users` | Who submitted |
| `sponsor_id` | `uuid FK → users` | Leadership sponsor |
| `current_stage` | `enum(...)` | `idea`, `validation`, `scoping`, `go-nogo`, `setup`, `onboarding`, `production` |
| `status` | `enum(...)` | `draft`, `submitted`, `approved`, `rejected`, `on-hold` |
| `created_at` | `timestamp` | Default `now()` |
| `updated_at` | `timestamp` | Updated on every mutation |

> Future phases will add columns for Validation data (business value, T-shirt size, priority, etc.), Scoping data (lead party, epic timeline, role hours), and Go/No-Go decisions.

#### `approvals`

Tracks every approval/rejection decision at stage gates.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | Primary key |
| `initiative_id` | `integer FK → initiatives` | Which initiative |
| `approver_id` | `uuid FK → users` | Who approved/rejected |
| `from_stage` | `varchar(50)` | Stage the initiative was in |
| `to_stage` | `varchar(50)` | Stage it moves to (null if rejected) |
| `decision` | `enum('approved', 'rejected', 'on-hold')` | The decision |
| `comment` | `text` | Optional reason |
| `created_at` | `timestamp` | When the decision was made |

#### `activity_log`

Audit trail for all significant actions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | Primary key |
| `initiative_id` | `integer FK → initiatives` | Related initiative |
| `user_id` | `uuid FK → users` | Who performed the action |
| `action` | `varchar(100)` | e.g. `idea_submitted`, `approved_to_validation` |
| `details` | `jsonb` | Flexible metadata |
| `created_at` | `timestamp` | When it happened |

---

## 3. Authentication Approach

### Phase 1: Seeded Users (current)

- Pre-created user accounts with email + bcrypt-hashed passwords
- Session managed via HTTP-only cookie (signed JWT)
- `getCurrentUser()` server-side helper reads the session cookie and returns the user
- The `(workspace)` route group layout enforces authentication — unauthenticated users redirect to `/login`
- No self-registration, no password reset, no OAuth

### Future: Email-Based Authentication (Resend)

**Resend** is provisioned via `RESEND_API_KEY` in `.env.local` (server-only — never expose as `NEXT_PUBLIC_`). It will replace or augment password login in a later auth milestone.

Planned capabilities:

- **Magic link login** — user enters email → one-time token sent via Resend → `/login/verify?token=...` creates session
- **Email verification** — confirm address on first sign-in or invite
- **Password reset** — secure reset links for users who keep password auth
- **Workflow notifications** — e.g. "New initiative submitted", "Approval required", stage handover alerts

Implementation sketch (when built):

1. Add `login_tokens` table (`token`, `user_id`, `expires_at`, `used_at`)
2. Server Action: request login link → generate token → send via Resend API
3. Verify route validates token → calls existing `createSession()` in `src/lib/session.ts`
4. Optional: keep password login as fallback during transition

The session layer (`getCurrentUser()`, HTTP-only cookie) stays the same — only the login entry point changes.

### Future: Third-Party Auth Provider (optional)

Clerk, NextAuth, or similar remain an option if requirements outgrow custom Resend flows. The `getCurrentUser()` contract should stay stable either way.

---

## 4. API Layer

### Server Actions (Mutations)

All write operations use Next.js Server Actions co-located with their pages:

- `submitIdea()` — create a new initiative at Stage 1
- `approveInitiative()` — approve an initiative to advance to the next stage
- `rejectInitiative()` — reject or put on hold
- `login()` / `logout()` — session management

### Server Components (Reads)

Data fetching happens directly in Server Components via Drizzle queries. No separate API routes needed. This keeps the data layer simple and type-safe.

---

## 5. AI & Chat Agent (Gemini — planned)

**Google Gemini** is provisioned via `GEMINI_API_KEY` in `.env.local` (server-only). Not used in Phase 1; reserved for a later milestone.

Planned use cases:

- **Workspace chat agent** — contextual assistant inside the workspace (framework guidance, intake help, initiative status)
- **Stage-aware prompts** — agent knows current initiative stage and can explain required inputs/outputs
- **Draft assistance** — help users draft Initiative/Validation fields before submission (human remains accountable)

Implementation sketch (when built):

1. Server-side API route or Server Action calling Gemini (never expose key to client)
2. Optional: Vercel AI SDK + tool calling for reading initiative data from Drizzle
3. Chat UI as a panel or drawer in the workspace shell (alongside sidebar)
4. Rate limiting and audit logging for AI interactions tied to `activity_log`

This is independent of authentication — Resend handles identity flows; Gemini handles in-app assistance.

---

## 6. Approval Model

### Phase 1: Initiative → Validation Gate

- Only users with IDs matching **Sietse** or **Oleg** can approve initiatives at the Initiative stage
- Approval advances `current_stage` from `idea` (internal enum) to `validation` and sets `status` to `approved`
- Rejection sets `status` to `rejected`; On-hold sets `status` to `on-hold`
- Every decision creates an `approvals` record and an `activity_log` entry

### Future Phases

Each stage gate (Validation → Scoping, Scoping → Go/No-Go, etc.) will have its own approval rules, potentially requiring different approvers or multiple sign-offs.

---

## 7. Phase-by-Phase Build Roadmap

### Phase 1: Initiative (current)
- Database + ORM setup (Drizzle + Neon)
- Seeded users + simple cookie auth
- Initiative submission form (DB-backed)
- Initiative dashboard (real data)
- Initiative detail page with approval gate
- Navigation cleanup (remove concept preview mode)

### Phase 2: Validation
- Validation form fields added to initiative detail
- Business Case enrichment (KPIs, T-shirt size, solution direction)
- Leadership sign-off gate (Validation → Scoping)

### Phase 3: Scoping
- Lead party selection
- Epic & Milestone Timeline editor
- Role-based hour estimates editor
- Scoping → Go/No-Go gate

### Phase 4: Go/No-Go
- Decision UI for leadership (GO / NO-GO / ON-HOLD)
- Budget & capacity sign-off

### Phase 5: Project Setup
- Jira integration (create Epics, Milestones)
- Resource booking from Scoping hour estimates
- Dual-system tracking (Workspace + Jira)

### Phase 6: Onboarding & Kickoff
- Meeting cadence configuration
- Definition of Done sign-off
- Status change to "In Production / Active"

### Phase 7: Production & Reporting
- Lead party assignment for Production
- Governance dashboard for Head of Production
- Weekly Leadership Updates view

### Cross-cutting (as needed)
- Fast-Track flow
- **Email auth & notifications (Resend)** — magic links, verification, approval alerts
- **Workspace chat agent (Gemini)** — contextual assistant for framework and intake
- Role-based permissions (RBAC)
- File uploads & attachments

---

## 8. Environment Variables

| Variable | Scope | Phase | Purpose |
|----------|-------|-------|---------|
| `DATABASE_URL` | Server | 1 | Neon Postgres (pooled) |
| `SESSION_SECRET` | Server | 1 | JWT session signing |
| `SEED_USER_PASSWORD` | Server | 1 | Default password for seeded users |
| `LOGIN_*_EMAIL` / `LOGIN_*_PASSWORD` | Server | 1 | Per-user seed credentials |
| `RESEND_API_KEY` | Server | Future | Resend transactional email |
| `GEMINI_API_KEY` | Server | Future | Google Gemini for chat agent |
| `NEXT_PUBLIC_APP_URL` | Public | Slack | App origin for Slack OAuth redirect URI |
| `SLACK_CLIENT_ID` | Server | Slack | Distributable Slack app Client ID |
| `SLACK_CLIENT_SECRET` | Server | Slack | Distributable Slack app Client Secret |
| `SLACK_SIGNING_SECRET` | Server | Slack | Slack signing secret (future request verification) |

Local values live in `.env.local` (gitignored). Sync auth/session/login vars to Vercel via `npm run env:sync-vercel`. When Resend and Gemini go live, add those keys to the sync script and Vercel Production/Preview/Development. Slack setup steps: [`docs/slack-integration.md`](./slack-integration.md).

**Never** prefix secrets with `NEXT_PUBLIC_` — client bundle exposure. `NEXT_PUBLIC_APP_URL` is the only Slack-related public value (origin only, not secrets).

---

## 9. Existing Assets Preserved

The following concept-preview assets remain functional and accessible:

- **Framework Visualizer** (`/framework`) — interactive Production Framework process map
- **Intake Template** (`/intake`) — combined Stage 1–3 reference form (localStorage-based)
- **Concept Hub** (`/`) — redirects to dashboard or login

These reference assets sit in the sidebar under **Reference** and are not core production views.

---

## 10. File Structure

```
src/
  app/
    login/page.tsx                    # Login page
    (workspace)/
      layout.tsx                      # Session guard + nav
      dashboard/page.tsx              # Real data dashboard
      ideas/new/
        page.tsx                      # Initiative submission
        actions.ts                    # submitIdea Server Action
      initiatives/[id]/
        page.tsx                      # Initiative detail
        actions.ts                    # Approval Server Actions
      framework/page.tsx              # Visualizer (unchanged)
      intake/page.tsx                 # Template (unchanged)
  components/
    ideas/IdeaFormView.tsx            # Initiative form (DB-backed)
    dashboard/DashboardView.tsx       # Refactored for real data
    initiatives/InitiativeDetailView.tsx  # + approval UI
    workspace/
      WorkspaceShell.tsx            # Sidebar + main layout
      WorkspaceSidebar.tsx          # Collapsible nav
  db/
    index.ts                          # Drizzle client
    schema.ts                         # All table schemas
    seed.ts                           # User seed script
  lib/
    auth.ts                           # Login/verify functions
    session.ts                        # Cookie session management
    queries.ts                        # Initiative/dashboard queries
scripts/
  sync-vercel-env.ts                  # Push credential env vars to Vercel
docs/
  TECHNICAL_APPROACH.md               # This document
  Adsomnia-Production-Framework.pdf   # Source PDF
drizzle.config.ts                     # Migration config
```
