"use client";

import { useId, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type { AbsenceEntry, AbsenceLogData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

const ROW_INPUT_CLASS =
  "w-full border border-border bg-surface-input px-2 py-1.5 text-xs text-foreground transition-colors focus:border-muted focus:outline-none";
const DATE_INPUT_CLASS = `${ROW_INPUT_CLASS} date-input [color-scheme:dark]`;

function formatPeriod(entry: AbsenceEntry): string {
  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "?";
  return `${fmt(entry.startDate)} – ${fmt(entry.endDate)}`;
}

type Props = {
  data: AbsenceLogData;
  /** Names from the scoping team, offered as suggestions. */
  teamNames: string[];
  readOnly?: boolean;
  onSave: (payload: { entries: AbsenceEntry[]; noneReported: boolean }) => void;
  onComplete: (payload: {
    entries: AbsenceEntry[];
    noneReported: boolean;
  }) => void;
};

export function AbsenceLogTask({
  data,
  teamNames,
  readOnly,
  onSave,
  onComplete,
}: Props) {
  const listId = useId();
  const [entries, setEntries] = useState<AbsenceEntry[]>(data.entries ?? []);
  const [noneReported, setNoneReported] = useState(!!data.noneReported);

  const update = (id: string, patch: Partial<AbsenceEntry>) =>
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );

  const remove = (id: string) =>
    setEntries((current) => current.filter((entry) => entry.id !== id));

  const add = () => {
    setNoneReported(false);
    setEntries((current) => [
      ...current,
      { id: crypto.randomUUID(), name: "", startDate: "", endDate: "" },
    ]);
  };

  if (data.status === "completed") {
    return (
      <div className="space-y-2">
        <CompletedLine completedAt={data.completedAt}>
          {data.noneReported
            ? "No planned absences reported"
            : `${data.entries?.length ?? 0} absence period${
                (data.entries?.length ?? 0) === 1 ? "" : "s"
              } logged`}
        </CompletedLine>
        {!data.noneReported && (data.entries?.length ?? 0) > 0 && (
          <ul className="space-y-1">
            {data.entries.map((entry) => (
              <li key={entry.id} className="text-xs text-muted">
                <span className="text-foreground">{entry.name}</span> ·{" "}
                {formatPeriod(entry)}
                {entry.note ? ` · ${entry.note}` : ""}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting the holiday and absence log for this team.
      </div>
    );
  }

  const invalid = entries.filter(
    (entry) => !entry.name.trim() || !entry.startDate || !entry.endDate,
  ).length;
  const blockedReason = noneReported
    ? null
    : entries.length === 0
      ? "Log an absence, or tick “no planned absences”"
      : invalid > 0
        ? `${invalid} row${invalid === 1 ? "" : "s"} still missing a name or dates`
        : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Log every known holiday or absence in the delivery window so the
        planning reflects real availability.
      </p>

      <datalist id={listId}>
        {teamNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex flex-wrap items-center gap-2 border border-border bg-surface px-3 py-2"
          >
            <input
              type="text"
              list={listId}
              value={entry.name}
              onChange={(event) =>
                update(entry.id, { name: event.target.value })
              }
              placeholder="Team member"
              aria-label="Team member"
              className={`${ROW_INPUT_CLASS} min-w-[9rem] flex-[2]`}
            />
            <input
              type="date"
              value={entry.startDate ?? ""}
              onChange={(event) =>
                update(entry.id, { startDate: event.target.value })
              }
              aria-label="First day away"
              className={`${DATE_INPUT_CLASS} min-w-[8rem] flex-1`}
            />
            <input
              type="date"
              value={entry.endDate ?? ""}
              min={entry.startDate || undefined}
              onChange={(event) =>
                update(entry.id, { endDate: event.target.value })
              }
              aria-label="Last day away"
              className={`${DATE_INPUT_CLASS} min-w-[8rem] flex-1`}
            />
            <button
              type="button"
              onClick={() => remove(entry.id)}
              aria-label="Remove absence"
              className="shrink-0 p-1.5 text-muted/50 transition-colors hover:text-btr"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Plus className="size-3" />
            Add absence
          </button>
          <button
            type="button"
            onClick={() => onSave({ entries, noneReported })}
            className="inline-flex items-center gap-1 border border-border px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setNoneReported((current) => !current)}
            className={`inline-flex items-center gap-1.5 border px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
              noneReported
                ? "border-success bg-success/10 text-success"
                : "border-border text-muted hover:border-foreground hover:text-foreground"
            }`}
          >
            <Check className="size-3" />
            No planned absences
          </button>
        </div>
      </div>

      <ConfirmRow
        label="Holiday and absence periods are logged for the whole team"
        blockedReason={blockedReason}
        onConfirm={() => onComplete({ entries, noneReported })}
      />
    </div>
  );
}
