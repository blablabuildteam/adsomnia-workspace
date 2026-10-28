"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Link2, Lock, X } from "lucide-react";

import {
  linkWorkstreams,
  searchWorkstreamsToLink,
  unlinkWorkstreams,
} from "@/app/(workspace)/workstreams/[id]/link-actions";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { STAGES, stageInk } from "@/data/workflow";
import { inputClass } from "@/lib/form-styles";
import type {
  LinkedWorkstream,
  WorkstreamLinkCandidate,
  WorkstreamRelation,
} from "@/lib/workstream-links";

const RELATION_LABEL: Record<WorkstreamRelation, string> = {
  related: "Related",
  "depends-on": "Depends on",
  blocks: "Blocks",
};

const RELATION_HINT: Record<WorkstreamRelation, string> = {
  related: "They overlap or affect each other.",
  "depends-on": "This workstream waits on the other one.",
  blocks: "The other workstream waits on this one.",
};

const SEARCH_DELAY_MS = 200;

function stageName(stageId: string): string {
  return STAGES.find((stage) => stage.id === stageId)?.name ?? stageId;
}

function StageTag({ stageId }: { stageId: string }) {
  return (
    <span
      className="shrink-0 font-display text-[9px] font-bold uppercase tracking-wide"
      style={{ color: stageInk(stageId) }}
    >
      {stageName(stageId)}
    </span>
  );
}

/** Header CTA: search workstreams by title or WS number and link one. */
export function LinkWorkstreamButton({
  initiativeId,
  size = "sm",
}: {
  initiativeId: number;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="print:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={[
          "inline-flex shrink-0 items-center gap-2 border border-border text-muted transition-colors hover:border-foreground hover:text-foreground",
          size === "md" ? "px-3.5 py-2" : "px-3 py-2",
        ].join(" ")}
        title="Link a related workstream"
      >
        <Link2 className="size-4" />
        <span
          className={[
            "font-display font-bold uppercase tracking-wide",
            size === "md" ? "text-xs" : "text-[10px]",
          ].join(" ")}
        >
          Link
        </span>
      </button>
      {/* The header's entry animation leaves a transform that would trap a fixed modal. */}
      {open &&
        createPortal(
          <LinkWorkstreamDialog
            initiativeId={initiativeId}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </div>
  );
}

function LinkWorkstreamDialog({
  initiativeId,
  onClose,
}: {
  initiativeId: number;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkstreamLinkCandidate[]>([]);
  const [searchedFor, setSearchedFor] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [picked, setPicked] = useState<WorkstreamLinkCandidate | null>(null);
  const [relation, setRelation] = useState<WorkstreamRelation>("related");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const response = await searchWorkstreamsToLink(initiativeId, trimmed);
      if (cancelled) return;
      setResults(response.results);
      setSearchedFor(trimmed);
      setHighlight(0);
      setError(response.error ?? null);
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [initiativeId, query]);

  const trimmedQuery = query.trim();
  const shownResults = trimmedQuery ? results : [];
  const selectable = shownResults.filter((item) => !item.alreadyLinked);
  const activeId = selectable[Math.min(highlight, selectable.length - 1)]?.id;

  function confirm() {
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      const result = await linkWorkstreams(initiativeId, picked.id, relation);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Link workstream"
      actions={
        picked ? (
          <>
            <ModalButton onClick={() => setPicked(null)} disabled={pending}>
              Back
            </ModalButton>
            <ModalButton variant="primary" onClick={confirm} disabled={pending}>
              {pending ? "Linking…" : "Link"}
            </ModalButton>
          </>
        ) : undefined
      }
    >
      {picked ? (
        <div className="space-y-4">
          <div className="border border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                {picked.ticketId}
              </span>
              <StageTag stageId={picked.currentStage} />
            </div>
            <p className="mt-1 text-sm font-medium leading-snug">{picked.title}</p>
          </div>
          <fieldset>
            <legend className="mb-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              How are they connected?
            </legend>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {(["related", "depends-on", "blocks"] as const).map((option) => {
                const selected = relation === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRelation(option)}
                    className={[
                      "border px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted hover:border-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    <span className="block font-display text-[10px] font-bold uppercase tracking-wide">
                      {RELATION_LABEL[option]}
                    </span>
                    <span
                      className={[
                        "mt-1 block text-[11px] leading-snug",
                        selected ? "text-background/75" : "text-muted",
                      ].join(" ")}
                    >
                      {RELATION_HINT[option]}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          {error && <p className="text-xs text-btr">{error}</p>}
        </div>
      ) : (
        <div>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError(null);
            }}
            onKeyDown={(event) => {
              if (selectable.length === 0) return;
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlight((index) => (index + 1) % selectable.length);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlight(
                  (index) => (index - 1 + selectable.length) % selectable.length,
                );
              } else if (event.key === "Enter") {
                event.preventDefault();
                const next = selectable.find((item) => item.id === activeId);
                if (next) setPicked(next);
              }
            }}
            placeholder="Search by title or number, e.g. WS-1042"
            className={`${inputClass} text-sm`}
            aria-label="Search workstreams by title or number"
            autoComplete="off"
          />
          {trimmedQuery && searchedFor === trimmedQuery && (
            <ul role="listbox" className="mt-2 max-h-72 overflow-y-auto border border-border">
              {shownResults.length === 0 ? (
                <li className="px-3 py-3 text-xs text-muted">
                  No workstreams match.
                </li>
              ) : (
                shownResults.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <li key={item.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        disabled={item.alreadyLinked}
                        onClick={() => setPicked(item)}
                        className={[
                          "flex w-full items-center gap-3 px-3 py-2.5 text-left",
                          item.alreadyLinked
                            ? "cursor-default opacity-50"
                            : active
                              ? "bg-hover-strong"
                              : "hover:bg-hover",
                        ].join(" ")}
                      >
                        <span className="w-16 shrink-0 font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                          {item.ticketId}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {item.title}
                        </span>
                        {item.alreadyLinked ? (
                          <span className="shrink-0 font-display text-[9px] font-bold uppercase tracking-wide text-muted">
                            Linked
                          </span>
                        ) : (
                          <StageTag stageId={item.currentStage} />
                        )}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          )}
          {error && <p className="mt-2 text-xs text-btr">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

/** Linked workstreams under the title, visible to everyone who can open this one. */
export function ConnectedWorkstreams({
  initiativeId,
  links,
  hiddenCount,
  canEdit,
}: {
  initiativeId: number;
  links: LinkedWorkstream[];
  hiddenCount: number;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (links.length === 0 && hiddenCount === 0) return null;

  function remove(link: LinkedWorkstream) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkWorkstreams(initiativeId, link.linkId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="mt-4">
      <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
        Connected workstreams
      </p>
      <ul className="flex flex-wrap gap-2">
        {links.map((link) => (
          <li
            key={link.linkId}
            className="flex max-w-full items-stretch border border-border bg-surface"
          >
            <Link
              href={`/workstreams/${link.id}`}
              className="flex min-w-0 items-center gap-2 px-2.5 py-1.5 transition-colors hover:bg-hover"
              title={`${RELATION_LABEL[link.relation]} ${link.ticketId} — ${link.title}`}
            >
              {link.relation !== "related" && (
                <span className="shrink-0 font-display text-[9px] font-bold uppercase tracking-wide text-foreground">
                  {RELATION_LABEL[link.relation]}
                </span>
              )}
              <span className="shrink-0 font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                {link.ticketId}
              </span>
              <span className="min-w-0 max-w-[16rem] truncate text-xs">
                {link.title}
              </span>
              <StageTag stageId={link.currentStage} />
              {(link.archived || link.status === "rejected") && (
                <span className="shrink-0 font-display text-[9px] font-bold uppercase tracking-wide text-muted">
                  {link.status === "rejected" ? "Rejected" : "On Hold"}
                </span>
              )}
            </Link>
            {canEdit && (
              <button
                type="button"
                disabled={pending}
                onClick={() => remove(link)}
                className="flex w-7 shrink-0 items-center justify-center border-l border-border text-muted transition-colors hover:text-foreground disabled:opacity-40 print:hidden"
                aria-label={`Unlink ${link.ticketId}`}
              >
                <X className="size-3.5" />
              </button>
            )}
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="flex items-center gap-1.5 border border-dashed border-border px-2.5 py-1.5 text-xs text-muted">
            <Lock className="size-3" />
            +{hiddenCount} private workstream{hiddenCount === 1 ? "" : "s"}
          </li>
        )}
      </ul>
      {error && <p className="mt-2 text-xs text-btr">{error}</p>}
    </div>
  );
}
