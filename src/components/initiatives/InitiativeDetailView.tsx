import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  User,
} from "lucide-react";
import { STAGES, type WorkflowStage } from "@/data/workflow";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import type { InitiativeWithUsers, ActivityEntry } from "@/lib/queries";
import { ApprovalPanel } from "./ApprovalPanel";

function StageStepper({ currentStageId }: { currentStageId: string }) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStageId);

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-start gap-0">
        {STAGES.map((stage, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={stage.id} className="flex items-start">
              <div className="flex w-[100px] flex-col items-center sm:w-[120px]">
                <div
                  className={[
                    "flex size-8 items-center justify-center border sm:size-9",
                    isCurrent
                      ? "border-foreground bg-foreground text-background"
                      : isPast
                        ? "border-foreground/50 bg-foreground/10 text-foreground"
                        : "border-border bg-surface text-muted",
                  ].join(" ")}
                >
                  {isPast ? (
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
                    isCurrent
                      ? "text-foreground"
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
                    isPast ? "bg-foreground/40" : "bg-border",
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

const STATUS_BADGE_STYLES: Record<string, string> = {
  submitted:
    "border-foreground bg-foreground text-background",
  approved: "border-success bg-success/10 text-success",
  rejected: "border-btr bg-btr/10 text-btr",
  "on-hold": "border-hn bg-hn/10 text-hn",
  draft: "border-border bg-surface text-muted",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  "on-hold": "On Hold",
  draft: "Draft",
};

type Props = {
  initiative: InitiativeWithUsers;
  activity: ActivityEntry[];
  canUserApprove: boolean;
};

export function InitiativeDetailView({
  initiative,
  activity,
  canUserApprove,
}: Props) {
  const stage = STAGES.find(
    (s) => s.id === initiative.currentStage,
  ) as WorkflowStage;

  const statusStyle =
    STATUS_BADGE_STYLES[initiative.status] ?? STATUS_BADGE_STYLES.draft;
  const statusLabel =
    STATUS_LABELS[initiative.status] ?? initiative.status;

  const showApproval =
    canUserApprove &&
    initiative.currentStage === "idea" &&
    initiative.status === "submitted";

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
                {initiative.ticketId}
              </span>
            </div>
            <h1 className="font-display mt-2 text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
              {initiative.title}
            </h1>
            {initiative.description &&
              initiative.description !== initiative.title && (
                <p className="mt-2 max-w-2xl text-sm text-muted">
                  {initiative.description}
                </p>
              )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`border px-3 py-1 font-display text-xs font-bold uppercase tracking-wide ${statusStyle}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 border-t border-border pt-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5" />
            {initiative.submitter.name} · Sponsor:{" "}
            {initiative.sponsor.name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5" />
            Created{" "}
            {initiative.createdAt.toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            Stage: {stage?.name ?? initiative.currentStage}
          </span>
        </div>
      </header>

      {/* Stage stepper */}
      <section className="mb-8 border border-border bg-surface-elevated p-4 sm:p-6">
        <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-wide text-muted">
          Framework Progress
        </h2>
        <StageStepper currentStageId={initiative.currentStage} />
        {initiative.currentStage === "validation" &&
          initiative.status === "approved" && (
            <p className="mt-4 border border-success/30 bg-success/5 px-4 py-3 text-xs text-success">
              Approved and advanced to Validation. The Validation form will be
              available in a future build phase.
            </p>
          )}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-8">
          {/* Approval panel */}
          {showApproval && (
            <ApprovalPanel initiativeId={initiative.id} />
          )}

          {stage && (
            <DetailSection title={`Current Stage · ${stage.name}`}>
              <p className="mb-4 text-xs text-muted">
                Owner:{" "}
                <span className="text-foreground">{stage.owner}</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Stage Inputs
                  </p>
                  <ul className="mt-2 space-y-2">
                    {stage.inputs.map((input, i) => (
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-foreground/90"
                      >
                        {input}
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
                      <li
                        key={i}
                        className="text-xs leading-relaxed text-foreground/90"
                      >
                        {output}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </DetailSection>
          )}

          <DetailSection title="Intake Details">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Problem Statement
                </dt>
                <dd className="mt-1 text-sm">
                  {initiative.problemStatement ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Expected Impact
                </dt>
                <dd className="mt-1 text-sm">
                  {initiative.expectedImpact ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Target Audience
                </dt>
                <dd className="mt-1 text-sm">
                  {initiative.targetAudience ?? "—"}
                </dd>
              </div>
            </dl>
          </DetailSection>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 lg:col-span-4">
          <DetailSection title="Systems">
            <div className="flex items-center justify-between">
              <WorkspaceChip />
              <span className="text-[10px] uppercase tracking-wide text-success">
                Active
              </span>
            </div>
          </DetailSection>

          <DetailSection title="Activity Log">
            {activity.length === 0 && (
              <p className="text-xs text-muted">No activity recorded yet.</p>
            )}
            {activity.map((entry) => {
              const actionLabels: Record<string, string> = {
                idea_submitted: "Idea submitted",
                approved_to_validation: "Approved — advanced to Validation",
                idea_rejected: "Idea rejected",
                idea_on_hold: "Idea put on hold",
              };
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 border-b border-border py-3 last:border-0"
                >
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-muted" />
                  <div>
                    <p className="text-sm">
                      {actionLabels[entry.action] ?? entry.action}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {entry.userName} ·{" "}
                      {entry.createdAt.toLocaleDateString("en-US", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
