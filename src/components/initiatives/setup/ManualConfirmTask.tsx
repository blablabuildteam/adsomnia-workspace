"use client";

import { useState } from "react";
import { Check, CheckCircle2, Calendar } from "lucide-react";
import { inputClass } from "@/lib/form-styles";

type Props = {
  description: string;
  confirmed?: boolean;
  completedAt?: string;
  showDatePicker?: boolean;
  readOnly?: boolean;
  onComplete: (date?: string, notes?: string) => void;
};

export function ManualConfirmTask({
  description,
  confirmed,
  completedAt,
  showDatePicker,
  readOnly,
  onComplete,
}: Props) {
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  if (confirmed || readOnly) {
    return (
      <div>
        {confirmed ? (
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle2 className="size-3.5" />
            Confirmed
            {completedAt && (
              <span className="text-muted">
                · {new Date(completedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
              </span>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">{description}</p>

      {showDatePicker && (
        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Date <span className="font-normal text-muted/50">(optional)</span>
          </span>
          <div className="relative mt-1">
            <Calendar className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </label>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={inputClass}
        rows={2}
        placeholder="Notes (optional)…"
      />

      <button
        type="button"
        onClick={() => onComplete(date || undefined, notes || undefined)}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
      >
        <Check className="size-3.5" />
        Confirm Done
      </button>
    </div>
  );
}
