"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Building2,
  CalendarRange,
  Filter,
  LayoutList,
  RefreshCw,
} from "lucide-react";
import { refreshProductionOverview } from "@/app/(workspace)/pipeline/production/actions";
import { ProductionDetailDrawer } from "@/components/production/ProductionDetailDrawer";
import { ProductionProjectCard } from "@/components/production/ProductionProjectCard";
import { ProductionTimelineView } from "@/components/production/ProductionTimelineView";
import { PipelineStageHeader } from "@/components/pipeline/PipelineStageHeader";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PARTIES, STAGES } from "@/data/workflow";
import {
  HEALTH_META,
  type ProductionLeadParty,
  type ProductionProject,
} from "@/lib/production/health";

const stage = STAGES.find((item) => item.id === "production")!;

const LEAD_FILTERS: ProductionLeadParty[] = ["adsomnia", "btr", "hn"];

type HealthFilter = "all" | "critical" | "at-risk" | "on-track";

const HEALTH_FILTERS: { key: HealthFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "at-risk", label: "At Risk" },
  { key: "on-track", label: "On Track" },
];

type LayoutMode = "list" | "timeline";

type Props = {
  projects: ProductionProject[];
  archived: ProductionProject[];
  canArchive: boolean;
};

export function ProductionOverview({
  projects,
  archived,
  canArchive,
}: Props) {
  const router = useRouter();
  const [layout, setLayout] = useState<LayoutMode>("timeline");
  const [archiveView, setArchiveView] = useState(false);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [leadPartyFilter, setLeadPartyFilter] =
    useState<ProductionLeadParty | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshing, startRefresh] = useTransition();

  const counts = useMemo(() => {
    const next: Record<HealthFilter, number> = {
      all: projects.length,
      critical: 0,
      "at-risk": 0,
      "on-track": 0,
    };
    for (const project of projects) {
      if (project.health === "critical") next.critical += 1;
      else if (project.health === "at-risk") next["at-risk"] += 1;
      else if (project.health === "on-track") next["on-track"] += 1;
    }
    return next;
  }, [projects]);

  const source = archiveView ? archived : projects;

  const leadCounts = useMemo(() => {
    const next = { adsomnia: 0, btr: 0, hn: 0 };
    for (const project of source) {
      if (project.leadPartyId) next[project.leadPartyId] += 1;
    }
    return next;
  }, [source]);

  const filtered = useMemo(() => {
    return source.filter((project) => {
      if (
        !archiveView &&
        healthFilter !== "all" &&
        project.health !== healthFilter
      ) {
        return false;
      }
      if (leadPartyFilter && project.leadPartyId !== leadPartyFilter) {
        return false;
      }
      return true;
    });
  }, [source, archiveView, healthFilter, leadPartyFilter]);

  const selected =
    [...projects, ...archived].find((project) => project.id === selectedId) ??
    null;

  function refresh() {
    startRefresh(async () => {
      await refreshProductionOverview();
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PipelineStageHeader stage={stage} />

      <div className="mb-4 flex items-center gap-2 overflow-x-auto border-b border-border pb-px">
        <Filter className="mr-1 size-3.5 shrink-0 text-muted/60" />
        {HEALTH_FILTERS.map((filter) => {
          const isActive = !archiveView && healthFilter === filter.key;
          const color =
            filter.key === "all" ? undefined : HEALTH_META[filter.key].color;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                setArchiveView(false);
                setHealthFilter(filter.key);
              }}
              className={[
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              {color && (
                <span
                  className="size-2"
                  style={{ backgroundColor: color }}
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
        <button
          type="button"
          onClick={() => setArchiveView(true)}
          aria-pressed={archiveView}
          className={[
            "ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors",
            archiveView
              ? "border-foreground text-foreground"
              : "border-transparent text-muted hover:text-foreground",
          ].join(" ")}
        >
          <Archive className="size-3.5" />
          Archive
          <span
            className={[
              "tabular-nums",
              archiveView ? "text-foreground" : "text-muted/60",
            ].join(" ")}
          >
            {archived.length}
          </span>
        </button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-3.5 shrink-0 text-muted/60" />
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Lead Party
            </span>
            <div className="flex items-center gap-1.5">
              {LEAD_FILTERS.map((partyId) => {
                const isActive = leadPartyFilter === partyId;
                const party = PARTIES.find((item) => item.id === partyId)!;
                return (
                  <button
                    key={partyId}
                    type="button"
                    onClick={() =>
                      setLeadPartyFilter((current) =>
                        current === partyId ? null : partyId,
                      )
                    }
                    className={[
                      "border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                      isActive
                        ? "border-foreground bg-foreground/[0.06] text-foreground"
                        : "border-border text-muted hover:border-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {party.label}
                    <span
                      className={[
                        "ml-1.5 tabular-nums",
                        isActive ? "text-foreground" : "text-muted/60",
                      ].join(" ")}
                    >
                      {leadCounts[partyId]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {leadPartyFilter && (
            <button
              type="button"
              onClick={() => setLeadPartyFilter(null)}
              className="font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border border-border">
            <button
              type="button"
              onClick={() => {
                setArchiveView(false);
                setLayout("timeline");
              }}
              aria-pressed={!archiveView && layout === "timeline"}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                !archiveView && layout === "timeline"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              <CalendarRange className="size-3.5" />
              Timeline
            </button>
            <button
              type="button"
              onClick={() => {
                setArchiveView(false);
                setLayout("list");
              }}
              aria-pressed={!archiveView && layout === "list"}
              className={[
                "inline-flex items-center gap-1.5 px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                !archiveView && layout === "list"
                  ? "bg-foreground text-background"
                  : "text-muted hover:text-foreground",
              ].join(" ")}
            >
              <LayoutList className="size-3.5" />
              List
            </button>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw
              className={["size-3.5", refreshing ? "animate-spin" : ""].join(
                " ",
              )}
            />
            Refresh
          </button>
        </div>
      </div>

      <section>
        {filtered.length === 0 ? (
          <div className="relative border border-border bg-surface px-5 py-16 text-center">
            <CornerTicks />
            <p className="text-sm text-muted">
              {archiveView
                ? "No archived production projects yet."
                : projects.length === 0
                  ? "No workstreams are in Production yet. Complete Onboarding to land a project here."
                  : "No projects match the current filters."}
            </p>
          </div>
        ) : archiveView || layout === "list" ? (
          <div
            key={`list-${archiveView ? "archive" : layout}-${healthFilter}-${leadPartyFilter ?? ""}`}
            className="grid items-stretch gap-4 lg:grid-cols-2"
          >
            {filtered.map((project, index) => (
              <div
                key={project.id}
                className="animate-card-enter h-full"
                style={
                  {
                    "--enter-delay": `${Math.min(index, 8) * 45}ms`,
                  } as React.CSSProperties
                }
              >
                <ProductionProjectCard
                  project={project}
                  onOpen={setSelectedId}
                />
              </div>
            ))}
          </div>
        ) : (
          <ProductionTimelineView
            projects={filtered}
            onOpen={setSelectedId}
          />
        )}
      </section>

      <ProductionDetailDrawer
        project={selected}
        canArchive={canArchive}
        onClose={() => setSelectedId(null)}
        onArchived={() => {
          setSelectedId(null);
          router.refresh();
        }}
      />
    </div>
  );
}
