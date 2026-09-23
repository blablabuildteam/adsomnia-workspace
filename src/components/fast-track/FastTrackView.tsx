"use client";

import { Fragment, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Filter,
  Flag,
  Plus,
  Rocket,
  User,
  X,
} from "lucide-react";
import { AddFastTrackModal } from "@/components/fast-track/AddFastTrackModal";
import { AddNestedFastTrackModal } from "@/components/fast-track/AddNestedFastTrackModal";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import type { FastTrackItem, FastTrackTask } from "@/lib/fast-track";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const STATUS_CATEGORY_COLOR: Record<string, string> = {
  new: "#38BDF8",
  indeterminate: "#E8A07C",
  done: "#22c55e",
  undefined: "#A1A1A1",
};

const NEW_STATUS_COLOR = "#FFFFFF";

const STATUS_FILTERS = [
  { key: "all", label: "All", color: "" },
  { key: "new", label: "To Do", color: STATUS_CATEGORY_COLOR.new },
  { key: "indeterminate", label: "In Progress", color: STATUS_CATEGORY_COLOR.indeterminate },
  { key: "done", label: "Done", color: STATUS_CATEGORY_COLOR.done },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

const UNASSIGNED = "Unassigned";
const PRIORITY_ORDER = ["Highest", "High", "Medium", "Low", "Lowest", "None", "—"];

function assigneeLabel(item: { assignee: string | null }): string {
  return item.assignee?.trim() || UNASSIGNED;
}

function rowMatches(
  row: { statusCategory: string; priority: string; assignee: string | null },
  statusFilter: StatusFilter,
  priorityFilter: string | null,
  assigneeFilter: string | null,
): boolean {
  if (statusFilter !== "all" && row.statusCategory !== statusFilter) return false;
  if (priorityFilter && row.priority !== priorityFilter) return false;
  if (assigneeFilter && assigneeLabel(row) !== assigneeFilter) return false;
  return true;
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

function countTaskProgress(tasks: { statusCategory: string }[]) {
  let open = 0;
  let inProgress = 0;
  let done = 0;
  for (const task of tasks) {
    if (task.statusCategory === "done") done += 1;
    else if (task.statusCategory === "indeterminate") inProgress += 1;
    else open += 1;
  }
  return { open, inProgress, done };
}

function TaskProgress({
  open,
  inProgress,
  done,
}: {
  open: number;
  inProgress: number;
  done: number;
}) {
  const total = open + inProgress + done;
  if (total === 0) return null;
  const parts = [
    { count: open, label: "open", color: STATUS_CATEGORY_COLOR.new },
    { count: inProgress, label: "in progress", color: STATUS_CATEGORY_COLOR.indeterminate },
    { count: done, label: "done", color: STATUS_CATEGORY_COLOR.done },
  ];
  return (
    <span
      className="inline-flex items-center gap-2"
      title={parts.map((part) => `${part.count} ${part.label}`).join(", ")}
    >
      <span className="flex h-1 w-14 overflow-hidden bg-border" aria-hidden>
        {parts.map((part) => (
          <span
            key={part.label}
            style={{
              width: `${(part.count / total) * 100}%`,
              backgroundColor: part.color,
            }}
          />
        ))}
      </span>
      <span className="font-display text-[10px] font-bold tabular-nums text-muted">
        {total}
      </span>
    </span>
  );
}

function StatusBadge({
  status,
  category,
}: {
  status: string;
  category: string;
}) {
  const color =
    status.trim().toLowerCase() === "new"
      ? NEW_STATUS_COLOR
      : STATUS_CATEGORY_COLOR[category] ?? STATUS_CATEGORY_COLOR.undefined;
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
      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}

function FastTrackDrawer({
  item,
  parentTitle,
  tasks,
  canAddTask,
  onAddTask,
  onOpenTask,
  onClose,
}: {
  item: FastTrackItem | FastTrackTask;
  parentTitle?: string | null;
  tasks?: FastTrackTask[];
  canAddTask?: boolean;
  onAddTask?: () => void;
  onOpenTask?: (taskId: string) => void;
  onClose: () => void;
}) {
  const initiative = "initiative" in item ? item.initiative : null;

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
              {parentTitle
                ? `Task in ${parentTitle}`
                : initiative?.ticketId ?? item.jiraKey ?? "Fast-Track"}
            </p>
            <h2 className="mt-1 font-display text-lg font-extrabold uppercase leading-tight tracking-tight">
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

          <dl className="grid grid-cols-2 gap-4 text-xs">
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
              <dl className="grid grid-cols-2 gap-4 text-xs">
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

          {tasks && tasks.length > 0 && (
            <div className="space-y-2 border-t border-border pt-5">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-bbb">
                Tasks
              </p>
              <ul className="border border-border">
                {tasks.map((task) => (
                  <li key={task.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onOpenTask?.(task.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-hover"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-medium text-foreground">
                          {task.title}
                        </span>
                        <span className="mt-0.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                          {task.jiraKey ?? task.issueType}
                        </span>
                      </span>
                      <StatusBadge
                        status={task.status}
                        category={task.statusCategory}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border px-5 py-4">
          {canAddTask && onAddTask && (
            <button
              type="button"
              onClick={onAddTask}
              className="inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background hover:opacity-90"
            >
              <Plus className="size-3.5" />
              Add task
            </button>
          )}
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
  const [selection, setSelection] = useState<
    | { kind: "item"; id: string }
    | { kind: "task"; itemId: string; taskId: string }
    | null
  >(null);
  const [addOpen, setAddOpen] = useState(false);
  const [nestEpicKey, setNestEpicKey] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pendingTasks, setPendingTasks] = useState<
    Record<string, FastTrackTask[]>
  >({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);

  const boardItems = useMemo(
    () =>
      items.map((item) => {
        const key = item.jiraKey ?? "";
        const extra = (pendingTasks[key] ?? []).filter(
          (task) => !item.tasks.some((existing) => existing.jiraKey === task.jiraKey),
        );
        if (extra.length === 0) return item;
        return { ...item, tasks: [...item.tasks, ...extra] };
      }),
    [items, pendingTasks],
  );

  const countRows = useMemo(
    () => boardItems.flatMap((item) => [item, ...item.tasks]),
    [boardItems],
  );

  const priorities = useMemo(
    () => uniqueSorted(countRows.map((item) => item.priority), PRIORITY_ORDER),
    [countRows],
  );
  const assignees = useMemo(
    () => uniqueSorted(countRows.map(assigneeLabel)),
    [countRows],
  );

  const statusPass = useMemo(
    () =>
      statusFilter === "all"
        ? countRows
        : countRows.filter((item) => item.statusCategory === statusFilter),
    [countRows, statusFilter],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: countRows.length,
      new: 0,
      indeterminate: 0,
      done: 0,
    };
    for (const item of countRows) {
      if (
        item.statusCategory === "new" ||
        item.statusCategory === "indeterminate" ||
        item.statusCategory === "done"
      ) {
        counts[item.statusCategory] += 1;
      }
    }
    return counts;
  }, [countRows]);

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(
      priorities.map((priority) => [priority, 0]),
    );
    for (const item of statusPass) {
      counts[item.priority] = (counts[item.priority] ?? 0) + 1;
    }
    return counts;
  }, [priorities, statusPass]);

  const assigneeCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(
      assignees.map((assignee) => [assignee, 0]),
    );
    for (const item of statusPass) {
      const key = assigneeLabel(item);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [assignees, statusPass]);

  const filtersActive =
    statusFilter !== "all" || priorityFilter !== null || assigneeFilter !== null;

  const filtered = useMemo(
    () =>
      boardItems.flatMap((item) => {
        const parentMatches = rowMatches(
          item,
          statusFilter,
          priorityFilter,
          assigneeFilter,
        );
        const matchingTasks = item.tasks.filter((task) =>
          rowMatches(task, statusFilter, priorityFilter, assigneeFilter),
        );
        if (!parentMatches && matchingTasks.length === 0) return [];
        return [
          {
            ...item,
            tasks: filtersActive ? matchingTasks : item.tasks,
            taskTotal: item.tasks.length,
            progress: countTaskProgress(item.tasks),
          },
        ];
      }),
    [boardItems, statusFilter, priorityFilter, assigneeFilter, filtersActive],
  );

  const hasDimensionFilters = priorityFilter !== null || assigneeFilter !== null;
  const selectedItem = selection
    ? boardItems.find(
        (item) =>
          item.id === (selection.kind === "item" ? selection.id : selection.itemId),
      ) ?? null
    : null;
  const selectedTask =
    selection?.kind === "task"
      ? selectedItem?.tasks.find((task) => task.id === selection.taskId) ?? null
      : null;
  const nestEpic =
    boardItems.find((item) => item.jiraKey === nestEpicKey) ?? null;

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
              <h1 className="font-display mt-2 text-3xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-4xl">
                Fast Track
              </h1>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted">
                Quick fixes that skip the pipeline — one or two people, about a
                day of work. Each item is an epic on the Adsomnia Fast Track
                Jira board, with tasks nested underneath.
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
                  Add epic
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
        <p className="mb-4 border border-danger/40 bg-danger/10 px-4 py-3 text-xs text-danger">
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
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-[11px] font-medium uppercase tracking-wide transition-colors",
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
                <td colSpan={6} className="px-4 py-10 text-center text-xs text-muted">
                  {boardItems.length === 0
                    ? "No Fast-Track epics yet."
                    : "No Fast-Track work matches the current filters."}
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const tasksOpen =
                  item.tasks.length > 0 && expandedIds.has(item.id);
                const nestClass = [
                  "overflow-hidden transition-[max-height,opacity,padding] duration-200 ease-out motion-reduce:transition-none",
                  tasksOpen
                    ? "max-h-24 py-2 opacity-100"
                    : "max-h-0 py-0 opacity-0",
                ].join(" ");
                return (
                <Fragment key={item.id}>
                  <tr
                    tabIndex={0}
                    className="group relative cursor-pointer border-b border-border last:border-b-0 hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
                    onClick={() => setSelection({ kind: "item", id: item.id })}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelection({ kind: "item", id: item.id });
                      }
                    }}
                  >
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">
                      <CornerTicks className={hoverTicks} />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="min-w-0">
                            {item.isEpic && (
                              <span className="mr-2 font-display text-[10px] font-bold uppercase tracking-wide text-bbb">
                                Epic
                              </span>
                            )}
                            {item.title}
                          </span>
                          {item.taskTotal > 0 && (
                            <TaskProgress {...item.progress} />
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {item.taskTotal > 0 && (
                            <button
                              type="button"
                              aria-expanded={tasksOpen}
                              aria-label={
                                tasksOpen
                                  ? `Collapse tasks in ${item.title}`
                                  : `Expand tasks in ${item.title}`
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                setExpandedIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              className="inline-flex size-7 items-center justify-center text-muted hover:text-foreground"
                            >
                              <ChevronRight
                                className={[
                                  "size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
                                  tasksOpen ? "rotate-90" : "",
                                ].join(" ")}
                              />
                            </button>
                          )}
                          {canAdd && item.isEpic && item.jiraKey && (
                            <button
                              type="button"
                              aria-label={`Add a task in ${item.title}`}
                              title="Add task"
                              onClick={(event) => {
                                event.stopPropagation();
                                setNestEpicKey(item.jiraKey);
                              }}
                              className="inline-flex size-7 items-center justify-center border border-border text-muted transition-colors hover:border-foreground hover:text-foreground"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
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
                    <td className="px-4 py-2.5 text-xs text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="size-3 text-muted" />
                        {item.assignee ?? "Unassigned"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="size-3 text-muted" />
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
                          className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-bbb hover:underline"
                        >
                          {item.jiraKey}
                          <ArrowUpRight className="size-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                  {item.tasks.map((task) => (
                    <tr
                      key={task.id}
                      tabIndex={tasksOpen ? 0 : -1}
                      aria-hidden={!tasksOpen}
                      className={
                        tasksOpen
                          ? "cursor-pointer border-b border-border bg-background last:border-b-0 hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
                          : "pointer-events-none border-0"
                      }
                      onClick={() => {
                        if (!tasksOpen) return;
                        setSelection({
                          kind: "task",
                          itemId: item.id,
                          taskId: task.id,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (!tasksOpen || event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelection({
                            kind: "task",
                            itemId: item.id,
                            taskId: task.id,
                          });
                        }
                      }}
                    >
                      <td className={tasksOpen ? "border-l-2 border-bbb/70 p-0" : "p-0"}>
                        <div className={`${nestClass} pr-4 pl-10 text-xs text-foreground`}>
                          <span className="mr-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                            {task.issueType || "Task"}
                          </span>
                          {task.title}
                        </div>
                      </td>
                      <td className="p-0">
                        <div className={`${nestClass} px-4`}>
                          <StatusBadge
                            status={task.status}
                            category={task.statusCategory}
                          />
                        </div>
                      </td>
                      <td className="p-0">
                        <div className={`${nestClass} px-4 text-xs uppercase tracking-wide text-muted`}>
                          {task.priority}
                        </div>
                      </td>
                      <td className="p-0">
                        <div className={`${nestClass} px-4 text-xs text-foreground`}>
                          <span className="inline-flex items-center gap-1.5">
                            <User className="size-3 text-muted" />
                            {task.assignee ?? "Unassigned"}
                          </span>
                        </div>
                      </td>
                      <td className="p-0">
                        <div className={`${nestClass} px-4 text-xs text-foreground`}>
                          <span className="inline-flex items-center gap-1.5">
                            <User className="size-3 text-muted" />
                            {task.reporter ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="p-0">
                        <div className={`${nestClass} px-4`}>
                          {task.url && task.jiraKey ? (
                            <a
                              href={task.url}
                              target="_blank"
                              rel="noreferrer"
                              tabIndex={tasksOpen ? 0 : -1}
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-bbb hover:underline"
                            >
                              {task.jiraKey}
                              <ArrowUpRight className="size-3" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedTask && selectedItem && (
        <FastTrackDrawer
          item={selectedTask}
          parentTitle={selectedItem.title}
          onClose={() => setSelection(null)}
        />
      )}

      {selectedItem && !selectedTask && (
        <FastTrackDrawer
          item={selectedItem}
          tasks={selectedItem.tasks}
          canAddTask={canAdd && selectedItem.isEpic && Boolean(selectedItem.jiraKey)}
          onAddTask={
            selectedItem.jiraKey
              ? () => setNestEpicKey(selectedItem.jiraKey)
              : undefined
          }
          onOpenTask={(taskId) =>
            setSelection({
              kind: "task",
              itemId: selectedItem.id,
              taskId,
            })
          }
          onClose={() => setSelection(null)}
        />
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
            setSelection({ kind: "item", id: key });
            router.refresh();
          }}
        />
      )}

      {canAdd && nestEpic?.jiraKey && (
        <AddNestedFastTrackModal
          open={nestEpicKey !== null}
          epicKey={nestEpic.jiraKey}
          epicTitle={nestEpic.title}
          onClose={() => setNestEpicKey(null)}
          onCreated={(created) => {
            const epicKey = nestEpic.jiraKey;
            if (!epicKey) return;
            setPendingTasks((current) => ({
              ...current,
              [epicKey]: [
                ...(current[epicKey] ?? []).filter(
                  (task) => task.jiraKey !== created.key,
                ),
                {
                  id: created.key,
                  title: created.title,
                  status: "To Do",
                  statusCategory: "new",
                  priority: "None",
                  assignee: null,
                  reporter: null,
                  description: created.description,
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  url: created.url,
                  jiraKey: created.key,
                  issueType: "Task",
                },
              ],
            }));
            setNestEpicKey(null);
            setExpandedIds((current) => new Set(current).add(nestEpic.id));
            setSelection({ kind: "item", id: nestEpic.id });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
