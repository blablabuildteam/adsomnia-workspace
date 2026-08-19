"use client";

import { useState } from "react";
import { Check, CheckCircle2, Calendar } from "lucide-react";
import type { ScopingMilestone } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";

type Props = {
  milestones: ScopingMilestone[];
  confirmed?: boolean;
  readOnly?: boolean;
  onComplete: (milestones: ScopingMilestone[], notes?: string) => void;
};

export function PlanningConfirmTask({
  milestones: initial,
  confirmed,
  readOnly,
  onComplete,
}: Props) {
  const [milestones, setMilestones] = useState<ScopingMilestone[]>(
    initial.length > 0 ? initial : [],
  );
  const [notes, setNotes] = useState("");

  const updateMilestone = (
    id: string,
    field: keyof ScopingMilestone,
    value: string,
  ) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  if (confirmed || readOnly) {
    return (
      <div className="space-y-2">
        {confirmed && (
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle2 className="size-3.5" />
            Planning confirmed
          </div>
        )}
        {milestones.length === 0 && (
          <p className="text-xs text-muted">No milestones defined.</p>
        )}
        <div className="space-y-1.5">
          {milestones.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {m.epic}
                </p>
                <p className="text-[10px] text-muted">{m.milestone}</p>
              </div>
              <div className="shrink-0 text-right text-[10px] tabular-nums text-muted">
                {m.startDate && m.endDate && (
                  <>
                    {fmtDate(m.startDate)} – {fmtDate(m.endDate)}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Review the milestone timeline from scoping. Adjust dates if needed,
        then confirm.
      </p>

      <div className="space-y-2">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="grid gap-2 border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{m.epic}</p>
              <p className="text-[10px] text-muted">{m.milestone}</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="size-3 shrink-0 text-muted/50" />
              <input
                type="date"
                value={m.startDate || ""}
                onChange={(e) =>
                  updateMilestone(m.id, "startDate", e.target.value)
                }
                className={`${inputClass} text-xs`}
              />
              <span className="text-muted/30">–</span>
              <input
                type="date"
                value={m.endDate || ""}
                onChange={(e) =>
                  updateMilestone(m.id, "endDate", e.target.value)
                }
                className={`${inputClass} text-xs`}
              />
            </div>
          </div>
        ))}
      </div>

      {milestones.length === 0 && (
        <p className="text-xs text-muted/60">
          No milestones from scoping. Confirm to proceed.
        </p>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={inputClass}
        rows={2}
        placeholder="Notes on planning changes (optional)…"
      />

      <button
        type="button"
        onClick={() => onComplete(milestones, notes || undefined)}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
      >
        <Check className="size-3.5" />
        Confirm Planning
      </button>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
