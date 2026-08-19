"use client";

import type { MeetingCadenceData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";

type Props = {
  data: MeetingCadenceData;
  readOnly?: boolean;
  onComplete: () => void;
};

export function MeetingCadenceTask({ data, readOnly, onComplete }: Props) {
  if (data.status === "completed") {
    return (
      <CompletedLine completedAt={data.completedAt}>
        Recurring Status Sync booked
      </CompletedLine>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting the recurring Status Sync for this project.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs text-muted">
          Book a recurring Status Sync with the team in Google Calendar.
        </p>
        <a
          href={CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-border bg-white/[0.04] px-3 py-2 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/google-calendar.png"
            alt=""
            className="size-3.5 object-contain"
          />
          Open Google Calendar
        </a>
      </div>

      <ConfirmRow
        label="The recurring Status Sync is booked and the team is invited"
        onConfirm={onComplete}
      />
    </div>
  );
}
