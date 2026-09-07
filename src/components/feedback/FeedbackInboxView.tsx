"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CircleDot,
  Clock,
  Image as ImageIcon,
  MapPin,
  Monitor,
  RotateCcw,
} from "lucide-react";
import {
  loadFeedbackImage,
  updateFeedbackStatus,
} from "@/app/(workspace)/feedback/actions";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import type { FeedbackSubmissionEntry } from "@/lib/queries";

type FilterKey = "all" | "open" | "resolved";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
];

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

type Props = {
  items: FeedbackSubmissionEntry[];
};

export function FeedbackInboxView({ items }: Props) {
  const [filter, setFilter] = useState<FilterKey>("open");
  const [openId, setOpenId] = useState<number | null>(
    items.find((item) => item.status === "open")?.id ?? items[0]?.id ?? null,
  );

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  const openCount = items.filter((item) => item.status === "open").length;

  return (
    <div className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <div className="relative z-10">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-bbb">
            blablabuild
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
            Feedback
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Product issues filed from the workspace. Page, viewport, and
            reporter are captured automatically.
          </p>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={[
                  "border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:border-border-strong hover:text-foreground",
                ].join(" ")}
              >
                {item.label}
                {item.key === "open" ? ` ${openCount}` : ""}
              </button>
            );
          })}
        </div>
        <p className="font-display text-xs font-bold tabular-nums text-muted">
          {items.length} total
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="relative border border-border bg-surface px-5 py-8 text-sm text-muted">
          <CornerTicks />
          {items.length === 0
            ? "No feedback has been submitted yet."
            : "Nothing in this filter."}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <FeedbackCard
                item={item}
                expanded={openId === item.id}
                onToggle={() =>
                  setOpenId((current) => (current === item.id ? null : item.id))
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackCard({
  item,
  expanded,
  onToggle,
}: {
  item: FeedbackSubmissionEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ticket = `FB-${String(item.id).padStart(4, "0")}`;
  const isOpen = item.status === "open";

  function setStatus(status: "open" | "resolved") {
    startTransition(async () => {
      await updateFeedbackStatus(item.id, status);
      router.refresh();
    });
  }

  return (
    <article className="group relative flex h-full flex-col border border-border bg-surface transition-colors hover:border-border-strong hover:bg-white/[0.02]">
      <CornerTicks className={hoverTicks} />
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between border-b border-border px-5 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
            {ticket}
          </span>
          <StatusBadge status={item.status} />
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-muted/70">
          <Clock className="size-3" />
          {timeAgo(item.createdAt)}
        </span>
      </button>

      <div className="flex-1 px-5 py-4">
        <h2 className="text-sm font-semibold leading-snug">{item.title}</h2>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{item.pagePath}</span>
        </p>
        <p className="mt-1 text-xs text-muted">{item.submitter.name}</p>

        {expanded ? (
          <div className="mt-4 space-y-4 border-t border-border pt-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {item.description}
            </p>

            <dl className="grid gap-2 text-[11px] uppercase tracking-wide text-muted sm:grid-cols-2">
              {item.pageUrl ? (
                <div>
                  <dt className="font-display font-bold">URL</dt>
                  <dd className="mt-0.5 normal-case tracking-normal break-all text-foreground">
                    {item.pageUrl}
                  </dd>
                </div>
              ) : null}
              {item.viewport ? (
                <div>
                  <dt className="font-display font-bold">Viewport</dt>
                  <dd className="mt-0.5 flex items-center gap-1 normal-case tracking-normal text-foreground">
                    <Monitor className="size-3" />
                    {item.viewport}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-display font-bold">Reporter</dt>
                <dd className="mt-0.5 normal-case tracking-normal text-foreground">
                  {item.submitter.name} · {item.submitter.email}
                </dd>
              </div>
              {item.userAgent ? (
                <div className="sm:col-span-2">
                  <dt className="font-display font-bold">User agent</dt>
                  <dd className="mt-0.5 normal-case tracking-normal break-all text-foreground/80">
                    {item.userAgent}
                  </dd>
                </div>
              ) : null}
            </dl>

            {item.hasImage ? <FeedbackScreenshot item={item} /> : null}

            <div className="flex justify-end">
              {isOpen ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus("resolved")}
                  className="inline-flex items-center gap-2 border border-foreground bg-foreground px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-background disabled:opacity-50"
                >
                  <CheckCircle2 className="size-3.5" />
                  {pending ? "Updating…" : "Mark resolved"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setStatus("open")}
                  className="inline-flex items-center gap-2 border border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:border-border-strong hover:text-foreground disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" />
                  {pending ? "Updating…" : "Reopen"}
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function FeedbackScreenshot({ item }: { item: FeedbackSubmissionEntry }) {
  const [image, setImage] = useState<{
    imageData: string;
    imageFileName: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFeedbackImage(item.id).then((result) => {
      if (cancelled) return;
      if (result.error || !result.imageData) {
        setError(result.error ?? "Screenshot could not be loaded.");
        return;
      }
      setImage({
        imageData: result.imageData,
        imageFileName: result.imageFileName ?? item.imageFileName,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [item.id, item.imageFileName]);

  if (error) {
    return <p className="text-xs text-muted">{error}</p>;
  }

  if (!image) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted">
        <ImageIcon className="size-3" />
        Loading screenshot…
      </p>
    );
  }

  return (
    <div className="border border-border">
      <p className="flex items-center gap-1.5 border-b border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
        <ImageIcon className="size-3" />
        {image.imageFileName ?? "Screenshot"}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.imageData}
        alt={image.imageFileName ?? "Feedback screenshot"}
        className="max-h-80 w-full bg-black object-contain"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: "open" | "resolved" }) {
  const open = status === "open";
  return (
    <span
      className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{
        borderColor: open ? "#CEFF00" : "#22c55e",
        color: open ? "#CEFF00" : "#22c55e",
      }}
    >
      {open ? (
        <CircleDot className="size-3" />
      ) : (
        <CheckCircle2 className="size-3" />
      )}
      {open ? "Open" : "Resolved"}
    </span>
  );
}

function timeAgo(date: Date | string): string {
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
