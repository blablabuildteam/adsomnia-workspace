"use client";

import { ArrowDown, ChevronRight, Users } from "lucide-react";
import { HighlightedText } from "@/components/HighlightedText";
import { JiraChip } from "@/components/JiraChip";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import {
  getParty,
  stageAccent,
  WORKSPACE_SYSTEM,
  type PartyId,
  type WorkflowStage,
} from "@/data/workflow";

type StageCardProps = {
  stage: WorkflowStage;
  selected: boolean;
  dimmed: boolean;
  fastTrackActive: boolean;
  activeParty: PartyId | null;
  onSelect: (id: string) => void;
};

export function StageCard({
  stage,
  selected,
  dimmed,
  fastTrackActive,
  activeParty,
  onSelect,
}: StageCardProps) {
  const accent = stageAccent(stage);
  const bypassed = fastTrackActive && !!stage.fastTrackBypass;
  const landing = fastTrackActive && !!stage.fastTrackLanding;
  const partyMatch =
    !activeParty ||
    stage.parties.includes(activeParty) ||
    stage.branches?.some((b) => b.party === activeParty);
  const stageText = [...stage.inputs, ...stage.outputs, ...(stage.layers?.flatMap((l) => l.items) ?? [])];
  const touchesWorkspace = stageText.some((t) => t.includes(WORKSPACE_SYSTEM));
  const touchesJira = stageText.some((t) => /\bJira\b|\bJIRA\b/.test(t));

  return (
    <button
      type="button"
      onClick={() => onSelect(stage.id)}
      className={[
        "group relative flex w-[340px] shrink-0 flex-col border text-left transition-all duration-300",
        "bg-surface hover:bg-surface-elevated",
        selected || landing
          ? "border-foreground ring-1 ring-foreground"
          : "border-border hover:border-border-strong",
        dimmed || !partyMatch ? "opacity-35 grayscale" : "opacity-100",
        bypassed ? "opacity-30 saturate-0" : "",
        landing ? "fast-track-pulse bg-white/[0.04]" : "",
      ].join(" ")}
      style={{
        borderTopColor: selected || partyMatch || landing ? accent : undefined,
        borderTopWidth: 3,
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p
            className="font-display text-[11px] font-bold uppercase tracking-[0.18em]"
            style={{ color: accent }}
          >
            Stage {String(stage.number).padStart(2, "0")}
          </p>
          <h3 className="font-display mt-1 text-2xl font-extrabold uppercase leading-none tracking-tight">
            {stage.name}
          </h3>
          {landing && (
            <p className="font-display mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">
              Fast-Track entry → Production
            </p>
          )}
        </div>
        <ChevronRight
          className={[
            "mt-1 size-4 shrink-0 text-muted transition-transform duration-200",
            selected
              ? "translate-x-0.5 text-foreground"
              : "group-hover:translate-x-0.5",
          ].join(" ")}
        />
      </div>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5 text-xs text-muted">
        <Users className="size-3.5 shrink-0" />
        <span className="leading-snug">{stage.owner}</span>
      </div>

      {(touchesWorkspace || touchesJira) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-white/[0.03] px-4 py-2">
          {touchesWorkspace && <WorkspaceChip />}
          {touchesJira && <JiraChip />}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-0 px-4 py-3">
        <p className="font-display mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Input
        </p>
        <ul className="space-y-2 text-[12px] leading-snug text-foreground/85">
          {stage.inputs.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 bg-foreground/50" />
              <HighlightedText text={item} boldLabel />
            </li>
          ))}
        </ul>

        <div className="my-3 flex items-center gap-2 text-muted">
          <div className="h-px flex-1 bg-border" />
          <ArrowDown className="size-3.5" />
          <div className="h-px flex-1 bg-border" />
        </div>

        <p className="font-display mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          Output
        </p>
        <ul className="space-y-2.5 text-[12px] leading-snug text-foreground/90">
          {stage.outputs.map((item) => (
            <li
              key={item}
              className={[
                "flex gap-2 border-l-2 pl-2",
                item.includes(WORKSPACE_SYSTEM)
                  ? "border-foreground/70"
                  : /\bJira\b|\bJIRA\b/.test(item)
                    ? "border-[#2684FF]/70"
                    : "border-transparent",
              ].join(" ")}
            >
              <span
                className="mt-1.5 size-1.5 shrink-0"
                style={{ background: accent }}
              />
              <HighlightedText text={item} />
            </li>
          ))}
        </ul>
      </div>

      {stage.branches && (
        <div className="mt-auto border-t border-border px-3 py-2.5">
          {stage.leadPartyChoice && (
            <div className="mb-2">
              <p className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-foreground">
                {stage.leadPartyChoice.title}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-muted">
                One lead · others may collaborate
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1">
            {stage.branches.map((branch, index) => {
              const party = getParty(branch.party);
              const highlighted = !activeParty || activeParty === branch.party;
              return (
                <div key={branch.id} className="flex items-center gap-1">
                  {index > 0 && stage.leadPartyChoice && (
                    <span className="font-display px-0.5 text-[8px] font-bold uppercase tracking-wider text-muted">
                      or
                    </span>
                  )}
                  <span
                    className={[
                      "border px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider transition-opacity",
                      highlighted ? "opacity-100" : "opacity-25",
                    ].join(" ")}
                    style={{
                      borderColor: party.color,
                      color: party.color,
                      backgroundColor: party.background,
                    }}
                  >
                    {party.short}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bypassed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
          <span className="border border-foreground bg-black px-2 py-1 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
            Bypassed
          </span>
        </div>
      )}
    </button>
  );
}
