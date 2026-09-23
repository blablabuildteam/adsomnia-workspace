"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Users, X } from "lucide-react";

import {
  grantWorkstreamAccess,
  removeWorkstreamAccess,
} from "@/app/(workspace)/workstreams/[id]/access-actions";
import { inputClass } from "@/lib/form-styles";
import type {
  WorkstreamAccessCandidate,
  WorkstreamAccessEntry,
  WorkstreamAccessKind,
} from "@/lib/workstream-access";
import type { WorkstreamAccessLevel } from "@/lib/permissions";

type Props = {
  initiativeId: number;
  entries: WorkstreamAccessEntry[];
  candidates: WorkstreamAccessCandidate[];
  size?: "sm" | "md";
};

const KIND_LABEL: Record<WorkstreamAccessKind, string> = {
  owner: "Owner",
  leadership: "Leadership",
  assistant: "Assistant",
  grant: "Added",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function filterCandidates(
  people: WorkstreamAccessCandidate[],
  query: string,
): WorkstreamAccessCandidate[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return people;
  return people.filter((person) => {
    const haystacks = [
      person.handle,
      person.firstName ?? "",
      person.lastName ?? "",
      `${person.firstName ?? ""} ${person.lastName ?? ""}`.trim(),
      person.email,
    ];
    return haystacks.some((part) => part.toLowerCase().includes(needle));
  });
}

export function WorkstreamAccessButton({
  initiativeId,
  entries: initialEntries,
  candidates: initialCandidates,
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState(initialEntries);
  const [candidates, setCandidates] = useState(initialCandidates);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [picked, setPicked] = useState<WorkstreamAccessCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  useEffect(() => {
    setCandidates(initialCandidates);
  }, [initialCandidates]);

  useEffect(() => {
    if (!open) return;

    function placePanel() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({
        top: Math.min(rect.bottom + 8, window.innerHeight - 24),
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    placePanel();
    const scroller = document.querySelector("main.workspace-content");
    window.addEventListener("resize", placePanel);
    window.addEventListener("scroll", placePanel, true);
    scroller?.addEventListener("scroll", placePanel, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", placePanel);
      window.removeEventListener("scroll", placePanel, true);
      scroller?.removeEventListener("scroll", placePanel);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const matches = useMemo(
    () => filterCandidates(candidates, query).slice(0, 8),
    [candidates, query],
  );
  const activeIndex =
    matches.length === 0 ? 0 : Math.min(highlight, matches.length - 1);

  function resetSearch() {
    setQuery("");
    setHighlight(0);
    setPicked(null);
  }

  function applyLevel(userId: string, level: WorkstreamAccessLevel, name: string, jobTitle: string | null, email: string) {
    setError(null);
    const previousEntries = entries;
    const previousCandidates = candidates;
    setEntries((current) => {
      const existing = current.find((entry) => entry.userId === userId);
      if (existing) {
        return current.map((entry) =>
          entry.userId === userId ? { ...entry, level } : entry,
        );
      }
      return [
        ...current,
        {
          userId,
          name,
          jobTitle,
          email,
          level,
          kind: "grant" as const,
        },
      ];
    });
    setCandidates((current) => current.filter((person) => person.id !== userId));
    resetSearch();

    startTransition(async () => {
      const result = await grantWorkstreamAccess(initiativeId, userId, level);
      if (result.error) {
        setEntries(previousEntries);
        setCandidates(previousCandidates);
        setError(result.error);
      }
    });
  }

  function removeGrant(userId: string) {
    setError(null);
    const removed = entries.find((entry) => entry.userId === userId);
    if (!removed || removed.kind !== "grant") return;
    const previousEntries = entries;
    const previousCandidates = candidates;
    setEntries((current) => current.filter((entry) => entry.userId !== userId));
    setCandidates((current) =>
      [...current, {
        id: removed.userId,
        handle: removed.name,
        firstName: null,
        lastName: null,
        jobTitle: removed.jobTitle,
        email: removed.email,
      }].sort((a, b) => a.handle.localeCompare(b.handle, "en")),
    );

    startTransition(async () => {
      const result = await removeWorkstreamAccess(initiativeId, userId);
      if (result.error) {
        setEntries(previousEntries);
        setCandidates(previousCandidates);
        setError(result.error);
      }
    });
  }

  return (
    <div className="print:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
        className={[
          "inline-flex shrink-0 items-center gap-2 border border-border text-muted transition-colors hover:border-foreground hover:text-foreground",
          size === "md" ? "px-3.5 py-2" : "px-3 py-2",
        ].join(" ")}
        title="Workstream access"
      >
        <Users className="size-4" />
        <span
          className={[
            "font-display font-bold uppercase tracking-wide",
            size === "md" ? "text-xs" : "text-[10px]",
          ].join(" ")}
        >
          Access
        </span>
      </button>

      {mounted &&
        open &&
        createPortal(
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close access"
            className="absolute inset-0 bg-scrim"
            onClick={() => setOpen(false)}
          />
          <div
          role="dialog"
          aria-modal="true"
          aria-label="Workstream access"
          className="absolute w-[min(22rem,calc(100vw-2rem))] border border-border bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{
            top: anchor?.top ?? 72,
            right: anchor?.right ?? 16,
          }}
        >
          <div className="border-b border-border px-3 py-3">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Access
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Who can open this workstream. Edit can change it. View can only read it.
            </p>
          </div>

          <ul className="max-h-64 overflow-y-auto">
            {entries.map((entry) => (
              <li
                key={entry.userId}
                className="flex items-center gap-2 border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <span className="flex size-7 shrink-0 items-center justify-center border border-border font-display text-[9px] font-bold uppercase text-muted">
                  {initials(entry.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[10px] font-bold uppercase tracking-wide">
                    {entry.name}
                  </span>
                  <span className="block truncate text-[10px] text-muted">
                    {KIND_LABEL[entry.kind]}
                    {entry.jobTitle ? ` · ${entry.jobTitle}` : ""}
                  </span>
                </span>
                {entry.kind === "grant" ? (
                  <span className="flex shrink-0 items-center gap-1">
                    <LevelSwitch
                      level={entry.level}
                      disabled={pending}
                      onChange={(level) =>
                        applyLevel(
                          entry.userId,
                          level,
                          entry.name,
                          entry.jobTitle,
                          entry.email,
                        )
                      }
                    />
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeGrant(entry.userId)}
                      className="flex size-7 items-center justify-center border border-border text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
                      aria-label={`Remove ${entry.name}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="shrink-0 border border-border px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wide text-muted">
                    {entry.level === "edit" ? "Edit" : "View"}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="border-t border-border p-3">
            <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Add someone
            </p>
            {picked ? (
              <div className="border border-border px-2.5 py-2">
                <p className="truncate font-display text-[10px] font-bold uppercase tracking-wide">
                  {picked.handle}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted">Set access</p>
                  <button
                    type="button"
                    onClick={() => setPicked(null)}
                    className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
                  >
                    Back
                  </button>
                </div>
                <div className="mt-2 flex gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      applyLevel(
                        picked.id,
                        "view",
                        picked.handle,
                        picked.jobTitle,
                        picked.email,
                      )
                    }
                    className="flex-1 border border-border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
                  >
                    View
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      applyLevel(
                        picked.id,
                        "edit",
                        picked.handle,
                        picked.jobTitle,
                        picked.email,
                      )
                    }
                    className="flex-1 border border-foreground bg-foreground px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setHighlight(0);
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (matches.length === 0) return;
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setHighlight((index) => (index + 1) % matches.length);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setHighlight(
                        (index) => (index - 1 + matches.length) % matches.length,
                      );
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      const person = matches[activeIndex];
                      if (person) setPicked(person);
                    }
                  }}
                  placeholder="Search registered people"
                  className={`${inputClass} text-xs`}
                  aria-label="Search registered people"
                  autoComplete="off"
                />
                {query.trim().length > 0 && (
                  <ul
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto border border-border bg-surface"
                  >
                    {matches.length === 0 ? (
                      <li className="px-2.5 py-2 text-xs text-muted">
                        No registered people match.
                      </li>
                    ) : (
                      matches.map((person, index) => (
                        <li key={person.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={index === activeIndex}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setPicked(person);
                            }}
                            className={[
                              "flex w-full items-center gap-2 px-2.5 py-2 text-left",
                              index === activeIndex
                                ? "bg-foreground text-background"
                                : "text-foreground hover:bg-surface-input",
                            ].join(" ")}
                          >
                            <span className="flex size-6 shrink-0 items-center justify-center border border-current/30 font-display text-[9px] font-bold uppercase">
                              {initials(person.handle)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-display text-[10px] font-bold uppercase tracking-wide">
                                {person.handle}
                              </span>
                              <span
                                className={[
                                  "block truncate text-[10px]",
                                  index === activeIndex
                                    ? "text-background/70"
                                    : "text-muted",
                                ].join(" ")}
                              >
                                {person.jobTitle || person.email}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            )}
            {error && <p className="mt-2 text-xs text-btr">{error}</p>}
          </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function LevelSwitch({
  level,
  disabled,
  onChange,
}: {
  level: WorkstreamAccessLevel;
  disabled: boolean;
  onChange: (level: WorkstreamAccessLevel) => void;
}) {
  return (
    <span className="flex border border-border">
      {(["view", "edit"] as const).map((option) => {
        const selected = level === option;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled || selected}
            onClick={() => onChange(option)}
            className={[
              "px-1.5 py-1 font-display text-[9px] font-bold uppercase tracking-wide",
              selected
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground",
              "disabled:opacity-100",
            ].join(" ")}
          >
            {option === "edit" ? "Edit" : "View"}
          </button>
        );
      })}
    </span>
  );
}
