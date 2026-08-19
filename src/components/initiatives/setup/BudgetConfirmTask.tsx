"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { formatEuro, summarizeTeamCost } from "@/data/role-rates";
import type { ScopingTeamMember } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";

type Props = {
  team: ScopingTeamMember[];
  confirmed?: boolean;
  originalBudget?: number;
  adjustedBudget?: number;
  readOnly?: boolean;
  onComplete: (adjustedBudget: number | undefined, notes?: string) => void;
};

export function BudgetConfirmTask({
  team,
  confirmed,
  originalBudget: existingOriginal,
  adjustedBudget: existingAdjusted,
  readOnly,
  onComplete,
}: Props) {
  const summary = summarizeTeamCost(team);
  const calculatedBudget = summary.total;
  const originalBudget = existingOriginal ?? calculatedBudget;

  const [adjusted, setAdjusted] = useState<string>(
    existingAdjusted != null ? String(existingAdjusted) : "",
  );
  const [notes, setNotes] = useState("");

  if (confirmed || readOnly) {
    return (
      <div className="space-y-3">
        {confirmed && (
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle2 className="size-3.5" />
            Budget confirmed
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-foreground/[0.04] px-3 py-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Approved Budget
          </span>
          <span className="font-display text-sm font-bold tabular-nums text-foreground">
            {existingAdjusted != null
              ? formatEuro(existingAdjusted)
              : originalBudget != null
                ? formatEuro(originalBudget)
                : "—"}
          </span>
        </div>
        {existingAdjusted != null && originalBudget != null && existingAdjusted !== originalBudget && (
          <p className="text-[10px] text-muted/60">
            Original estimate: {formatEuro(originalBudget)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Review the budget calculated from team hours and rates. Adjust the total
        if needed, then confirm.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-border bg-foreground/[0.04] px-3 py-2">
        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Calculated from Scoping
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-foreground">
          {calculatedBudget != null ? formatEuro(calculatedBudget) : "—"}
        </span>
      </div>

      {summary.unpricedCount > 0 && (
        <p className="text-[11px] text-muted/60">
          {summary.unpricedCount} role{summary.unpricedCount === 1 ? "" : "s"}{" "}
          without a catalog rate.
        </p>
      )}

      <label className="block">
        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Adjusted Budget{" "}
          <span className="font-normal text-muted/50">(optional override)</span>
        </span>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted/50">
            €
          </span>
          <input
            type="number"
            value={adjusted}
            onChange={(e) => setAdjusted(e.target.value)}
            className={`${inputClass} pl-7`}
            placeholder={
              calculatedBudget != null
                ? String(Math.round(calculatedBudget))
                : "Enter budget…"
            }
            step="100"
            min="0"
          />
        </div>
      </label>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={inputClass}
        rows={2}
        placeholder="Notes on budget adjustment (optional)…"
      />

      <button
        type="button"
        onClick={() => {
          const adj = adjusted.trim() ? Number(adjusted) : undefined;
          onComplete(adj, notes || undefined);
        }}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
      >
        <Check className="size-3.5" />
        Confirm Budget
      </button>
    </div>
  );
}
