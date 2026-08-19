"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import type { KickoffMeetingData } from "@/lib/validation-data";

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";

type Props = {
  data: KickoffMeetingData;
  readOnly?: boolean;
  onComplete: () => void;
};

export function KickoffMeetingTask({ data, readOnly, onComplete }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  if (data.status === "completed") {
    return (
      <div className="flex items-center gap-2 text-xs text-success">
        <CheckCircle2 className="size-3.5" />
        Kickoff meeting booked
        {data.completedAt && (
          <span className="text-muted">
            ·{" "}
            {new Date(data.completedAt).toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
          </span>
        )}
      </div>
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
          className="inline-flex shrink-0 items-center gap-1.5 border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#38BDF8] hover:bg-[#38BDF8]/20"
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

      <div className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => setConfirmed((current) => !current)}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <span
            aria-hidden
            className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${
              confirmed
                ? "border-success bg-success text-background"
                : "border-foreground/30 bg-transparent text-transparent hover:border-success"
            }`}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-xs text-foreground">
            The kickoff meeting is set and the team has been invited
          </span>
        </button>
        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!confirmed}
          className="inline-flex shrink-0 items-center gap-2 border border-success bg-success/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
        >
          Confirm Done
        </button>
      </div>
    </div>
  );
}
