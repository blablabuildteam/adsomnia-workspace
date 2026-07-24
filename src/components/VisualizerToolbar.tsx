"use client";

import { Filter, Zap } from "lucide-react";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import { PARTIES, type PartyId } from "@/data/workflow";

type VisualizerToolbarProps = {
  fastTrackActive: boolean;
  onToggleFastTrack: () => void;
  activeParty: PartyId | null;
  onSelectParty: (party: PartyId | null) => void;
};

export function VisualizerToolbar({
  fastTrackActive,
  onToggleFastTrack,
  activeParty,
  onSelectParty,
}: VisualizerToolbarProps) {
  const filterParties = PARTIES.filter((p) => p.id !== "as");

  return (
    <div className="flex flex-col gap-4 border border-border bg-surface/80 px-4 py-3 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-muted">
          <Zap className="size-4 text-foreground" />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em]">
            Fast-Track
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={fastTrackActive}
          onClick={onToggleFastTrack}
          className={[
            "relative h-8 w-[52px] border transition-colors",
            fastTrackActive
              ? "border-foreground bg-white/15 fast-track-pulse"
              : "border-border bg-black",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-1 size-5 bg-foreground transition-all duration-200",
              fastTrackActive ? "left-7" : "left-1",
            ].join(" ")}
          />
        </button>
        <p className="max-w-md text-xs text-muted">
          {fastTrackActive ? (
            <>
              &lt; 4h requests skip all stages → Production via{" "}
              <WorkspaceChip className="mx-1" /> Fast-Track View
            </>
          ) : (
            "Toggle to highlight the < 4h path straight into Production"
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 flex items-center gap-2 text-muted">
          <Filter className="size-3.5" />
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em]">
            Party
          </span>
        </div>
        <button
          type="button"
          onClick={() => onSelectParty(null)}
          className={[
            "border px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider transition-colors",
            activeParty === null
              ? "border-foreground bg-foreground text-black"
              : "border-border text-muted hover:border-border-strong hover:text-foreground",
          ].join(" ")}
        >
          All
        </button>
        {filterParties.map((party) => {
          const active = activeParty === party.id;
          const activeText =
            party.id === "adsomnia" || party.id === "bbb" ? "#000000" : "#FFFFFF";
          return (
            <button
              key={party.id}
              type="button"
              onClick={() => onSelectParty(active ? null : party.id)}
              className={[
                "border px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider transition-all",
                active ? "" : "bg-transparent hover:bg-white/5",
              ].join(" ")}
              style={{
                borderColor: party.color,
                color: active ? activeText : party.color,
                backgroundColor: active ? party.color : undefined,
              }}
            >
              {party.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
