"use client";

import { getStageColor } from "@/data/workflow";
import type { KickoffMeetingData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "../onboarding/ConfirmRow";

const ACCENT = getStageColor("setup");
const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";

type Props = {
  data: KickoffMeetingData;
  readOnly?: boolean;
  onComplete: () => void;
};

export function KickoffMeetingTask({ data, readOnly, onComplete }: Props) {
  if (data.status === "completed") {
    return (
      <CompletedLine accent={ACCENT} completedAt={data.completedAt}>
        Kickoff meeting booked
      </CompletedLine>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting kickoff meeting booking.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-muted">
          Book the kickoff meeting in Google Calendar and invite the project
          team.
        </p>
        <a
          href={CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 border border-border bg-white/[0.04] px-3 py-2 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
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
        accent={ACCENT}
        label="The kickoff meeting is set and the team has been invited"
        onConfirm={onComplete}
      />
    </div>
  );
}
