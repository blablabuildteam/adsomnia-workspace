"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import type { JiraPlanningData, ScopingMilestone } from "@/lib/validation-data";

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  data: JiraPlanningData;
  milestones?: ScopingMilestone[];
  boardUrl?: string;
  readOnly?: boolean;
  onComplete: () => void;
};

export function JiraPlanningTask({
  data,
  milestones = [],
  boardUrl,
  readOnly,
  onComplete,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);

  if (data.status === "completed") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="size-3.5" />
          Epic planning confirmed
          {data.completedAt && (
            <span className="text-muted">
              ·{" "}
              {new Date(data.completedAt).toLocaleDateString("en-US", {
                dateStyle: "medium",
              })}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting high-level epic planning on the Jira board.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-muted">
          Add the high-level epics and tasks to the Jira board so the team can
          work from them in Production. Use the scoping timeline below as the
          source.
        </p>
        {boardUrl && (
          <a
            href={boardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#38BDF8] hover:bg-[#38BDF8]/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/jira.png"
              alt=""
              className="size-3.5 object-contain"
            />
            Open Jira board
          </a>
        )}
      </div>

      {milestones.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            From scoping
          </p>
          {milestones.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-3 border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {m.epic || "Untitled epic"}
                </p>
                {m.milestone && (
                  <p className="mt-0.5 text-[10px] text-muted">{m.milestone}</p>
                )}
              </div>
              {(m.startDate || m.endDate) && (
                <p className="shrink-0 text-right text-[10px] tabular-nums text-muted">
                  {formatDate(m.startDate)} – {formatDate(m.endDate)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => setConfirmed((current) => !current)}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <span
            aria-hidden
            className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${
              confirmed
                ? "border-success bg-success text-background"
                : "border-foreground/30 bg-transparent text-transparent hover:border-success"
            }`}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-xs text-foreground">
            The Jira board includes the high-level epic planning and tasks
          </span>
        </button>
        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!confirmed}
          className="inline-flex shrink-0 items-center gap-2 border border-success bg-success/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
        >
          Confirm Done
        </button>
      </div>
    </div>
  );
}
