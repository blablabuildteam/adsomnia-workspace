"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  Rocket,
  User,
  X,
} from "lucide-react";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import type { FastTrackItem } from "@/lib/fast-track";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const STATUS_CATEGORY_COLOR: Record<string, string> = {
  new: "#38BDF8",
  indeterminate: "#E8A07C",
  done: "#22c55e",
  undefined: "#A1A1A1",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function StatusBadge({
  status,
  category,
}: {
  status: string;
  category: string;
}) {
  const color = STATUS_CATEGORY_COLOR[category] ?? STATUS_CATEGORY_COLOR.undefined;
  return (
    <span
      className="inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: color, color }}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}

function FastTrackDrawer({
  item,
  onClose,
}: {
  item: FastTrackItem;
  onClose: () => void;
}) {
  const initiative = item.initiative;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close task details"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-border bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-bbb">
              {initiative?.ticketId ?? item.jiraKey ?? "Fast-Track"}
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold uppercase leading-tight tracking-tight">
              {item.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center border border-border text-muted hover:border-border-strong hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={item.status} category={item.statusCategory} />
            <span className="inline-flex items-center border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {item.priority}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Assignee
              </dt>
              <dd className="mt-1 text-foreground">{item.assignee ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Reporter
              </dt>
              <dd className="mt-1 text-foreground">{item.reporter ?? "—"}</dd>
            </div>
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Created
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-foreground">
                <Calendar className="size-3.5 text-muted" />
                {formatDate(item.created)}
              </dd>
            </div>
            <div>
              <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Updated
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 text-foreground">
                <Calendar className="size-3.5 text-muted" />
                {formatDate(item.updated)}
              </dd>
            </div>
          </dl>

          {initiative && (
            <div className="space-y-4 border-t border-border pt-5">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-bbb">
                Original initiative
              </p>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Submitter
                  </dt>
                  <dd className="mt-1 text-foreground">{initiative.submitter}</dd>
                </div>
                <div>
                  <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Sponsor
                  </dt>
                  <dd className="mt-1 text-foreground">{initiative.sponsor}</dd>
                </div>
              </dl>
              <Field label="Problem statement" value={initiative.problemStatement} />
              <Field
                label="Opportunity / solution"
                value={initiative.opportunitySolution}
              />
              <Field label="Expected impact" value={initiative.expectedImpact} />
              <Field label="Target audience" value={initiative.targetAudience} />
              <Field label="Leadership remark" value={initiative.remark} />
            </div>
          )}

          {!initiative && item.description && (
            <Field label="Description" value={item.description} />
          )}
        </div>

        <div className="space-y-2 border-t border-border px-5 py-4">
          {initiative && (
            <Link
              href={`/workstreams/${initiative.id}`}
              className="inline-flex w-full items-center justify-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-foreground hover:border-border-strong"
            >
              Open workstream
            </Link>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background hover:opacity-90"
            >
              Open in Jira
              {item.jiraKey ? ` · ${item.jiraKey}` : ""}
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}

type Props = {
  items: FastTrackItem[];
  boardUrl: string | null;
  fetchError?: string | null;
};

export function FastTrackView({ items, boardUrl, fetchError }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center border border-bbb text-bbb">
              <Rocket className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
                Fast-Track
              </p>
              <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
                Fast Track
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                Quick fixes that skip the pipeline — one or two people, about a
                day of work. Tasks live on the Adsomnia Fast Track Jira board.
              </p>
            </div>
          </div>
          {boardUrl && (
            <a
              href={boardUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-2 border border-foreground bg-transparent px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <Image
                src="/logos/jira.png"
                alt=""
                width={16}
                height={16}
                className="size-4 object-contain"
              />
              Open board in Jira
              <ArrowUpRight className="size-3.5" />
            </a>
          )}
        </div>
      </header>

      {fetchError && (
        <p className="mb-4 border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {fetchError}
        </p>
      )}

      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full min-w-[880px] text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Title
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Status
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Priority
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Assignee
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Reporter
              </th>
              <th className="px-4 py-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Jira
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No Fast-Track tasks yet.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  tabIndex={0}
                  className="group relative cursor-pointer border-b border-border last:border-b-0 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline-none"
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                >
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    <CornerTicks className={hoverTicks} />
                    {item.title}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={item.status}
                      category={item.statusCategory}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted">
                    {item.priority}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 text-muted" />
                      {item.assignee ?? "Unassigned"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="size-3.5 text-muted" />
                      {item.reporter ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.url && item.jiraKey ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-bbb hover:underline"
                      >
                        {item.jiraKey}
                        <ArrowUpRight className="size-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <FastTrackDrawer item={selected} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
