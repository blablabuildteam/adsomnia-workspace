"use client";

import type { BacklogData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

type Props = {
  data: BacklogData;
  boardUrl?: string;
  readOnly?: boolean;
  onComplete: () => void;
};

export function BacklogTask({ data, boardUrl, readOnly, onComplete }: Props) {
  if (data.status === "completed") {
    return (
      <CompletedLine completedAt={data.completedAt}>
        First-phase backlog created and prioritized in Jira
      </CompletedLine>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting the prioritized first-phase backlog in Jira.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-muted">
          Create and assign the tickets for the first milestone on the Jira
          board, prioritized as Now / Next / Later.
        </p>
        {boardUrl ? (
          <a
            href={boardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#38BDF8] transition-colors hover:bg-[#38BDF8]/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/jira.png"
              alt=""
              className="size-3.5 object-contain"
            />
            Open Jira board
          </a>
        ) : (
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted/50">
            Board link not set
          </span>
        )}
      </div>

      <ConfirmRow
        label="First-phase tickets are created, assigned, and prioritized"
        onConfirm={onComplete}
      />
    </div>
  );
}
