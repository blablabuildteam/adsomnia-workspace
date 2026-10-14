"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Calendar } from "lucide-react";
import type { FastTrackItem, FastTrackTask } from "@/lib/fast-track";

export const STATUS_CATEGORY_COLOR: Record<string, string> = {
  new: "#38BDF8",
  indeterminate: "#E8A07C",
  done: "#22c55e",
  undefined: "#A1A1A1",
};

// Follow the current theme so a literal Jira status of "New" stays visible on
// both dark and light backgrounds (previously hard-coded to #FFFFFF, which
// disappeared in light mode).
export const NEW_STATUS_COLOR = "var(--foreground)";

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

/**
 * Parse Jira's YYYY-MM-DD `duedate` as a local-midnight date so the label and
 * overdue math don't drift by a timezone.
 */
export function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function formatDueDate(iso: string | null): string {
  if (!iso) return "—";
  const date = parseIsoDateLocal(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function daysUntilDue(iso: string): number {
  const target = parseIsoDateLocal(iso).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function dueHoverLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `${days}d remaining`;
}

/**
 * Lightweight hover/focus tooltip rendered into a portal so it isn't clipped
 * by the overview table's `overflow-x-auto` wrapper.
 */
export function HoverTip({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const anchorRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
  }, [open]);

  return (
    <span
      ref={anchorRef}
      className={className}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && typeof document !== "undefined"
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[90] -translate-x-1/2 whitespace-nowrap border border-border-strong bg-surface-elevated px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
              style={{ top: pos.top, left: pos.left }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

export function StatusBadge({
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

function TaskRow({
  task,
  onOpenTask,
}: {
  task: FastTrackTask;
  onOpenTask?: (taskId: string) => void;
}) {
  const className = onOpenTask || task.sharePath
    ? "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-hover"
    : "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left";
  const body = (
    <>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-foreground">
          {task.title}
        </span>
        <span className="mt-0.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          {task.jiraKey ?? task.issueType}
        </span>
      </span>
      <StatusBadge status={task.status} category={task.statusCategory} />
    </>
  );

  if (onOpenTask) {
    return (
      <button
        type="button"
        onClick={() => onOpenTask(task.id)}
        className={className}
      >
        {body}
      </button>
    );
  }

  if (task.sharePath) {
    return (
      <Link href={task.sharePath} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export function FastTrackDetailBody({
  item,
  tasks,
  onOpenTask,
}: {
  item: FastTrackItem | FastTrackTask;
  tasks?: FastTrackTask[];
  onOpenTask?: (taskId: string) => void;
}) {
  const initiative = "initiative" in item ? item.initiative : null;
  const dueDays = item.dueDate ? daysUntilDue(item.dueDate) : null;

  return (
    <div className="space-y-5">
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
        <div>
          <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Due
          </dt>
          <dd className="mt-1">
            {item.dueDate && dueDays !== null ? (
              <HoverTip
                label={dueHoverLabel(dueDays)}
                className={[
                  "inline-flex items-center gap-1.5",
                  dueDays < 0 ? "text-danger" : "text-foreground",
                ].join(" ")}
              >
                <Calendar className="size-3.5 text-muted" />
                {formatDueDate(item.dueDate)}
              </HoverTip>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Calendar className="size-3.5 text-muted" />
                —
              </span>
            )}
          </dd>
        </div>
      </dl>

      {initiative ? (
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
      ) : null}

      {item.description && !initiative?.problemStatement ? (
        <Field label="Description" value={item.description} />
      ) : null}

      {tasks && tasks.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-5">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-bbb">
            Tasks
          </p>
          <ul className="border border-border">
            {tasks.map((task) => (
              <li key={task.id} className="border-b border-border last:border-b-0">
                <TaskRow task={task} onOpenTask={onOpenTask} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
