import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  Lightbulb,
  Map,
  Ticket,
} from "lucide-react";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import { isPreviewLocked } from "@/data/preview-access";

const CONCEPT_VIEWS = [
  {
    href: "/intake",
    title: "Project Intake Template",
    subtitle: "Stages 1–3 · Pre–Jira",
    description:
      "Fillable template for Idea, Validation, and Scoping — including Epic/Milestone timeline and role-based hour estimates. Use one form per kickoff project before Jira setup.",
    icon: ClipboardList,
    stage: "Kickoff now",
  },
  {
    href: "/dashboard",
    title: "Dashboard",
    subtitle: "Governance overview",
    description:
      "Central Now / Next / Later / Rollout view with pipeline stats, stage breakdown, and recent activity — the operational home for leadership and Head of Production.",
    icon: LayoutDashboard,
    stage: "All stages",
  },
  {
    href: "/ideas/new",
    title: "Submit Idea",
    subtitle: "Stage 1 intake",
    description:
      "Minimal intake form mapped to the Idea stage inputs — title, problem, impact, audience, submitter & sponsor. Creates a registered ticket in the Workspace System.",
    icon: Lightbulb,
    stage: "Idea",
  },
  {
    href: "/initiatives/WS-1042",
    title: "Initiative Detail",
    subtitle: "Ticket lifecycle",
    description:
      "Single initiative view with framework progress, current stage inputs/outputs, lead party, Jira link, and activity log — how a ticket lives in the system.",
    icon: Ticket,
    stage: "Any stage",
  },
  {
    href: "/framework",
    title: "Framework Map",
    subtitle: "Process visualizer",
    description:
      "Interactive horizontal timeline of all 7 stages, Fast-Track exception, party filters, and governance layers — the agreed Production Framework process map.",
    icon: Map,
    stage: "Reference",
  },
] as const;

export default function HomePage() {
  return (
    <div className="app-atmosphere flex min-h-full flex-1 flex-col">
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <header className="mb-12 text-center">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
            Adsomnia Workspace
          </p>
          <h1 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
            Concept
            <br />
            Previews
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
            The client agreed on the Production Framework — these views show
            how the full <WorkspaceChip /> tool will operationalize it. Mock
            data only; no backend yet.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {CONCEPT_VIEWS.map(
            ({ href, title, subtitle, description, icon: Icon, stage }) => {
              const locked = isPreviewLocked(href);

              if (locked) {
                return (
                  <div
                    key={href}
                    aria-disabled="true"
                    className="flex flex-col border border-border/50 bg-surface/40 p-6 opacity-40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex size-10 items-center justify-center border border-border/60 bg-surface-elevated/50">
                        <Icon className="size-5 text-muted" />
                      </div>
                      <span className="border border-border/60 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                        Coming soon
                      </span>
                    </div>
                    <h2 className="font-display mt-4 text-xl font-extrabold uppercase tracking-tight text-muted">
                      {title}
                    </h2>
                    <p className="mt-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      {subtitle}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                      {description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-muted">
                      Not available yet
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-elevated"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex size-10 items-center justify-center border border-border bg-surface-elevated">
                      <Icon className="size-5 text-foreground" />
                    </div>
                    <span className="border border-border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                      {stage}
                    </span>
                  </div>
                  <h2 className="font-display mt-4 text-xl font-extrabold uppercase tracking-tight group-hover:text-foreground">
                    {title}
                  </h2>
                  <p className="mt-1 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-bbb">
                    {subtitle}
                  </p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    {description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-foreground">
                    Open view
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            },
          )}
        </div>

        <p className="mt-12 text-center text-xs text-muted">
          For the three kickoff projects, start with the{" "}
          <Link href="/intake" className="text-foreground underline-offset-2 hover:underline">
            Project Intake Template
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
