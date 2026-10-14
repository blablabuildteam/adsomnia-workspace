import { ArrowUpRight } from "lucide-react";
import { FastTrackDetailBody } from "@/components/fast-track/FastTrackDetailBody";
import type { SharedFastTrackItem } from "@/lib/fast-track";

export function FastTrackSharedView({ item }: { item: SharedFastTrackItem }) {
  const kicker = item.parentTitle
    ? `Task in ${item.parentTitle}`
    : item.initiative?.ticketId ?? item.jiraKey ?? "Fast-Track";

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <article className="border border-border bg-surface">
        <header className="border-b border-border px-5 py-4">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-bbb">
            {kicker}
          </p>
          <h1 className="mt-1 font-display text-lg font-extrabold uppercase leading-tight tracking-tight">
            {item.title}
          </h1>
        </header>
        <div className="px-5 py-5">
          <FastTrackDetailBody
            item={item}
            tasks={item.tasks.length > 0 ? item.tasks : undefined}
          />
        </div>
        {item.url ? (
          <div className="border-t border-border px-5 py-4">
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
          </div>
        ) : null}
      </article>
    </div>
  );
}
