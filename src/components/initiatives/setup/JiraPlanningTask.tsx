"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import type { JiraPlanningData, ScopingMilestone } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";

type Props = {
  data: JiraPlanningData;
  milestones?: ScopingMilestone[];
  boardUrl?: string;
  readOnly?: boolean;
  onComplete: (notes?: string) => void;
};

export function JiraPlanningTask({
  data,
  milestones = [],
  boardUrl,
  readOnly,
  onComplete,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [notes, setNotes] = useState(data.notes ?? "");

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
        {data.notes && (
          <p className="text-xs text-muted">{data.notes}</p>
        )}
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
      <p className="text-xs text-muted">
        Add the high-level epics and tasks to the Jira board so the team can
        work from them in Production. Use the scoping timeline below as the
        source.
      </p>

      {boardUrl && (
        <a
          href={boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#38BDF8] hover:bg-[#38BDF8]/20"
        >
          Open Jira board
        </a>
      )}

      {milestones.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            From scoping
          </p>
          {milestones.map((m) => (
            <div
              key={m.id}
              className="border border-border bg-surface px-3 py-2"
            >
              <p className="text-xs font-medium text-foreground">
                {m.epic || "Untitled epic"}
              </p>
              {m.milestone && (
                <p className="mt-0.5 text-[10px] text-muted">{m.milestone}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <label className="flex items-start gap-3 border border-border bg-surface px-3 py-2.5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-success"
        />
        <span className="text-xs text-foreground">
          The Jira board includes the high-level epic planning and tasks
        </span>
      </label>

      {confirmed && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
          rows={2}
          placeholder="Notes (optional)…"
        />
      )}

      <button
        type="button"
        onClick={() => onComplete(notes.trim() || undefined)}
        disabled={!confirmed}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
      >
        <Check className="size-3.5" />
        Confirm Done
      </button>
    </div>
  );
}
