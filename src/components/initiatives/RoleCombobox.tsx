"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  RATE_PARTY_IDS,
  RATE_PARTY_LABELS,
  formatEuro,
  searchRoles,
  type PartyRole,
  type RatePartyId,
} from "@/data/role-rates";
import { PARTIES } from "@/data/workflow";

function partyColor(party: RatePartyId): string {
  return PARTIES.find((p) => p.id === party)?.color ?? "#FFFFFF";
}

type RoleComboboxProps = {
  partyFilter?: string;
  roleId?: string;
  roleLabel?: string;
  onSelect: (role: PartyRole) => void;
};

export function RoleCombobox({
  partyFilter,
  roleId,
  roleLabel,
  onSelect,
}: RoleComboboxProps) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(
    () => searchRoles(query, partyFilter),
    [query, partyFilter],
  );

  const groups = useMemo(() => {
    const next: { party: RatePartyId; roles: PartyRole[] }[] = [];
    for (const party of RATE_PARTY_IDS) {
      if (partyFilter && party !== partyFilter) continue;
      const roles = results.filter((role) => role.party === party);
      if (roles.length > 0) next.push({ party, roles });
    }
    return next;
  }, [results, partyFilter]);

  const flat = useMemo(
    () => groups.flatMap((group) => group.roles),
    [groups],
  );

  useEffect(() => {
    setHighlight(0);
  }, [query, partyFilter, open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  const selectedLabel = roleLabel?.trim() || "Select a role…";
  const hasSelection = Boolean(roleId || roleLabel?.trim());
  const placeholder = partyFilter
    ? `Search ${RATE_PARTY_LABELS[partyFilter as RatePartyId] ?? "company"} roles…`
    : "Search all roles…";

  function choose(role: PartyRole) {
    onSelect(role);
    setOpen(false);
    setQuery("");
  }

  function toggleOpen() {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const menuHeight = 520;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < menuHeight && spaceAbove > spaceBelow);
    }
    setOpen((current) => {
      const next = !current;
      if (!next) setQuery("");
      return next;
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={generatedId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={toggleOpen}
        className={[
          "flex w-full items-center justify-between gap-2 border-b bg-transparent px-0 py-1 text-left text-xs transition-colors focus:outline-none",
          open ? "border-muted" : "border-border hover:border-muted",
          hasSelection ? "text-foreground" : "text-muted/40",
        ].join(" ")}
      >
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className={`absolute z-50 w-full border border-border-strong bg-surface-elevated shadow-[0_8px_24px_rgba(0,0,0,0.6)] ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
            <Search className="size-3.5 shrink-0 text-muted/50" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((i) =>
                    flat.length === 0 ? 0 : Math.min(i + 1, flat.length - 1),
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const role = flat[highlight];
                  if (role) choose(role);
                }
              }}
              placeholder={placeholder}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted/40 focus:outline-none"
              aria-autocomplete="list"
              aria-controls={listboxId}
            />
          </div>

          <ul
            id={listboxId}
            role="listbox"
            aria-labelledby={generatedId}
            className="max-h-[28rem] overflow-auto py-1"
          >
            {flat.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-muted/50">
                No roles match
              </li>
            ) : (
              groups.map((group) => (
                <li key={group.party}>
                  {!partyFilter && (
                    <div
                      className="px-3 pb-1 pt-2 font-display text-[9px] font-bold uppercase tracking-widest"
                      style={{ color: partyColor(group.party) }}
                    >
                      {RATE_PARTY_LABELS[group.party]}
                    </div>
                  )}
                  <ul>
                    {group.roles.map((role) => {
                      const selected = role.id === roleId;
                      const index = flat.findIndex((item) => item.id === role.id);
                      const active = index === highlight;
                      return (
                        <li
                          key={role.id}
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setHighlight(index)}
                          onClick={() => choose(role)}
                          className={[
                            "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs transition-colors",
                            active
                              ? "bg-surface text-foreground"
                              : "text-muted",
                          ].join(" ")}
                        >
                          <span className="min-w-0 truncate">{role.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            {!partyFilter && (
                              <span
                                className="font-display text-[9px] font-bold uppercase tracking-wider"
                                style={{ color: partyColor(role.party) }}
                              >
                                {RATE_PARTY_LABELS[role.party]}
                              </span>
                            )}
                            <span className="tabular-nums text-muted/70">
                              {formatEuro(role.hourlyRate)}/h
                            </span>
                            {selected ? (
                              <Check className="size-3.5 text-foreground" />
                            ) : (
                              <span className="w-3.5" />
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
