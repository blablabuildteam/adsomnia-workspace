"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Calendar,
  Filter,
  Flag,
  Plus,
  Rocket,
  User,
  X,
} from "lucide-react";
import { AddFastTrackModal } from "@/components/fast-track/AddFastTrackModal";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import type { FastTrackItem } from "@/lib/fast-track";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const STATUS_CATEGORY_COLOR: Record<string, string> = {
  new: "#38BDF8",
  indeterminate: "#E8A07C",
  done: "#22c55e",
  undefined: "#A1A1A1",
};

const STATUS_FILTERS = [
  { key: "all", label: "All", color: "" },
  { key: "new", label: "To Do", color: STATUS_CATEGORY_COLOR.new },
  { key: "indeterminate", label: "In Progress", color: STATUS_CATEGORY_COLOR.indeterminate },
  { key: "done", label: "Done", color: STATUS_CATEGORY_COLOR.done },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

const UNASSIGNED = "Unassigned";
const PRIORITY_ORDER = ["Highest", "High", "Medium", "Low", "Lowest", "None", "—"];

function assigneeLabel(item: FastTrackItem): string {
  return item.assignee?.trim() || UNASSIGNED;
}

function uniqueSorted(values: string[], preferredOrder?: readonly string[]): string[] {
  const unique = [...new Set(values)];
  return unique.sort((a, b) => {
    if (preferredOrder) {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }
    }
    if (a === UNASSIGNED) return 1;
    if (b === UNASSIGNED) return -1;
    return a.localeCompare(b);
  });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function StatusBadge({
  status,
  category,
}: {
  status: string;
  category: string;
}) {
  const color = STATUS_CATEGORY_COLOR[category] ?? STATUS_CATEGORY_COLOR.undefined;
  return (
    <span
      className="inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: color, color }}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}

function FastTrackDrawer({
  item,
  onClose,
}: {
  item: FastTrackItem;
  onClose: () => void;
}) {
  const initiative = item.initiative;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-scrim"
        aria-label="Close task details"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-bbb">
              {initiative?.ticketId ?? item.jiraKey ?? "Fast-Track"}
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold uppercase leading-tight tracking-tight">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center border border-border text-muted hover:border-border-strong hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={item.status} category={item.statusCategory} />
            <span className="inline-flex items-center border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {item.priority}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Assignee
              </dt>
              <dd className="mt-1 text-foreground">{item.assignee ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Reporter
              </dt>
              <dd className="mt-1 text-foreground">{item.reporter ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Created
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-foreground">
                <Calendar className="size-3.5 text-muted" />
                {formatDate(item.created)}
              </dd>
            </div>
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Updated
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-foreground">
                <Calendar className="size-3.5 text-muted" />
                {formatDate(item.updated)}
              </dd>
            </div>
          </dl>

          {initiative && (
            <div className="space-y-4 border-t border-border pt-5">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-bbb">
                Original initiative
              </p>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Submitter
                  </dt>
                  <dd className="mt-1 text-foreground">{initiative.submitter}</dd>
                </div>
                <div>
                  <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Sponsor
                  </dt>
                  <dd className="mt-1 text-foreground">{initiative.sponsor}</dd>
                </div>
              </dl>
              <Field label="Problem statement" value={initiative.problemStatement} />
              <Field
                label="Opportunity / solution"
                value={initiative.opportunitySolution}
              />
              <Field label="Expected impact" value={initiative.expectedImpact} />
              <Field label="Target audience" value={initiative.targetAudience} />
              <Field label="Leadership remark" value={initiative.remark} />
            </div>
          )}

          {item.description && !initiative?.problemStatement && (
            <Field label="Description" value={item.description} />
          )}
        </div>

        <div className="space-y-2 border-t border-border px-5 py-4">
          {initiative && (
            <Link
              href={`/workstreams/${initiative.id}`}
              className="inline-flex w-full items-center justify-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-foreground hover:border-border-strong"
            >
              Open workstream
            </Link>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background hover:opacity-90"
            >
              Open in Jira
              {item.jiraKey ? ` · ${item.jiraKey}` : ""}
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}

type Props = {
  items: FastTrackItem[];
  boardUrl: string | null;
  fetchError?: string | null;
  canAdd?: boolean;
};

export function FastTrackView({
  items,
  boardUrl,
  fetchError,
  canAdd = false,
}: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const priorities = useMemo(
    () => uniqueSorted(items.map((item) => item.priority), PRIORITY_ORDER),
    [items],
  );
  const assignees = useMemo(
    () => uniqueSorted(items.map(assigneeLabel)),
    [items],
  );

  const statusFiltered = useMemo(
    () =>
      statusFilter === "all"
        ? items
        : items.filter((item) => item.statusCategory === statusFilter),
    [items, statusFilter],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: items.length,
      new: 0,
      indeterminate: 0,
      done: 0,
    };
    for (const item of items) {
      if (
        item.statusCategory === "new" ||
        item.statusCategory === "indeterminate" ||
        item.statusCategory === "done"
      ) {
        counts[item.statusCategory] += 1;
      }
    }
    return counts;
  }, [items]);

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(
      priorities.map((priority) => [priority, 0]),
    );
    for (const item of statusFiltered) {
      counts[item.priority] = (counts[item.priority] ?? 0) + 1;
    }
    return counts;
  }, [priorities, statusFiltered]);

  const assigneeCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(
      assignees.map((assignee) => [assignee, 0]),
    );
    for (const item of statusFiltered) {
      const key = assigneeLabel(item);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [assignees, statusFiltered]);

  const filtered = useMemo(
    () =>
      statusFiltered.filter((item) => {
        if (priorityFilter && item.priority !== priorityFilter) return false;
        if (assigneeFilter && assigneeLabel(item) !== assigneeFilter) return false;
        return true;
      }),
    [statusFiltered, priorityFilter, assigneeFilter],
  );

  const hasDimensionFilters = priorityFilter !== null || assigneeFilter !== null;
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center border border-bbb text-bbb">
              <Rocket className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
                Fast-Track
              </p>
              <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
                Fast Track
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Quick fixes that skip the pipeline — one or two people, about a
                day of work. Tasks live on the Adsomnia Fast Track Jira board.
              </p>
            </div>
          </div>
          {(canAdd || boardUrl) && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {canAdd && (
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
                >
                  <Plus className="size-3.5" />
                  Add task
                </button>
              )}
              {boardUrl && (
                <a
                  href={boardUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-foreground bg-transparent px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  <Image
                    src="/logos/jira.png"
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 object-contain"
                  />
                  Open board in Jira
                  <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {fetchError && (
        <p className="mb-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {fetchError}
        </p>
      )}

      <div className="mb-4 flex items-center gap-2 overflow-x-auto border-b border-border pb-px">
        <Filter className="mr-1 size-3.5 shrink-0 text-muted/60" />
        {STATUS_FILTERS.map((filter) => {
          const isActive = statusFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatusFilter(filter.key)}
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
                {statusCounts[filter.key]}
              </span>
            </button>
          );
        })}
      </div>

      {(priorities.length > 0 || assignees.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          {priorities.length > 0 && (
            <div className="flex items-center gap-2">
              <Flag className="size-3.5 shrink-0 text-muted/60" />
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Priority
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {priorities.map((priority) => {
                  const isActive = priorityFilter === priority;
                  return (
                    <button
                      key={priority}
                      type="button"
                      onClick={() =>
                        setPriorityFilter((current) =>
                          current === priority ? null : priority,
                        )
                      }
                      className={[
                        "border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                        isActive
                          ? "border-foreground bg-foreground/[0.06] text-foreground"
                          : "border-border text-muted hover:border-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {priority}
                      <span
                        className={[
                          "ml-1.5 tabular-nums",
                          isActive ? "text-foreground" : "text-muted/60",
                        ].join(" ")}
                      >
                        {priorityCounts[priority] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {assignees.length > 0 && (
            <div className="flex items-center gap-2">
              <User className="size-3.5 shrink-0 text-muted/60" />
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Assignee
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {assignees.map((assignee) => {
                  const isActive = assigneeFilter === assignee;
                  return (
                    <button
                      key={assignee}
                      type="button"
                      onClick={() =>
                        setAssigneeFilter((current) =>
                          current === assignee ? null : assignee,
                        )
                      }
                      className={[
                        "border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                        isActive
                          ? "border-foreground bg-foreground/[0.06] text-foreground"
                          : "border-border text-muted hover:border-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {assignee}
                      <span
                        className={[
                          "ml-1.5 tabular-nums",
                          isActive ? "text-foreground" : "text-muted/60",
                        ].join(" ")}
                      >
                        {assigneeCounts[assignee] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasDimensionFilters && (
            <button
              type="button"
              onClick={() => {
                setPriorityFilter(null);
                setAssigneeFilter(null);
              }}
              className="font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Title
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Status
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Priority
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Assignee
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Reporter
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Jira
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  {items.length === 0
                    ? "No Fast-Track tasks yet."
                    : "No Fast-Track tasks match the current filters."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  className="group relative cursor-pointer border-b border-border last:border-b-0 hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    <CornerTicks className={hoverTicks} />
                    {item.title}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={item.status}
                      category={item.statusCategory}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted">
                    {item.priority}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 text-muted" />
                      {item.assignee ?? "Unassigned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 text-muted" />
                      {item.reporter ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.url && item.jiraKey ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-bbb hover:underline"
                      >
                        {item.jiraKey}
                        <ArrowUpRight className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <FastTrackDrawer item={selected} onClose={() => setSelectedId(null)} />
      )}

      {canAdd && (
        <AddFastTrackModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onCreated={(key) => {
            setAddOpen(false);
            setStatusFilter("all");
            setPriorityFilter(null);
            setAssigneeFilter(null);
            setSelectedId(key);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
