# Cursor Prompt & Task Brief: Adsomnia Production Framework Interactive Process Visualizer

## Language
**Visualizer UI and content must be in English.** Source PDF stage names may be Dutch (Idee, Validatie, Productie, etc.) — translate them for display (Initiative, Validation, Production, etc.). Use the term **Initiative** (not Idea) in all product UI.

## Source PDF
Original workflow diagram: `docs/Adsomnia-Production-Framework.pdf`

## 🎯 Goal
Build a clean, high-impact, interactive web view (or interactive SVG/HTML visualizer) for the **Adsomnia - Production Framework** based on the final workflow PDF and Adsomnia's brand identity. 

*Note: This repository will later be used to build out the full Adsomnia Workspace platform. For this immediate task, the scope is strictly focused on creating an interactive visual map of the Production Framework process.*

---

## 🎨 Visual Identity & Brand Styling (from Adsomnia Website)
Match the exact design language of **Adsomnia** (`adsomnia.com`):
- **Theme/Background:** Deep Dark / Pitch Black (`#000000` or `#0B0B0B`) with stark white primary text (`#FFFFFF`).
- **Typography:** Bold, condensed/impact sans-serif display headers (e.g., *Impact*, *Oswald*, *Bebas Neue*, or heavy uppercase sans-serif like *Syne/Inter Heavy*).
- **Accent Colors (party lanes):**
  - Adsomnia — black & white (`#000000` / `#FFFFFF`); UI chrome stays monochrome.
  - Bending The Rules — red-orange (`#FF3B1F`).
  - Harlem Next — blue-gray (`#7E90A3`).
  - blablabuild — volt (`#CEFF00`); AI innovation partner.
- **UI Elements:**
  - Sharp, clean borders (thin white or dark grey borders `#222222`).
  - Square / sharp-cornered cards with high readability.
  - Minimalistic, high-tech, raw/bold aesthetic ("TRAFFIC NEVER SLEEPS").

---

## 📐 Process Flow Architecture (from PDF)

The workflow consists of **7 Main Sequential Stages** plus a **Fast-Track Exception** and a **Governance/Reporting Overlay**:

### 1. Fast-Track (Exception Rule)
- **Condition:** If a request takes `< 4 hours`, it skips the entire standard multi-stage flow.
- **Action:** Goes straight into **Production & Reporting**. A ticket is still created in the *Adsomnia Workspace System* within the **Fast-Track View**.

---

### 2. The 7 Core Workflow Stages

#### Stage 1: Initiative (Idee — Adsomnia)
- **Role/Owner:** Adsomnia Leadership Team
- **Input (Top Box):** Each input must clearly state what is expected.
  - *Title & Short Description:* Core initiative in 1–2 plain sentences (what are we building/changing?).
  - *Problem Statement:* Concrete problem solved (pain, gap, or risk if we do nothing).
  - *Opportunity / Solution:* Opportunity or proposed solution direction in plain terms.
  - *Expected Impact / Value (Hypothesis):* Intended outcome and how success would be recognised.
  - *Target Audience / Stakeholder:* Who it is for and who is affected.
  - *Submitter & Sponsor:* Who proposes it; which decision maker (Sietse / Jasper / Oleg) sponsors it.
- **Output (Bottom Box):**
  - Registered initiative ticket in the *Adsomnia Workspace System* with minimal intake.

#### Stage 2: Validatie (Adsomnia)
- **Role/Owner:** Adsomnia Leadership Team / Head of Production / Team Lead
- **Input (Top Box):** Each input must clearly state what is expected.
  1. Quantifiable Business Value — KPI, baseline, rough upside / assumptions
  2. Global Solution Direction & High-Level Architecture — approach + building blocks (not detailed design)
  3. Investment Estimate — T-Shirt Sizing S/M/L/XL + one-line rationale
  4. Strategic Fit & Priority — why now; propose Now / Next / Later / Rollout
  5. Dependencies & Blockers — teams, systems, vendors, blockers
  6. Risks & 'Do Nothing' Scenario — proceed risks + cost of inaction
- **Output (Bottom Box):**
  - Ticket enriched to a Business Case (with T-shirt size & KPIs).
  - Formal Sign-off from leadership team (Sietse, Jasper, Oleg) logged in system.

#### Stage 3: Scoping (Lead party choice)
- **Role/Owner:** Head of Production (Coen)
- **Input (Top Box):** Prerequisites + scoping work that must be completed for Jira Project Setup.
  - Approved Business Case & Formal Sign-off (may proceed to Scoping).
  - Lead party decision (required — pick one): BTR / HN / BBB / Adsomnia Internal; others may collaborate under that lead.
  - **Epic & Milestone Timeline** — Epics/Milestones with target start/end dates (or sprint windows) for Jira structure & capacity booking.
  - **Role-based Production Hour Estimates** — free-format role description + person name; total hours, hours per day, and active period — for resource booking and Go/No-Go cost vs value.
  - Delivery Dependencies & Assumptions; Scope Boundaries (in / out of scope).
- **Lead choice (required — pick one):**
  - `Scoping (BTR)` - Bending The Rules
  - `Scoping (HN)` - Harlem Next
  - `Scoping (BBB)` - blablabuild
  - `Scoping (AS)` - Adsomnia Internal
- **Collaboration:** Multiple parties may work together under the chosen lead; one party remains accountable.
- **Output (Bottom Box):**
  - Ticket updated with complete Scoping Proposal: Epic & Milestone Timeline, role-based hour estimates, scope boundaries, identified dependencies — ready for Go/No-Go and Jira Project Setup.

#### Stage 4: Go / No-Go
- **Role/Owner:** Adsomnia Leadership Team (Sietse & Coen)
- **Input (Top Box):**
  - Scoping Proposal vs. Business Case (Expected Value vs. Cost/Capacity).
- **Output (Bottom Box):**
  - Formal status change: `GO` (to Setup), `NO-GO` (Closed), or `ON-HOLD` (Backlog). Final sign-off logged on budget & capacity.

#### Stage 5: Project Setup
- **Role/Owner:** Head of Production (Coen)
- **Input (Top Box):**
  - Business Case + Registered GO decision + Approved Scoping Proposal & assigned main executor (HN, BTR, BBB, or AS).
- **Output (Bottom Box):**
  - Fully configured project environment in Adsomnia Workspace System (or external Jira link for HN/BTR).
  - Created Epics, Milestones, dates, team permissions, linked docs, defined reporting route & cadence.

#### Stage 6: Onboarding & Kickoff
- **Role/Owner:** Head of Production (Coen)
- **Input (Top Box):**
  - Configured Project Environment, Team & Permissions, Proposed Meeting Cadence.
- **Output (Bottom Box):**
  - Project status changed to `In Productie / Active`.
  - Confirmed Meeting Cadence, Sign-off on DoD (Definition of Done), Prioritized Backlog in Jira.

#### Stage 7: Productie & Reporting
- **Execution Level (Bottom):**
  - **One lead party** always owns Production: `Production (AS)`, `Production (BBB)`, `Production (BTR)`, or `Production (HN)`.
  - Multiple parties may collaborate under that lead when needed.
  - Managed by the lead’s Project Manager via daily stand-ups and weekly reports.
- **Governance Level (Middle):**
  - `Project Governance` overseen by Head of Production.
- **Reporting Level (Top):**
  - `Weekly Leadership Updates + Manage Workspace Status` sent from Head of Production to Leadership Team.

---

## 💻 Technical & UX Requirements for the Visualizer
1. **Interactive Horizontal Timeline / Flowchart Layout:**
   - Smooth horizontal scrolling or responsive grid.
   - Distinct cards for each stage showing **Role**, **Stage Name**, **Inputs (Top)**, and **Outputs (Bottom)**.
   - Clear visual arrows/connectors indicating direction of flow.
2. **Interactive Elements:**
   - **Hover / Click Detail Modals/Drawers:** Clicking a stage expands the full input/output details in a sleek sidebar/modal.
   - **Fast-Track Toggle/Highlight:** A toggle switch or highlight button that visually traces the "Fast-Track" shortcut.
   - **Party Filter / Color Highlighting:** Ability to highlight tasks/scoping per partner (`Adsomnia`, `Harlem Next`, `Bending The Rules`, `blablabuild`).
3. **Export / Sharing:**
   - Ensure pixel-perfect presentation readiness for client reviews.
