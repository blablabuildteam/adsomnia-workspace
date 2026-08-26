# Client instructions: Connect Jira to Adsomnia Workspace

These steps let Adsomnia Workspace create project boards in **your Jira Cloud** and later show production progress (epics + task status) in the Workspace **Production Overview**.

**Start with Adsomnia’s own Jira.** After that works, the same checklist is reused for **Bending The Rules** and **Harlem Next** (each has a separate Atlassian site).

You need:

- A **Jira Cloud** site (e.g. `your-company.atlassian.net`)
- Someone who can **create users** and grant **project/admin** permissions (Jira/Atlassian admin)
- ~15 minutes for the first connection

Unlike Slack, there is **no “Install app” button** in the Workspace UI for Jira. You create an API token and send three values to the Adsomnia Workspace technical contact. They store those securely on the server.

---

## Part 1 — Create a dedicated Jira user (recommended)

Do **not** use a personal login that will leave the company.

1. In Atlassian Admin / Jira user management, create a user such as:
   - Email: `jira-workspace@your-company.com` (or similar)
   - Display name: **Adsomnia Workspace**
2. Give that user access to the Jira product on your Cloud site.
3. Grant permissions so the user can:
   - **Create projects** (or hold a role that includes Create projects / Administer Jira)
   - **Browse** all projects that Workspace should report on
   - **View issues** (and statuses) in those projects
4. Complete any invite / password setup so the account can sign in once.

If your security policy forbids a shared user, an admin personal account works for a pilot — plan to rotate to a service account before production.

---

## Part 2 — Create an API token

1. Sign in to Atlassian as the dedicated user: [https://id.atlassian.com](https://id.atlassian.com)
2. Open **Security** → **API tokens** (or go directly to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens))
3. Click **Create API token**
4. Label it clearly, e.g. `Adsomnia Workspace — production`
5. Copy the token **immediately** (it is shown only once)

Treat the token like a password. Do not put it in Slack channels, tickets, or email threads that are widely shared if you can avoid it — prefer a secure one-time channel (password manager share, encrypted note, or live handoff).

---

## Part 3 — Send these three values to Adsomnia Workspace

| Value | Example | Notes |
|-------|---------|--------|
| **Host** | `adsomnia.atlassian.net` | Your Jira Cloud hostname only (no path). `https://` optional. |
| **Email** | `jira-workspace@adsomnia.com` | Exact email of the Atlassian account that created the token |
| **API token** | `(secret)` | From Part 2 |

Also confirm:

- Which **party** this site is for: **Adsomnia**, **Bending The Rules**, or **Harlem Next**
- That Workspace may **create software projects** (Scrum or Kanban templates) under this site
- That Workspace may **read** epics and issues for progress reporting

The technical contact will set server environment variables (e.g. `JIRA_ADSOMNIA_HOST`, `JIRA_ADSOMNIA_EMAIL`, `JIRA_ADSOMNIA_API_TOKEN`) and redeploy. You will not enter the token in the Workspace UI.

---

## Part 4 — Smoke test (with Adsomnia Workspace tech)

After env is configured:

1. Sign in to Adsomnia Workspace as someone who can manage **Project Setup**.
2. Open an initiative whose **lead production party** matches this Jira (e.g. Adsomnia Internal for Adsomnia Jira).
3. In **Create Jira Board**, use **Create** (when enabled) or paste a board URL from a test project.
4. Confirm the new project appears in **your** Jira under the expected site.
5. Optionally create a sample Epic with a few tasks; tech verifies the Production Overview API can read dates and status counts.

If create fails with a permissions error, raise the dedicated user’s project-creation rights and retry.

---

## What Workspace will use the access for

| Use | Description |
|-----|-------------|
| **Project Setup** | Create a Jira software project/board for a GO’d initiative, named consistently with the workstream |
| **Production Overview** (upcoming) | For productions on that lead’s boards: epic / milestone **name**, **start** and **end** dates, and counts of nested tasks **open / in progress / done** |

Workspace does **not** need to read Slack messages, email, or Confluence unless you later agree to expand scope.

---

## Rollout across partners

| Order | Party | Same steps? |
|-------|-------|-------------|
| 1 | **Adsomnia** | This document — do first |
| 2 | **Bending The Rules** | Same Parts 1–4 on **BTR’s** Atlassian site; send a second host/email/token set |
| 3 | **Harlem Next** | Same on **HN’s** site; third set |

Each partner keeps their own Jira. Workspace chooses the site from the initiative’s **lead production partner** at Project Setup.

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| “Instance not configured” in Workspace | Host/email/token not set (or typo) for that party on the server |
| 401 / unauthorized from Jira | Token revoked, wrong email, or token created under a different Atlassian account |
| 403 on create project | User lacks Create projects / admin; ask Jira admin to grant |
| Can create but Overview shows no epics | Project key wrong on the initiative, or issues are not type **Epic**; confirm browse access on that project |
| Wrong company’s Jira got the board | Lead party on the initiative must match the intended site; check Validation / Scoping lead assignment |

---

## Summary (copy for email)

1. Create a dedicated Atlassian user for Adsomnia Workspace (recommended).  
2. Grant create-project + browse/view-issue access on your Jira Cloud.  
3. Create an API token for that user.  
4. Securely send **host**, **email**, and **API token** (and which party: Adsomnia / BTR / HN).  
5. Adsomnia tech stores env vars and smoke-tests create + read.

Questions: contact your Adsomnia project lead / Workspace technical contact.

Internal detail: [`docs/jira-integration.md`](./jira-integration.md).
