import type { ReactNode } from "react";
import type { ProductionTask } from "@/lib/production/health";

export const STATUS_COLORS = {
  done: "#22C55E",
  inProgress: "#EAB308",
  open: "#3B82F6",
} as const;

export const DONE_VISIBLE_LIMIT = 5;

const TASK_DOT: Record<string, string> = {
  indeterminate: STATUS_COLORS.inProgress,
  done: STATUS_COLORS.done,
  new: STATUS_COLORS.open,
  undefined: STATUS_COLORS.open,
};

export function ticketShare(count: number, total: number) {
  if (total <= 0 || count <= 0) return 0;
  return (count / total) * 100;
}

export function groupEpicTasks(tasks: ProductionTask[]) {
  const open: ProductionTask[] = [];
  const inProgress: ProductionTask[] = [];
  const done: ProductionTask[] = [];

  for (const task of tasks) {
    if (task.statusCategory === "done") done.push(task);
    else if (task.statusCategory === "indeterminate") inProgress.push(task);
    else open.push(task);
  }

  done.sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""));

  return {
    open,
    inProgress,
    done,
    doneVisible: done.slice(0, DONE_VISIBLE_LIMIT),
    doneHidden: Math.max(0, done.length - DONE_VISIBLE_LIMIT),
  };
}

export function StatusFillBar({
  done,
  inProgress,
  total,
  className = "h-1.5",
}: {
  done: number;
  inProgress: number;
  total: number;
  className?: string;
}) {
  return (
    <div
      className={`flex overflow-hidden ${className}`}
      style={{ backgroundColor: `${STATUS_COLORS.open}40` }}
    >
      <span
        style={{
          width: `${ticketShare(done, total)}%`,
          backgroundColor: STATUS_COLORS.done,
        }}
      />
      <span
        style={{
          width: `${ticketShare(inProgress, total)}%`,
          backgroundColor: STATUS_COLORS.inProgress,
        }}
      />
    </div>
  );
}

function TaskRow({ task }: { task: ProductionTask }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className="mt-1.5 size-1.5 shrink-0"
        style={{
          backgroundColor: TASK_DOT[task.statusCategory] ?? TASK_DOT.undefined,
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] leading-snug">{task.name}</p>
        <p className="truncate text-[10px] text-muted">
          {task.status ?? "No status"}
          {task.assignee ? ` · ${task.assignee}` : " · Unassigned"}
        </p>
      </div>
    </li>
  );
}

function TaskSection({
  label,
  color,
  count,
  children,
}: {
  label: string;
  color: string;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 font-display text-[9px] font-bold uppercase tracking-wide text-muted">
        <span className="size-1.5" style={{ backgroundColor: color }} />
        {label}
        <span className="tabular-nums">{count}</span>
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

export function EpicTicketGroups({
  tasks,
  className,
}: {
  tasks: ProductionTask[];
  className?: string;
}) {
  const groups = groupEpicTasks(tasks);
  if (tasks.length === 0) return null;

  return (
    <div className={className ?? "space-y-3"}>
      <TaskSection
        label="Open"
        color={STATUS_COLORS.open}
        count={groups.open.length}
      >
        {groups.open.map((task) => (
          <TaskRow key={task.key} task={task} />
        ))}
      </TaskSection>
      <TaskSection
        label="In progress"
        color={STATUS_COLORS.inProgress}
        count={groups.inProgress.length}
      >
        {groups.inProgress.map((task) => (
          <TaskRow key={task.key} task={task} />
        ))}
      </TaskSection>
      <TaskSection
        label="Done"
        color={STATUS_COLORS.done}
        count={groups.done.length}
      >
        {groups.doneVisible.map((task) => (
          <TaskRow key={task.key} task={task} />
        ))}
        {groups.doneHidden > 0 && (
          <li className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
            +{groups.doneHidden} earlier done
          </li>
        )}
      </TaskSection>
    </div>
  );
}
