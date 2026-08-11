import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  User,
  Clock,
  Tag,
  Target,
  Lightbulb,
  TrendingUp,
  Users,
} from "lucide-react";
import { STAGES, type WorkflowStage } from "@/data/workflow";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import type {
  InitiativeWithUsers,
  ActivityEntry,
  CommentEntry,
} from "@/lib/queries";
import { ApprovalPanel } from "./ApprovalPanel";
import { CommentSection } from "./CommentSection";

function StageStepper({ currentStageId }: { currentStageId: string }) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStageId);

  return (
    <ol className="flex items-start">
      {STAGES.map((stage, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        const last = i === STAGES.length - 1;

        return (
          <li key={stage.id} className={last ? "flex-none" : "flex-1"}>
            <div className="flex items-center">
              <span
                className={[
                  "font-display flex size-8 shrink-0 items-center justify-center border text-[10px] font-bold",
                  isCurrent
                    ? "border-foreground bg-foreground text-background"
                    : isPast
                      ? "border-success/60 bg-success/10 text-success"
                      : "border-border text-muted/50",
                ].join(" ")}
              >
                {isPast ? (
                  <Check className="size-3.5" />
                ) : (
                  String(stage.number).padStart(2, "0")
                )}
              </span>
              {!last && (
                <span
                  className={`h-px flex-1 ${isPast ? "bg-success/40" : "bg-border"}`}
                />
              )}
            </div>
            <p
              className={[
                "font-display mt-1.5 hidden pr-2 text-[9px] font-bold uppercase tracking-wide md:block",
                isCurrent
                  ? "text-foreground"
                  : isPast
                    ? "text-muted"
                    : "text-muted/40",
              ].join(" ")}
            >
              {stage.name}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  submitted: "border-foreground bg-foreground text-background",
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
  comments: CommentEntry[];
  canUserApprove: boolean;
  canComment: boolean;
  currentUserName: string;
};

export function InitiativeDetailView({
  initiative,
  activity,
  comments,
  canUserApprove,
  canComment,
  currentUserName,
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
    <div className="relative w-full flex-1">
      <div className="sticky top-0 z-20 bg-background/90 px-4 py-4 backdrop-blur-sm sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-4 pb-40 sm:px-6 lg:pb-48">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  {initiative.ticketId}
                </span>
                <span
                  className={`border px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}
                >
                  {statusLabel}
                </span>
              </div>
              <h1 className="font-display mt-3 text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
                {initiative.title}
              </h1>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <User className="size-3.5" />
              {initiative.submitter.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Tag className="size-3.5" />
              Sponsor: {initiative.sponsor.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              {initiative.createdAt.toLocaleDateString("en-US", {
                dateStyle: "medium",
              })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Stage: {stage?.name ?? initiative.currentStage}
            </span>
          </div>
        </header>

        {/* Pipeline stepper */}
        <div className="mb-8 border border-border bg-surface-elevated p-5">
          <StageStepper currentStageId={initiative.currentStage} />
          {initiative.currentStage === "validation" &&
            initiative.status === "approved" && (
              <p className="mt-4 border border-success/30 bg-success/5 px-4 py-3 text-xs text-success">
                Approved and advanced to Validation. The Validation form will be
                available in a future build phase.
              </p>
            )}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main content */}
          <div className="space-y-6 lg:col-span-8">
            <section>
              <div className="flex items-end justify-between gap-4 border border-border border-b-0 bg-surface-elevated px-4 py-4 sm:px-5">
                <div>
                  <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                    Phase {String(stage?.number ?? 1).padStart(2, "0")}
                  </p>
                  <h2 className="font-display mt-1 text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
                    {stage?.name ?? "Initiative"}
                  </h2>
                </div>
                {initiative.currentStage === "idea" && (
                  <span className="font-display shrink-0 border border-foreground/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground/70">
                    Current
                  </span>
                )}
              </div>

              <div className="border border-border bg-surface">
                <h3 className="border-b border-border px-4 py-3 font-display text-xs font-bold uppercase tracking-wide">
                  Initiative Details
                </h3>
                <div className="grid gap-px bg-border sm:grid-cols-2">
                <div className="bg-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <Target className="size-3.5" />
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                      Problem Statement
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {initiative.problemStatement ?? "—"}
                  </p>
                </div>
                <div className="bg-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <Lightbulb className="size-3.5" />
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                      Opportunity / Solution
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {initiative.opportunitySolution ?? "—"}
                  </p>
                </div>
                <div className="bg-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <TrendingUp className="size-3.5" />
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                      Expected Impact
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {initiative.expectedImpact ?? "—"}
                  </p>
                </div>
                <div className="bg-surface p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted">
                    <Users className="size-3.5" />
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                      Target Audience
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {initiative.targetAudience ?? "—"}
                  </p>
                </div>
              </div>
              </div>
            </section>

            {showApproval && (
              <ApprovalPanel initiativeId={initiative.id} />
            )}
          </div>

          {/* Sidebar — persistent as initiative progresses */}
          <div className="space-y-6 lg:col-span-4">
            <div className="border border-border bg-surface">
              <h3 className="border-b border-border px-4 py-3 font-display text-xs font-bold uppercase tracking-wide">
                Details
              </h3>
              <div className="divide-y divide-border">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted">Status</span>
                  <span
                    className={`border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}
                  >
                    {statusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted">Stage</span>
                  <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                    {stage?.name ?? initiative.currentStage}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted">Submitter</span>
                  <span className="text-xs text-foreground">
                    {initiative.submitter.name}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted">Sponsor</span>
                  <span className="text-xs text-foreground">
                    {initiative.sponsor.name}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="text-xs text-muted">System</span>
                  <WorkspaceChip />
                </div>
              </div>
            </div>

            <CommentSection
              initiativeId={initiative.id}
              comments={comments}
              activity={activity}
              currentUserName={currentUserName}
              canComment={canComment}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
