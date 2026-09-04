import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  PARTIES,
  STAGES,
  getStageColor,
  type PartyId,
} from "@/data/workflow";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { ConsensusPriorityChip } from "@/components/production/ConsensusPriorityChip";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { KanbanFullscreen } from "@/components/dashboard/KanbanFullscreen";
import { formatActivityLabel } from "@/lib/activity-labels";
import { headlinePriority } from "@/lib/validation-data";
import type {
  InitiativeWithUsers,
  WorkspaceActivityEntry,
} from "@/lib/queries";
import {
  STAGE_HREF,
  SectionHeading,
  StageChip,
  StatusBadge,
  hoverTicks,
  nextStage,
  timeAgo,
} from "./shared";

type Props = {
  initiatives: InitiativeWithUsers[];
  activity: WorkspaceActivityEntry[];
  firstName: string;
  role: string;
};

export function LeadershipDashboard({
  initiatives: rawItems,
  activity,
  firstName,
  role,
}: Props) {
  const items = rawItems.filter((item) => !item.archivedAt);
  const inProduction = items.filter((item) => item.currentStage === "production");
  const readyForReview = items
    .filter((item) => item.status === "submitted")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <div className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <div className="relative z-10">
          <DashboardGreeting
            firstName={firstName}
            role={role}
            subtitle="What's moving through the pipeline, and what's live in production."
          />
        </div>
      </header>

      <section className="mb-10">
        <SectionHeading
          kicker="Leadership queue"
          trailing={
            <span className="font-display text-xs font-bold tabular-nums text-muted">
              {readyForReview.length}
            </span>
          }
        >
          Ready for review
        </SectionHeading>
        {readyForReview.length === 0 ? (
          <div className="border border-border bg-surface px-4 py-4 text-sm text-muted">
            No workstreams are waiting on a decision. Anything submitted for
            approval will land here.
          </div>
        ) : (
          <ul className="border border-border">
            {readyForReview.map((item, index) => {
              const destination = nextStage(item.currentStage);
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
                      className="h-8 w-0.5 shrink-0"
                      style={{
                        backgroundColor: getStageColor(item.currentStage),
                      }}
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
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {item.submitter.name}
                        {destination
                          ? ` · Advance to ${destination.name}`
                          : " · Ready to approve"}
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

      <section className="mb-10">
        <SectionHeading
          kicker="All phases"
          trailing={<KanbanFullscreen initiatives={rawItems} />}
        >
          Pipeline
        </SectionHeading>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const stageItems = items.filter(
              (item) => item.currentStage === stage.id,
            );
            const color = getStageColor(stage.id);
            return (
              <div
                key={stage.id}
                className="flex min-w-[200px] flex-1 flex-col border border-border bg-surface"
              >
                <Link
                  href={STAGE_HREF[stage.id] ?? "/overview"}
                  className="group flex items-center justify-between gap-2 border-b border-border px-3 py-2.5"
                  style={{ borderTopWidth: 3, borderTopColor: color }}
                >
                  <div className="min-w-0">
                    <p
                      className="font-display text-[10px] font-bold uppercase tracking-wide"
                      style={{ color }}
                    >
                      {String(stage.number).padStart(2, "0")} {stage.name}
                    </p>
                  </div>
                  <span className="font-display text-sm font-extrabold tabular-nums text-muted">
                    {stageItems.length}
                  </span>
                </Link>
                <div className="flex max-h-[360px] flex-col gap-1.5 overflow-y-auto p-2">
                  {stageItems.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted">
                      Empty
                    </p>
                  )}
                  {stageItems.map((item) => (
                    <Link
                      key={item.id}
                      href={`/workstreams/${item.id}`}
                      className="group relative block border border-border bg-surface-elevated p-2.5 transition-colors hover:border-border-strong hover:bg-white/[0.04]"
                    >
                      <CornerTicks className={hoverTicks} />
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                          {item.ticketId}
                        </span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted">
                        {item.submitter.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading
          kicker="Live delivery"
          trailing={
            <Link
              href="/pipeline/production"
              className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Open production
              <ArrowUpRight className="size-3" />
            </Link>
          }
        >
          In production
        </SectionHeading>
        {inProduction.length === 0 ? (
          <div className="border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
            No live projects. Items land here after Onboarding.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {inProduction.map((item) => (
              <ProductionOverviewCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {activity.length > 0 && (
        <section>
          <SectionHeading kicker="Workspace">Recent moves</SectionHeading>
          <div className="border border-border">
            {activity.slice(0, 8).map((entry, index) => (
              <Link
                key={entry.id}
                href={`/workstreams/${entry.initiativeId}`}
                className={[
                  "group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]",
                  index > 0 ? "border-t border-border" : "",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-medium">{entry.userName}</span>{" "}
                    <span className="text-muted">
                      {formatActivityLabel(entry.action)}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    <span className="font-display font-bold uppercase tracking-wider">
                      {entry.ticketId}
                    </span>{" "}
                    {entry.title}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {timeAgo(entry.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ProductionOverviewCard({ item }: { item: InitiativeWithUsers }) {
  const rawParty = item.validationData?.leadProductionParty;
  const party = PARTIES.find((entry) => entry.id === (rawParty as PartyId));
  const priority = headlinePriority(item.validationData, item.scopingData);

  return (
    <Link
      href={`/workstreams/${item.id}`}
      className="group relative flex flex-col border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-white/[0.03]"
    >
      <CornerTicks className={hoverTicks} />
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
          {item.ticketId}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {party && (
            <span
              className="border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                borderColor: party.color,
                color: party.color,
                backgroundColor: party.background,
              }}
            >
              {party.short}
            </span>
          )}
          <ConsensusPriorityChip value={priority?.value} compact />
        </div>
      </div>
      <p className="mt-2 text-sm font-medium leading-snug">{item.title}</p>
      <p className="mt-2 text-xs text-muted">
        {party ? `Lead · ${party.label}` : "Lead party not set"}
      </p>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
        <p className="min-w-0 truncate text-xs text-muted">
          {item.submitter.name}
          {item.sponsor.name !== item.submitter.name
            ? ` · ${item.sponsor.name}`
            : ""}
        </p>
        <ArrowRight className="size-3.5 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
