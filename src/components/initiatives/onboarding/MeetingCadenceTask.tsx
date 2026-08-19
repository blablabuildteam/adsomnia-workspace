"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import type {
  MeetingCadenceData,
  MeetingCadenceItem,
} from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

const CALENDAR_URL = "https://calendar.google.com/calendar/u/0/r";
const ROW_INPUT_CLASS =
  "w-full border border-border bg-surface-input px-2 py-1.5 text-xs text-foreground transition-colors focus:border-muted focus:outline-none";

type Props = {
  data: MeetingCadenceData;
  readOnly?: boolean;
  onSave: (meetings: MeetingCadenceItem[]) => void;
  onComplete: (meetings: MeetingCadenceItem[]) => void;
};

export function MeetingCadenceTask({
  data,
  readOnly,
  onSave,
  onComplete,
}: Props) {
  const [meetings, setMeetings] = useState<MeetingCadenceItem[]>(
    data.meetings?.length ? data.meetings : [],
  );

  const update = (id: string, patch: Partial<MeetingCadenceItem>) =>
    setMeetings((current) =>
      current.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );

  const remove = (id: string) =>
    setMeetings((current) => current.filter((m) => m.id !== id));

  const add = () =>
    setMeetings((current) => [
      ...current,
      { id: crypto.randomUUID(), label: "", schedule: "", booked: false },
    ]);

  if (data.status === "completed") {
    return (
      <div className="space-y-2">
        <CompletedLine completedAt={data.completedAt}>
          Recurring meetings booked
        </CompletedLine>
        <ul className="space-y-1">
          {(data.meetings ?? []).map((meeting) => (
            <li key={meeting.id} className="text-xs text-muted">
              <span className="text-foreground">{meeting.label}</span>
              {meeting.schedule ? ` · ${meeting.schedule}` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting the recurring meeting cadence for this project.
      </div>
    );
  }

  const incomplete = meetings.filter((m) => !m.label.trim() || !m.booked).length;
  const blockedReason =
    meetings.length === 0
      ? "Add at least one recurring meeting"
      : incomplete > 0
        ? `${incomplete} meeting${incomplete === 1 ? "" : "s"} still to name or book`
        : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-muted">
          Book the recurring internal meetings with the team in Google Calendar,
          then record the cadence here.
        </p>
        <a
          href={CALENDAR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#38BDF8] transition-colors hover:bg-[#38BDF8]/20"
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

      <div className="space-y-1.5">
        {meetings.map((meeting) => (
          <div
            key={meeting.id}
            className="flex flex-wrap items-center gap-2 border border-border bg-surface px-3 py-2"
          >
            <input
              type="text"
              value={meeting.label}
              onChange={(event) =>
                update(meeting.id, { label: event.target.value })
              }
              placeholder="Meeting name"
              aria-label="Meeting name"
              className={`${ROW_INPUT_CLASS} min-w-[10rem] flex-[2]`}
            />
            <input
              type="text"
              value={meeting.schedule ?? ""}
              onChange={(event) =>
                update(meeting.id, { schedule: event.target.value })
              }
              placeholder="e.g. Mondays 10:00"
              aria-label="Cadence"
              className={`${ROW_INPUT_CLASS} min-w-[8rem] flex-1`}
            />
            <button
              type="button"
              onClick={() => update(meeting.id, { booked: !meeting.booked })}
              className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
                meeting.booked
                  ? "border-success bg-success/10 text-success"
                  : "border-border text-muted hover:border-success hover:text-success"
              }`}
            >
              <Check className="size-3" />
              Booked
            </button>
            <button
              type="button"
              onClick={() => remove(meeting.id)}
              aria-label="Remove meeting"
              className="shrink-0 p-1.5 text-muted/50 transition-colors hover:text-btr"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            <Plus className="size-3" />
            Add meeting
          </button>
          <button
            type="button"
            onClick={() => onSave(meetings)}
            className="inline-flex items-center gap-1 border border-border px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            Save
          </button>
        </div>
      </div>

      <ConfirmRow
        label="All recurring meetings are booked and the team is invited"
        blockedReason={blockedReason}
        onConfirm={() => onComplete(meetings)}
      />
    </div>
  );
}
