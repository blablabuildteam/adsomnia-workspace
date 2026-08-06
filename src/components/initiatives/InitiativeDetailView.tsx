import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Circle,
  ExternalLink,
  User,
  Zap,
} from "lucide-react";
import { STAGES, getParty, type WorkflowStage } from "@/data/workflow";
import {
  getInitiative,
  MOCK_INITIATIVES,
  type Initiative,
} from "@/data/mock-initiatives";
import { HighlightedText } from "@/components/HighlightedText";
import { JiraChip } from "@/components/JiraChip";
import { WorkspaceChip } from "@/components/WorkspaceChip";

function StageStepper({
  currentStageId,
  initiative,
}: {
  currentStageId: string;
  initiative: Initiative;
}) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStageId);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-start gap-0">
        {STAGES.map((stage, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isBypassed = initiative.isFastTrack && stage.fastTrackBypass;
          const isFastTrackLanding =
            initiative.isFastTrack && stage.fastTrackLanding;

          return (
            <div key={stage.id} className="flex items-start">
              <div className="flex w-[100px] flex-col items-center sm:w-[120px]">
                <div
                  className={[
                    "flex size-8 items-center justify-center border sm:size-9",
                    isBypassed
                      ? "border-border/40 bg-transparent text-muted/40"
                      : isCurrent || isFastTrackLanding
                        ? "border-foreground bg-foreground text-background"
                        : isPast
                          ? "border-foreground/50 bg-foreground/10 text-foreground"
                          : "border-border bg-surface text-muted",
                  ].join(" ")}
                >
                  {isBypassed ? (
                    <span className="text-[10px]">—</span>
                  ) : isPast ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="font-display text-xs font-bold">
                      {stage.number}
                    </span>
                  )}
                </div>
                <p
                  className={[
                    "mt-2 text-center font-display text-[9px] font-bold uppercase leading-tight tracking-wide sm:text-[10px]",
                    isCurrent || isFastTrackLanding
                      ? "text-foreground"
                      : isBypassed
                        ? "text-muted/40 line-through"
                        : isPast
                          ? "text-muted"
                          : "text-muted/60",
                  ].join(" ")}
                >
                  {stage.name}
                </p>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={[
                    "mt-4 h-px w-4 sm:w-6",
                    isPast && !isBypassed ? "bg-foreground/40" : "bg-border",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-surface">
      <h3 className="border-b border-border px-4 py-3 font-display text-xs font-bold uppercase tracking-wide">
        {title}
      </h3>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ActivityItem({
  date,
  actor,
  action,
}: {
  date: string;
  actor: string;
  action: string;
}) {
  return (
    <div className="flex gap-3 border-b border-border py-3 last:border-0">
      <Circle className="mt-1 size-2 shrink-0 fill-muted text-muted" />
      <div>
        <p className="text-sm">{action}</p>
        <p className="mt-0.5 text-xs text-muted">
          {actor} · {date}
        </p>
      </div>
    </div>
  );
}

export function InitiativeDetailView({ initiative }: { initiative: Initiative }) {
  const stage = STAGES.find((s) => s.id === initiative.stageId) as WorkflowStage;
  const party = initiative.leadParty ? getParty(initiative.leadParty) : null;
  const showJira = ["setup", "onboarding", "production"].includes(stage.id);

  const statusLabel =
    initiative.status === "on-hold"
      ? "On Hold"
      : initiative.status === "active"
        ? stage.name
        : initiative.status;

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Dashboard
      </Link>

      {/* Header */}
      <header className="mb-8 border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted">
                {initiative.id}
              </span>
              {initiative.isFastTrack && (
                <span className="inline-flex items-center gap-1 border border-foreground/40 bg-white/5 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider">
                  <Zap className="size-3" />
                  Fast-Track
                </span>
              )}
              {initiative.tShirtSize && (
                <span className="border border-border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                  Size {initiative.tShirtSize}
                </span>
              )}
            </div>
            <h1 className="font-display mt-2 text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              {initiative.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">{initiative.summary}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="border border-foreground bg-foreground px-3 py-1 font-display text-xs font-bold uppercase tracking-wide text-background">
              {statusLabel}
            </span>
            {party && (
              <span
                className="border px-3 py-1 font-display text-xs font-bold uppercase tracking-wide"
                style={{ borderColor: party.color, color: party.color }}
              >
                Lead: {party.label}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5" />
            {initiative.submitter} · Sponsor: {initiative.sponsor}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Updated {initiative.updatedAt}
          </span>
          <span className="inline-flex items-center gap-1.5 capitalize">
            Priority: {initiative.priority}
          </span>
        </div>
      </header>

      {/* Stage stepper */}
      <section className="mb-8 border border-border bg-surface-elevated p-4 sm:p-6">
        <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-muted">
          Framework Progress
        </h2>
        <StageStepper
          currentStageId={initiative.stageId}
          initiative={initiative}
        />
        {initiative.isFastTrack && (
          <p className="mt-4 text-xs text-muted">
            Fast-Track: skipped Idea through Onboarding — landed directly in
            Production & Reporting.
          </p>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-8">
          <DetailSection title={`Current Stage · ${stage.name}`}>
            <p className="mb-4 text-xs text-muted">
              Owner: <span className="text-foreground">{stage.owner}</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Inputs
                </p>
                <ul className="mt-2 space-y-2">
                  {stage.inputs.map((input, i) => (
                    <li key={i} className="text-xs leading-relaxed text-foreground/90">
                      <HighlightedText text={input} boldLabel />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Expected Outputs
                </p>
                <ul className="mt-2 space-y-2">
                  {stage.outputs.map((output, i) => (
                    <li key={i} className="text-xs leading-relaxed text-foreground/90">
                      <HighlightedText text={output} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Intake Details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Problem Statement
                </dt>
                <dd className="mt-1 text-sm">{initiative.problemStatement}</dd>
              </div>
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Expected Impact
                </dt>
                <dd className="mt-1 text-sm">{initiative.expectedImpact}</dd>
              </div>
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Target Audience
                </dt>
                <dd className="mt-1 text-sm">{initiative.targetAudience}</dd>
              </div>
            </dl>
          </DetailSection>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <DetailSection title="Systems">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <WorkspaceChip />
                <span className="text-[10px] uppercase tracking-wide text-success">
                  Active
                </span>
              </div>
              {showJira && (
                <div className="flex items-center justify-between">
                  <JiraChip />
                  <a
                    href="#"
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted hover:text-foreground"
                  >
                    Open
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          </DetailSection>

          <DetailSection title="Activity Log">
            <ActivityItem
              date={initiative.updatedAt}
              actor="Coen V."
              action={`Stage updated to ${stage.name}`}
            />
            <ActivityItem
              date="2026-07-20"
              actor={initiative.sponsor}
              action="Sponsor assigned"
            />
            <ActivityItem
              date="2026-07-18"
              actor={initiative.submitter}
              action="Initiative registered via Idea intake"
            />
          </DetailSection>

          <DetailSection title="Other Initiatives">
            <ul className="space-y-2">
              {MOCK_INITIATIVES.filter((i) => i.id !== initiative.id)
                .slice(0, 4)
                .map((other) => (
                  <li key={other.id}>
                    <Link
                      href={`/initiatives/${other.id}`}
                      className="block text-sm text-muted transition-colors hover:text-foreground"
                    >
                      <span className="font-display text-[10px] font-bold uppercase tracking-wider">
                        {other.id}
                      </span>
                      {" — "}
                      {other.title}
                    </Link>
                  </li>
                ))}
            </ul>
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

export function InitiativeDetailPage({ id }: { id: string }) {
  const initiative = getInitiative(id);

  if (!initiative) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-2xl font-extrabold uppercase">
          Initiative Not Found
        </p>
        <p className="mt-2 text-sm text-muted">
          No mock data for <span className="font-mono">{id}</span>.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 border border-foreground px-4 py-2 font-display text-xs font-bold uppercase tracking-wide"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return <InitiativeDetailView initiative={initiative} />;
}
