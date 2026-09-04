import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";
import { STAGES, getStageColor } from "@/data/workflow";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import {
  sortTeamWorkstreams,
  teamItemState,
} from "@/lib/dashboard-attention";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  SectionHeading,
  StageChip,
  StageProgress,
  StatusBadge,
  timeAgo,
} from "./shared";

type Props = {
  initiatives: InitiativeWithUsers[];
  feedbackIds: number[];
  userId: string;
  firstName: string;
  role: string;
};

export function TeamDashboard({
  initiatives: rawItems,
  feedbackIds,
  userId,
  firstName,
  role,
}: Props) {
  const feedback = new Set(feedbackIds);
  const submitted = sortTeamWorkstreams(
    rawItems.filter(
      (item) => !item.archivedAt && item.submitter.id === userId,
    ),
    feedback,
  );
  const needsAction = submitted.filter(
    (item) => teamItemState(item, feedback).kind === "action",
  );

  return (
    <div className="mx-auto w-full max-w-[960px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <div className="relative z-10">
          <DashboardGreeting
            firstName={firstName}
            role={role}
            subtitle="Your submitted workstreams — where they sit in the pipeline, and whether they need you."
          />
          <div className="mt-5">
            <Link
              href="/ideas/new"
              className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
            >
              <Lightbulb className="size-3.5" />
              Submit Initiative
            </Link>
          </div>
        </div>
      </header>

      <section className="mb-8">
        <SectionHeading
          kicker="Your queue"
          trailing={
            needsAction.length > 0 ? (
              <span className="font-display text-xs font-bold tabular-nums text-muted">
                {needsAction.length}
              </span>
            ) : null
          }
        >
          Needs your action
        </SectionHeading>
        {needsAction.length === 0 ? (
          <div className="flex items-center gap-3 border border-border bg-surface px-4 py-4">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            <p className="text-sm text-muted">
              Nothing waiting on you. Leadership has the next move, or your
              workstreams are moving through later phases.
            </p>
          </div>
        ) : (
          <ul className="border border-border">
            {needsAction.map((item, index) => {
              const state = teamItemState(item, feedback);
              return (
                <li key={item.id}>
                  <Link
                    href={`/workstreams/${item.id}`}
                    className={[
                      "group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.03]",
                      index > 0 ? "border-t border-border" : "",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden
                      className="h-8 w-0.5 shrink-0 bg-danger"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                          {item.ticketId}
                        </span>
                        <span className="truncate text-sm font-medium">
                          {item.title}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {state.reason}
                        <span className="text-muted/70">
                          {" "}
                          · {timeAgo(item.updatedAt)}
                        </span>
                      </p>
                    </div>
                    <StageChip stageId={item.currentStage} />
                    <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading
          kicker="Submitted by you"
          trailing={
            <span className="font-display text-xs font-bold tabular-nums text-muted">
              {submitted.length}
            </span>
          }
        >
          Your workstreams
        </SectionHeading>
        {submitted.length === 0 ? (
          <div className="border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            You have not submitted a workstream yet.{" "}
            <Link
              href="/ideas/new"
              className="text-foreground underline-offset-2 hover:underline"
            >
              Submit an initiative
            </Link>{" "}
            to track it through the pipeline.
          </div>
        ) : (
          <div className="space-y-2">
            {submitted.map((item) => (
              <WorkstreamCard
                key={item.id}
                item={item}
                state={teamItemState(item, feedback)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorkstreamCard({
  item,
  state,
}: {
  item: InitiativeWithUsers;
  state: ReturnType<typeof teamItemState>;
}) {
  const stage = STAGES.find((entry) => entry.id === item.currentStage);
  const stageColor = getStageColor(item.currentStage);
  const needsYou = state.kind === "action";

  return (
    <Link
      href={`/workstreams/${item.id}`}
      className="group block border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-white/[0.03]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
              {item.ticketId}
            </span>
            <StatusBadge status={item.status} />
          </div>
          <p className="mt-1.5 text-sm font-medium leading-snug">{item.title}</p>
        </div>
        <span
          className={[
            "shrink-0 border px-1.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide",
            needsYou
              ? "border-danger text-danger"
              : "border-border text-muted",
          ].join(" ")}
        >
          {needsYou ? "Needs you" : "No action"}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide" style={{ color: stageColor }}>
            {stage ? `${String(stage.number).padStart(2, "0")} ${stage.name}` : item.currentStage}
          </p>
          <p className="text-[11px] text-muted">{timeAgo(item.updatedAt)}</p>
        </div>
        <StageProgress currentStageId={item.currentStage} />
      </div>

      <p className="mt-3 text-xs text-muted">{state.reason}</p>
    </Link>
  );
}
