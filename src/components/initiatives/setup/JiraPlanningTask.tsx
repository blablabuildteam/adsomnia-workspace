"use client";

import { ExternalLink } from "lucide-react";
import { getStageColor } from "@/data/workflow";
import type { JiraPlanningData, ScopingMilestone } from "@/lib/validation-data";
import { JIRA_EPIC_COLOR_HEX, isJiraEpicColor } from "@/lib/integrations/jira-plan";
import { CompletedLine, ConfirmRow } from "../onboarding/ConfirmRow";

const ACCENT = getStageColor("setup");

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Props = {
  data: JiraPlanningData;
  milestones?: ScopingMilestone[];
  boardUrl?: string;
  readOnly?: boolean;
  onComplete: () => void;
};

export function JiraPlanningTask({
  data,
  milestones = [],
  boardUrl,
  readOnly,
  onComplete,
}: Props) {
  const createdEpics = data.createdEpics ?? [];
  const hasCreated = createdEpics.length > 0;

  if (data.status === "completed") {
    return (
      <CompletedLine accent={ACCENT} completedAt={data.completedAt}>
        {hasCreated
          ? `Tickets set up · ${createdEpics.length} epic${createdEpics.length === 1 ? "" : "s"}`
          : "Tickets per epic confirmed"}
      </CompletedLine>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting tickets and tasks under each epic.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-muted">
          Epics are already on the Jira space. Open each epic and add the
          individual tickets and tasks the team will work in Production.
        </p>
        {boardUrl && (
          <a
            href={boardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#38BDF8] hover:bg-[#38BDF8]/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/jira.png"
              alt=""
              className="size-3.5 object-contain"
            />
            Open Jira
          </a>
        )}
      </div>

      {data.epicError && (
        <p className="text-xs text-btr">{data.epicError}</p>
      )}

      {hasCreated ? (
        <div className="space-y-1.5">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Add tickets under
          </p>
          {createdEpics.map((epic) => (
            <div
              key={epic.key}
              className="flex items-start justify-between gap-3 border border-border bg-surface px-3 py-2"
            >
              <div className="flex min-w-0 items-start gap-2">
                {isJiraEpicColor(epic.color) && (
                  <span
                    className="mt-1 size-2.5 shrink-0"
                    style={{ backgroundColor: JIRA_EPIC_COLOR_HEX[epic.color] }}
                    aria-hidden
                  />
                )}
                <p className="text-xs font-medium text-foreground">
                  {epic.url ? (
                    <a
                      href={epic.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-[#38BDF8]"
                    >
                      <span className="font-mono text-[10px] text-muted">
                        {epic.key}
                      </span>
                      {epic.name}
                      <ExternalLink className="size-2.5" />
                    </a>
                  ) : (
                    <>
                      <span className="mr-1.5 font-mono text-[10px] text-muted">
                        {epic.key}
                      </span>
                      {epic.name}
                    </>
                  )}
                </p>
              </div>
              {(epic.startDate || epic.endDate) && (
                <p className="shrink-0 text-right text-[10px] tabular-nums text-muted">
                  {formatDate(epic.startDate)} – {formatDate(epic.endDate)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : milestones.length > 0 ? (
        <div className="space-y-1.5">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Epics from scoping
          </p>
          {milestones.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-3 border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {m.epic || "Untitled epic"}
                </p>
                {m.milestone && (
                  <p className="mt-0.5 text-[10px] text-muted">{m.milestone}</p>
                )}
              </div>
              {(m.startDate || m.endDate) && (
                <p className="shrink-0 text-right text-[10px] tabular-nums text-muted">
                  {formatDate(m.startDate)} – {formatDate(m.endDate)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <ConfirmRow
        accent={ACCENT}
        label="Tickets and tasks have been added under each epic"
        onConfirm={onComplete}
      />
    </div>
  );
}
