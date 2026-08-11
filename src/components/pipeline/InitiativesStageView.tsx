"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Filter,
  Lightbulb,
  PauseCircle,
  User,
  XCircle,
} from "lucide-react";
import { STAGES, getParty } from "@/data/workflow";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import type { InitiativeWithUsers } from "@/lib/queries";

const hoverTicks = "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const stage = STAGES.find((s) => s.id === "idea")!;
const party = getParty(stage.parties[0]);

type FilterKey = "all" | "submitted" | "approved" | "on-hold" | "rejected";

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#FFFFFF" },
  { key: "submitted", label: "Review", color: "#FFFFFF" },
  { key: "approved", label: "Approved", color: "#22c55e" },
  { key: "on-hold", label: "On Hold", color: "#7E90A3" },
  { key: "rejected", label: "Rejected", color: "#FF3B1F" },
];

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  draft: { label: "Draft", color: "#666666", icon: Clock },
  submitted: { label: "Review", color: "#FFFFFF", icon: ArrowUpRight },
  approved: { label: "Approved", color: "#22c55e", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "#FF3B1F", icon: XCircle },
  "on-hold": { label: "On Hold", color: "#7E90A3", icon: PauseCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: meta.color, color: meta.color }}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

function InitiativeCard({ item }: { item: InitiativeWithUsers }) {
  const daysSinceUpdate = Math.floor(
    (Date.now() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <Link
      href={`/initiatives/${item.id}`}
      className="group relative block border border-border bg-surface transition-colors hover:border-border-strong hover:bg-white/[0.02]"
    >
      <CornerTicks className={hoverTicks} />
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
            {item.ticketId}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted/70">
          <Clock className="size-3" />
          {daysSinceUpdate === 0
            ? "Today"
            : daysSinceUpdate === 1
              ? "1 day ago"
              : `${daysSinceUpdate} days ago`}
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-foreground">
          {item.title}
        </h3>

        {item.problemStatement && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
            {item.problemStatement}
          </p>
        )}

        {item.expectedImpact && (
          <div className="mt-3 border-l-2 border-border pl-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted/60">
              Expected Impact
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">
              {item.expectedImpact}
            </p>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <User className="size-3" />
            <span>{item.submitter.name}</span>
          </div>
          <div className="text-[10px] text-muted/50">
            Sponsor: {item.sponsor.name}
          </div>
        </div>
        <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

type Props = {
  initiatives: InitiativeWithUsers[];
};

export function InitiativesStageView({ initiatives }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const inStage = initiatives.filter((i) => i.currentStage === "idea");

  const counts: Record<FilterKey, number> = {
    all: inStage.length,
    submitted: inStage.filter((i) => i.status === "submitted").length,
    approved: inStage.filter((i) => i.status === "approved").length,
    "on-hold": inStage.filter((i) => i.status === "on-hold").length,
    rejected: inStage.filter((i) => i.status === "rejected").length,
  };

  const filtered =
    activeFilter === "all"
      ? inStage
      : inStage.filter((i) => i.status === activeFilter);

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <header className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <BrandTexture variant="hero" />
        <div>
          <div className="flex items-center gap-3">
            <span
              className="flex size-7 items-center justify-center border text-xs font-bold"
              style={{ borderColor: party.color, color: party.color }}
            >
              01
            </span>
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
              Stage 1 — {stage.owner}
            </p>
          </div>
          <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
            Initiatives
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            All initiatives currently in the intake phase — submitted proposals
            awaiting leadership review before advancing to Validation.
          </p>
        </div>
        <Link
          href="/ideas/new"
          className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
        >
          <Lightbulb className="size-3.5" />
          Submit New Initiative
        </Link>
      </header>

      {/* Filter tabs */}
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

      {/* Initiatives grid */}
      <section>
        {filtered.length === 0 && (
          <div className="relative border border-border bg-surface px-5 py-16 text-center">
            <CornerTicks />
            <Lightbulb className="mx-auto size-8 text-muted/40" />
            <p className="mt-3 text-sm text-muted">
              {activeFilter === "all"
                ? "No initiatives in this stage yet."
                : `No initiatives with status "${FILTERS.find((f) => f.key === activeFilter)?.label}".`}
            </p>
            {activeFilter === "all" && (
              <Link
                href="/ideas/new"
                className="mt-4 inline-flex items-center gap-2 border border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
              >
                Submit the first initiative
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => (
            <InitiativeCard key={item.id} item={item} />
          ))}
        </div>
      </section>

    </div>
  );
}
