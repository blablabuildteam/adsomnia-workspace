"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  WEEKDAYS,
  absenceKind,
  weekdayLabel,
  type AbsenceEntry,
  type AbsenceKind,
  type AbsenceLogData,
} from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

const ROW_INPUT_CLASS =
  "w-full border border-border bg-surface-input px-2 py-1.5 text-xs text-foreground transition-colors focus:border-muted focus:outline-none";
const DATE_INPUT_CLASS = `${ROW_INPUT_CLASS} date-input [color-scheme:dark]`;

const THIS_YEAR = new Date().getFullYear();
const YEAR_START = `${THIS_YEAR}-01-01`;
const YEAR_END = `${THIS_YEAR}-12-31`;

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${THIS_YEAR}-${month}-${day}`;
}

function formatDay(iso?: string): string {
  if (!iso) return "?";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatEntry(entry: AbsenceEntry): string {
  if (absenceKind(entry) === "day") {
    const day = weekdayLabel(entry.weekday);
    return day ? `every ${day}` : "weekly day off";
  }
  return `${formatDay(entry.startDate)} – ${formatDay(entry.endDate)} · OOO`;
}

function normalizeEntries(entries: AbsenceEntry[]): AbsenceEntry[] {
  return entries.map((entry) => ({
    ...entry,
    kind: absenceKind(entry),
  }));
}

function AbsenceList({ entries }: { entries: AbsenceEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-muted">No planned time off reported.</p>
    );
  }
  return (
    <ul className="space-y-1">
      {entries.map((entry) => (
        <li key={entry.id} className="text-xs text-muted">
          <span className="text-foreground">{entry.name}</span>
          {" · "}
          {formatEntry(entry)}
          {entry.note ? ` · ${entry.note}` : ""}
        </li>
      ))}
    </ul>
  );
}

function MenuSelect({
  value,
  placeholder,
  options,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-2 border bg-surface-input px-2 py-1.5 text-left text-xs transition-colors ${
          open ? "border-muted" : "border-border hover:border-muted"
        } ${selected ? "text-foreground" : "text-muted/50"}`}
      >
        <span className="min-w-0 truncate">
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-52 overflow-auto border border-border-strong bg-surface-elevated py-1 shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                    active
                      ? "bg-white/[0.06] text-foreground"
                      : "text-muted hover:bg-white/[0.04] hover:text-foreground"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active && <Check className="size-3 shrink-0 text-foreground" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NamePicker({
  value,
  options,
  onChange,
  onAddName,
}: {
  value: string;
  options: string[];
  onChange: (name: string) => void;
  onAddName: (name: string) => void;
}) {
  const [adding, setAdding] = useState(!value && options.length === 0);
  const [draft, setDraft] = useState("");

  const commitNewName = () => {
    const name = draft.trim();
    if (!name) return;
    onAddName(name);
    onChange(name);
    setDraft("");
    setAdding(false);
  };

  if (adding) {
    return (
      <div className="flex min-w-[11rem] flex-[2] items-center gap-1">
        <input
          type="text"
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitNewName();
            }
            if (event.key === "Escape" && options.length > 0) {
              setAdding(false);
              setDraft("");
            }
          }}
          placeholder="New name"
          aria-label="New name"
          className={`${ROW_INPUT_CLASS} min-w-0 flex-1`}
        />
        <button
          type="button"
          onClick={commitNewName}
          disabled={!draft.trim()}
          className="shrink-0 border border-border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
        >
          Add
        </button>
        {options.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setDraft("");
            }}
            className="shrink-0 px-1 text-[10px] uppercase tracking-wide text-muted/60 hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    );
  }

  const known = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <MenuSelect
      value={value}
      placeholder="Choose name"
      ariaLabel="Team member"
      className="min-w-[11rem] flex-[2]"
      options={[
        ...known.map((name) => ({ value: name, label: name })),
        { value: "__new__", label: "Add new name…" },
      ]}
      onChange={(next) => {
        if (next === "__new__") {
          setAdding(true);
          setDraft("");
          return;
        }
        onChange(next);
      }}
    />
  );
}

type Props = {
  data: AbsenceLogData;
  /** Names from the scoping team, offered in the picker. */
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
  const [entries, setEntries] = useState<AbsenceEntry[]>(data.entries ?? []);
  const [extraNames, setExtraNames] = useState<string[]>(() =>
    [
      ...new Set(
        (data.entries ?? [])
          .map((entry) => entry.name.trim())
          .filter((name) => name && !teamNames.includes(name)),
      ),
    ],
  );

  const nameOptions = [...teamNames, ...extraNames];

  const update = (id: string, patch: Partial<AbsenceEntry>) =>
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );

  const remove = (id: string) =>
    setEntries((current) => current.filter((entry) => entry.id !== id));

  const add = (kind: AbsenceKind) => {
    setEntries((current) => [
      ...current,
      { id: crypto.randomUUID(), name: "", kind, startDate: "", endDate: "" },
    ]);
  };

  const fillThisYear = (id: string, field: "startDate" | "endDate") => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id && !entry[field]
          ? { ...entry, [field]: todayIso() }
          : entry,
      ),
    );
  };

  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  const skipAutosave = useRef(true);

  useEffect(() => {
    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      saveRef.current({
        entries: normalizeEntries(entries),
        noneReported: entries.length === 0,
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [entries]);

  const setKind = (id: string, kind: AbsenceKind) => update(id, { kind });

  const persistComplete = () => {
    const normalized = normalizeEntries(entries);
    onComplete({
      entries: normalized,
      noneReported: normalized.length === 0,
    });
  };

  if (readOnly) {
    if (data.status === "completed") {
      return (
        <div className="space-y-2">
          <CompletedLine>Time off logged</CompletedLine>
          <AbsenceList
            entries={data.noneReported ? [] : (data.entries ?? [])}
          />
        </div>
      );
    }
    return (
      <div className="text-xs text-muted">
        Awaiting OOO periods and weekly days off for this team.
      </div>
    );
  }

  const isDone = data.status === "completed";

  const invalid = entries.filter((entry) => {
    if (!entry.name.trim()) return true;
    if (absenceKind(entry) === "day") return !entry.weekday;
    return !entry.startDate || !entry.endDate;
  }).length;
  const blockedReason =
    entries.length > 0 && invalid > 0
      ? `${invalid} row${invalid === 1 ? "" : "s"} still missing a name or details`
      : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Log OOO periods and recurring days off — for example every Friday —
        so planning reflects real availability. Pick a name from the team, or
        add someone new.
      </p>

      <div className="space-y-1.5">
        {entries.map((entry) => {
          const kind = absenceKind(entry);
          return (
            <div
              key={entry.id}
              className="flex flex-wrap items-center gap-2 border border-border bg-surface px-3 py-2"
            >
              <NamePicker
                value={entry.name}
                options={nameOptions}
                onChange={(name) => update(entry.id, { name })}
                onAddName={(name) =>
                  setExtraNames((current) =>
                    current.includes(name) ? current : [...current, name],
                  )
                }
              />
              <div className="inline-flex shrink-0 border border-border">
                <button
                  type="button"
                  onClick={() => setKind(entry.id, "day")}
                  className={`px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    kind === "day"
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setKind(entry.id, "period")}
                  className={`border-l border-border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    kind === "period"
                      ? "bg-white/[0.08] text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  OOO
                </button>
              </div>
              {kind === "day" ? (
                <MenuSelect
                  value={entry.weekday ?? ""}
                  placeholder="Every…"
                  ariaLabel="Recurring weekday"
                  className="min-w-[9rem] flex-1"
                  options={WEEKDAYS.map((day) => ({
                    value: day.id,
                    label: `Every ${day.label}`,
                  }))}
                  onChange={(weekday) => update(entry.id, { weekday })}
                />
              ) : (
                <>
                  <input
                    type="date"
                    min={YEAR_START}
                    max={YEAR_END}
                    value={entry.startDate ?? ""}
                    onFocus={() => fillThisYear(entry.id, "startDate")}
                    onChange={(event) =>
                      update(entry.id, { startDate: event.target.value })
                    }
                    aria-label="First day away"
                    className={`${DATE_INPUT_CLASS} min-w-[8rem] flex-1`}
                  />
                  <input
                    type="date"
                    min={entry.startDate || YEAR_START}
                    max={YEAR_END}
                    value={entry.endDate ?? ""}
                    onFocus={() => fillThisYear(entry.id, "endDate")}
                    onChange={(event) =>
                      update(entry.id, { endDate: event.target.value })
                    }
                    aria-label="Last day away"
                    className={`${DATE_INPUT_CLASS} min-w-[8rem] flex-1`}
                  />
                </>
              )}
              <button
                type="button"
                onClick={() => remove(entry.id)}
                aria-label="Remove time off"
                className="shrink-0 p-1.5 text-muted/50 transition-colors hover:text-btr"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          );
        })}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => add("day")}
            className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Plus className="size-3" />
            Add weekly day off
          </button>
          <button
            type="button"
            onClick={() => add("period")}
            className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Plus className="size-3" />
            Add OOO period
          </button>
        </div>
      </div>

      {isDone ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={persistComplete}
              disabled={!!blockedReason}
              className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
            >
              Save changes
            </button>
          </div>
          {blockedReason && (
            <p className="text-right text-[10px] uppercase tracking-wide text-muted/60">
              {blockedReason}
            </p>
          )}
        </div>
      ) : (
        <ConfirmRow
          label="Time off is logged — or there is none planned"
          blockedReason={blockedReason}
          onConfirm={persistComplete}
        />
      )}
    </div>
  );
}
