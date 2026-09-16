import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { FastTrackItem } from "@/lib/fast-track";
import { SectionHeading, timeAgo } from "./shared";

const STATUS_CATEGORY_COLOR: Record<string, string> = {
  new: "#38BDF8",
  indeterminate: "#E8A07C",
  done: "#22c55e",
  undefined: "#A1A1A1",
};

const GLANCE_LIMIT = 6;

function updatedMs(item: FastTrackItem): number {
  if (!item.updated) return 0;
  const value = new Date(item.updated).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function itemHref(item: FastTrackItem): string {
  if (item.initiative) return `/workstreams/${item.initiative.id}`;
  if (item.url) return item.url;
  return "/fast-track";
}

type Props = {
  items: FastTrackItem[];
  fetchError?: string | null;
};

export function FastTrackGlance({ items, fetchError }: Props) {
  const ranked = [...items].sort((a, b) => {
    const aDone = a.statusCategory === "done" ? 1 : 0;
    const bDone = b.statusCategory === "done" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return updatedMs(b) - updatedMs(a);
  });
  const openCount = ranked.filter((item) => item.statusCategory !== "done").length;
  const shown = ranked.slice(0, GLANCE_LIMIT);

  return (
    <section className="mb-10">
      <SectionHeading
        kicker="Skip the pipeline"
        trailing={
          <div className="flex items-center gap-3">
            <span className="font-display text-xs font-bold tabular-nums text-muted">
              {openCount}
            </span>
            <Link
              href="/fast-track"
              className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Open Fast-Track
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        }
      >
        Fast-Track
      </SectionHeading>
      {fetchError && (
        <p className="mb-3 border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {fetchError}
        </p>
      )}
      {shown.length === 0 ? (
        <div className="border border-border bg-surface px-4 py-4 text-sm text-muted">
          No Fast-Track tasks on the board. Quick requests skip the pipeline
          and land here.
        </div>
      ) : (
        <ul className="border border-border">
          {shown.map((item, index) => {
            const href = itemHref(item);
            const external = href.startsWith("http");
            const label = item.initiative?.ticketId ?? item.jiraKey ?? "Fast-Track";
            const meta = [
              item.assignee ?? "Unassigned",
              item.priority !== "—" && item.priority !== "None" ? item.priority : null,
              item.updated ? timeAgo(new Date(item.updated)) : null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <li key={item.id}>
                <Link
                  href={href}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className={[
                    "group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.03]",
                    index > 0 ? "border-t border-border" : "",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className="h-8 w-0.5 shrink-0 bg-bbb"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                        {label}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {item.title}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{meta}</p>
                  </div>
                  <span
                    className="shrink-0 border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      borderColor:
                        STATUS_CATEGORY_COLOR[item.statusCategory] ??
                        STATUS_CATEGORY_COLOR.undefined,
                      color:
                        STATUS_CATEGORY_COLOR[item.statusCategory] ??
                        STATUS_CATEGORY_COLOR.undefined,
                    }}
                  >
                    {item.status}
                  </span>
                  {external ? (
                    <ArrowUpRight className="size-4 shrink-0 text-muted" />
                  ) : (
                    <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
