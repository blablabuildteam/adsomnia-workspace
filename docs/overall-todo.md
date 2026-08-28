# Overall to-do

- [ ] Update user permissions between **leadership** and **team** accounts (clarify what each role can do; align UI + API checks with `users.role`)
- [x] Open **Continue with Google** for allowed domains with post-login profile signup for non-leadership (`team`) users
- [ ] Refine **team** role permissions once product rules are decided
- [ ] **Jira — Adsomnia:** client provides host / email / API token → set `JIRA_ADSOMNIA_*`, smoke-test create + epic read ([`jira-client-connect.md`](./jira-client-connect.md))
- [ ] **Jira Setup UI:** wire Create Board (like Slack) using lead party → instance map; keep paste fallback
- [ ] **Production Overview:** epics + task progress across boards ([`jira-integration.md`](./jira-integration.md))
- [ ] **Jira — BTR** then **HN:** repeat client connect + env for partner Cloud sites
- [ ] Build a **reminder to recycle Jira API tokens** (per instance / service account; surface before expiry or on a fixed rotation schedule)
- [ ] **Strict character limits** on Initiative description and Validation fields
- [ ] **Submitter notifications** for feedback remarks and when an initiative advances through phases
- [ ] **Remarks on projects** — add remarks to initiatives/projects
- [ ] **General feedback button** — users can log issues when they hit something; when admins (Siets, Oleg, Coen, Erin) are online they can give live feedback
- [ ] **Dual priorities:** Adsomnia priority + consensus priority
  - Adsomnia priority via sliders, with option to override
- [ ] Projects in **Production** (and earlier stages) can **adjust priorities**
- [ ] **Fast-Track recognition & overview** — staged Fast-Track view (status, priority, assignee, title, description from Jira), including control to push; backed by a Fast-Track Jira board
  - Option to convert **Fast-Track ↔ full project** (and vice versa)
