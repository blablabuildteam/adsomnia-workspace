"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Filter,
  FileText,
  PauseCircle,
  User,
  XCircle,
} from "lucide-react";
import { STAGES, getParty } from "@/data/workflow";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PipelineStrip } from "@/components/pipeline/PipelineStrip";
import type { InitiativeWithUsers } from "@/lib/queries";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const stage = STAGES.find((s) => s.id === "validation")!;
const party = getParty(stage.parties[0]);

type FilterKey = "all" | "submitted" | "on-hold" | "rejected";

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#FFFFFF" },
  { key: "submitted", label: "To be Reviewed", color: "#FFFFFF" },
  { key: "on-hold", label: "On Hold", color: "#7E90A3" },
  { key: "rejected", label: "Rejected", color: "#FF3B1F" },
];

const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  draft: { label: "Draft", color: "#666666", icon: Clock },
  submitted: { label: "To be Reviewed", color: "#FFFFFF", icon: ArrowUpRight },
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

function ValidationCard({ item }: { item: InitiativeWithUsers }) {
  const daysSinceUpdate = Math.floor(
    (Date.now() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const vd = item.validationData;
  const filledFields = vd
    ? [
        vd.businessValue,
        vd.solutionDirection,
        vd.tShirtSize,
        vd.priority,
        vd.leadProductionParty,
        vd.dependencies,
        vd.risks,
      ].filter(Boolean).length
    : 0;

  return (
    <Link
      href={`/initiatives/${item.id}`}
      className="group relative block border border-border bg-surface transition-colors hover:border-border-strong hover:bg-white/[0.02]"
    >
      <CornerTicks className={hoverTicks} />
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

      <div className="px-5 py-4">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-foreground">
          {item.title}
        </h3>

        {vd?.businessValue && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
            {vd.businessValue}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4">
          {vd?.tShirtSize && (
            <span className="border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {vd.tShirtSize}
            </span>
          )}
          {vd?.priority && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
              {vd.priority}
            </span>
          )}
          <span className="text-[10px] text-muted/60">
            {filledFields}/8 fields
          </span>
        </div>
      </div>

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

export function ValidationStageView({ initiatives }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const inStage = initiatives.filter((i) => i.currentStage === "validation");

  const counts: Record<FilterKey, number> = {
    all: inStage.length,
    submitted: inStage.filter((i) => i.status === "submitted").length,
    "on-hold": inStage.filter((i) => i.status === "on-hold").length,
    rejected: inStage.filter((i) => i.status === "rejected").length,
  };

  const filtered =
    activeFilter === "all"
      ? inStage
      : inStage.filter((i) => i.status === activeFilter);

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <BrandTexture variant="hero" />
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <span
              className="flex size-9 shrink-0 items-center justify-center border text-sm font-bold"
              style={{ borderColor: party.color, color: party.color }}
            >
              02
            </span>
            <h1 className="font-display truncate text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
              Validation
            </h1>
          </div>
        </div>
        <PipelineStrip
          currentStageId="validation"
          className="shrink-0 sm:w-[440px] lg:w-[560px]"
        />
      </header>

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
        {filtered.length === 0 && (
          <div className="relative border border-border bg-surface px-5 py-16 text-center">
            <CornerTicks />
            <FileText className="mx-auto size-8 text-muted/40" />
            <p className="mt-3 text-sm text-muted">
              {activeFilter === "all"
                ? "No initiatives in Validation yet. Approve an initiative to advance it here."
                : `No initiatives with status "${FILTERS.find((f) => f.key === activeFilter)?.label}".`}
            </p>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => (
            <ValidationCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
