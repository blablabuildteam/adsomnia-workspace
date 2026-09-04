"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Settings,
  Users,
} from "lucide-react";
import { STAGES, getPhaseProgressFill, getStageColor, PARTIES } from "@/data/workflow";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PipelineStageHeader } from "@/components/pipeline/PipelineStageHeader";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  PRIORITY_META,
  consensusPriority,
  getSetupProgress,
  type SetupData,
} from "@/lib/validation-data";
import { formatEuro, summarizeTeamCost } from "@/data/role-rates";

type SetupTool = {
  key: string;
  logo: string;
  label: string;
  href?: string;
  ready: boolean;
};

function setupToolChips(setup: SetupData | null): SetupTool[] {
  const slackName = setup?.slack.channelName?.replace(/^#/, "");
  const slackUrl = setup?.slack.channelUrl;
  const jiraName = setup?.jira.projectName || setup?.jira.projectKey;
  const jiraUrl = setup?.jira.boardUrl || setup?.jira.projectUrl;
  const driveName = setup?.drive.driveName;
  const driveUrl = setup?.drive.driveUrl;

  return [
    {
      key: "drive",
      logo: "/logos/google-drive.png",
      label: driveName || "Google Drive",
      href: driveUrl,
      ready: !!(driveUrl || setup?.drive.status === "completed"),
    },
    {
      key: "jira",
      logo: "/logos/jira.png",
      label: jiraName || "Jira",
      href: jiraUrl,
      ready: !!(jiraUrl || setup?.jira.status === "completed"),
    },
    {
      key: "slack",
      logo: "/logos/slack.png",
      label: slackName ? `#${slackName}` : "Slack",
      href: slackUrl,
      ready: !!(slackUrl || slackName || setup?.slack.status === "completed"),
    },
  ];
}

function SetupToolChip({ logo, label, href, ready }: Omit<SetupTool, "key">) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        className={[
          "size-3.5 shrink-0 object-contain",
          ready ? "" : "opacity-40",
        ].join(" ")}
      />
      <span className="min-w-0 truncate">{label}</span>
      {href && (
        <ExternalLink className="size-2.5 shrink-0 text-muted/50 transition-colors group-hover/tool:text-foreground" />
      )}
    </>
  );

  const cls = [
    "group/tool inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-[10px]",
    ready
      ? "border border-border text-foreground/80"
      : "border border-dashed border-border text-muted/50",
  ].join(" ");

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className={`${cls} transition-colors hover:border-foreground/40 hover:text-foreground`}
      >
        {inner}
      </a>
    );
  }

  return <span className={cls}>{inner}</span>;
}

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const stage = STAGES.find((s) => s.id === "setup")!;
const stageColor = getStageColor("setup");

type FilterKey = "all" | "in-progress" | "complete";

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#FFFFFF" },
  { key: "in-progress", label: "In Progress", color: "#EAB308" },
  { key: "complete", label: "Complete", color: "#22C55E" },
];

function getEffectiveStatus(
  setupData: SetupData | null,
): Exclude<FilterKey, "all"> {
  const progress = getSetupProgress(setupData);
  return progress.allDone ? "complete" : "in-progress";
}

function SetupCard({ item }: { item: InitiativeWithUsers }) {
  const daysSinceUpdate = Math.floor(
    (Date.now() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const sd = item.scopingData;
  const setup = item.setupData;
  const progress = getSetupProgress(setup);
  const leadParty = item.validationData?.leadProductionParty;
  const leadPartyLabel = leadParty
    ? PARTIES.find((p) => p.id === leadParty)?.label ?? leadParty
    : undefined;
  const tShirtSize = item.validationData?.tShirtSize;
  const consensus = consensusPriority(sd);
  const teamCount = sd?.team?.length ?? 0;
  const teamCost = sd?.team?.length ? summarizeTeamCost(sd.team) : null;
  const tools = setupToolChips(setup);
  const href = `/workstreams/${item.id}`;

  return (
    <div className="group relative flex h-full flex-col border border-border bg-surface transition-colors hover:border-border-strong hover:bg-white/[0.02]">
      <CornerTicks className={hoverTicks} />

      <Link href={href} className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="font-display shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
              {item.ticketId}
            </span>
            {progress.allDone ? (
              <span className="inline-flex items-center gap-1 border border-success/40 bg-success/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-success">
                <CheckCircle2 className="size-3" />
                Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 border border-[#EAB308]/40 bg-[#EAB308]/10 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-[#EAB308]">
                <Settings className="size-3" />
                Setting Up
              </span>
            )}
            {tShirtSize && (
              <span className="shrink-0 border border-border px-1.5 py-0.5 font-display text-[10px] font-bold text-muted">
                {tShirtSize}
              </span>
            )}
            {consensus && (
              <span
                className="shrink-0 font-display text-[10px] font-bold uppercase tracking-wide"
                style={{ color: PRIORITY_META[consensus]?.color }}
                title="Consensus priority"
              >
                {consensus}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted/70">
            <Clock className="size-3" />
            {daysSinceUpdate === 0
              ? "Today"
              : daysSinceUpdate === 1
                ? "1 day ago"
                : `${daysSinceUpdate}d`}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col px-5 py-4">
          <h3 className="text-sm font-semibold leading-snug group-hover:text-foreground">
            {item.title}
          </h3>

          {/* Progress bar */}
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="h-1.5 w-full bg-white/[0.04]">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${(progress.completed / progress.total) * 100}%`,
                    backgroundColor: getPhaseProgressFill(
                      stageColor,
                      progress.allDone,
                    ),
                  }}
                />
              </div>
            </div>
            <span className="shrink-0 font-display text-xs font-bold tabular-nums text-muted">
              {progress.completed}/{progress.total}
            </span>
          </div>

          {/* Metrics */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px] text-muted">
            {teamCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" />
                {teamCount} members
              </span>
            )}
            {teamCost?.total != null && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                € {formatEuro(teamCost.total)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-5 py-2.5">
        {tools.map((tool) => (
          <SetupToolChip
            key={tool.key}
            logo={tool.logo}
            label={tool.label}
            href={tool.href}
            ready={tool.ready}
          />
        ))}
      </div>

      <Link
        href={href}
        className="flex items-center justify-between border-t border-border px-5 py-3"
      >
        <div className="flex items-center gap-2">
          {leadPartyLabel && (
            <span className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
              <Building2 className="size-3" />
              {leadPartyLabel}
            </span>
          )}
        </div>
        <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

type Props = {
  initiatives: InitiativeWithUsers[];
};

export function SetupStageView({ initiatives }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const inStage = initiatives.filter((i) => i.currentStage === "setup");

  const statusFiltered =
    activeFilter === "all"
      ? inStage
      : inStage.filter(
          (i) => getEffectiveStatus(i.setupData) === activeFilter,
        );

  const counts: Record<FilterKey, number> = {
    all: inStage.length,
    "in-progress": inStage.filter(
      (i) => getEffectiveStatus(i.setupData) === "in-progress",
    ).length,
    complete: inStage.filter(
      (i) => getEffectiveStatus(i.setupData) === "complete",
    ).length,
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PipelineStageHeader stage={stage} />

      <div className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-border pb-px">
        <Filter className="mr-1 size-3.5 shrink-0 text-muted/60" />
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={[
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              {filter.key !== "all" && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: filter.color }}
                />
              )}
              {filter.label}
              <span
                className={[
                  "ml-0.5 tabular-nums",
                  isActive ? "text-foreground" : "text-muted/60",
                ].join(" ")}
              >
                {counts[filter.key]}
              </span>
            </button>
          );
        })}
      </div>

      <section>
        {statusFiltered.length === 0 && (
          <div className="relative border border-border bg-surface px-5 py-16 text-center">
            <CornerTicks />
            <Settings className="mx-auto size-8 text-muted/40" />
            <p className="mt-3 text-sm text-muted">
              {activeFilter === "all"
                ? "No initiatives in Project Setup yet. Approve a Go/No-Go decision to advance here."
                : "No initiatives match the current filter."}
            </p>
          </div>
        )}
        <div
          key={activeFilter}
          className="grid items-stretch gap-4 sm:grid-cols-2"
        >
          {statusFiltered.map((item, index) => (
            <div
              key={item.id}
              className="animate-card-enter h-full"
              style={
                {
                  "--enter-delay": `${Math.min(index, 8) * 45}ms`,
                } as React.CSSProperties
              }
            >
              <SetupCard item={item} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
