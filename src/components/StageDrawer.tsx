"use client";

import { useEffect } from "react";
import { ArrowDown, Layers, X } from "lucide-react";
import { HighlightedText } from "@/components/HighlightedText";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import {
  getParty,
  stageAccent,
  WORKSPACE_SYSTEM,
  type WorkflowStage,
} from "@/data/workflow";

type StageDrawerProps = {
  stage: WorkflowStage | null;
  onClose: () => void;
};

export function StageDrawer({ stage, onClose }: StageDrawerProps) {
  useEffect(() => {
    if (!stage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, onClose]);

  if (!stage) return null;

  const accent = stageAccent(stage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close details"
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-surface animate-drawer-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-drawer-title"
      >
        <div
          className="border-b border-border px-5 py-4"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="font-display text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                Stage {String(stage.number).padStart(2, "0")}
              </p>
              <h2
                id="stage-drawer-title"
                className="font-display mt-1 text-3xl font-extrabold uppercase leading-none"
              >
                {stage.name}
              </h2>
              <p className="mt-3 text-sm text-muted">{stage.owner}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="border border-border p-2 text-muted transition-colors hover:border-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {stage.parties.map((partyId) => {
              const party = getParty(partyId);
              return (
                <span
                  key={partyId}
                  className="border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wider"
                  style={{ borderColor: party.color, color: party.color }}
                >
                  {party.label}
                </span>
              );
            })}
          </div>
          {[...stage.inputs, ...stage.outputs].some((t) =>
            t.includes(WORKSPACE_SYSTEM),
          ) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border border-border bg-white/[0.03] px-3 py-2">
              <p className="text-xs leading-snug text-muted">System of record</p>
              <WorkspaceChip />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="font-display mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              <Layers className="size-3.5" />
              Inputs
            </h3>
            <ol className="space-y-3">
              {stage.inputs.map((item, i) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    className="font-display mt-0.5 w-5 shrink-0 text-xs font-bold"
                    style={{ color: accent }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <HighlightedText text={item} />
                </li>
              ))}
            </ol>
          </section>

          <div className="my-6 flex items-center gap-2 text-muted">
            <div className="h-px flex-1 bg-border" />
            <ArrowDown className="size-4" />
            <div className="h-px flex-1 bg-border" />
          </div>

          <section>
            <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              Outputs
            </h3>
            <ul className="space-y-3">
              {stage.outputs.map((item) => (
                <li
                  key={item}
                  className={[
                    "border bg-surface-elevated px-3 py-3 text-sm leading-relaxed",
                    item.includes(WORKSPACE_SYSTEM)
                      ? "border-foreground/50"
                      : "border-border",
                  ].join(" ")}
                >
                  <HighlightedText text={item} />
                </li>
              ))}
            </ul>
          </section>

          {stage.branches && (
            <section className="mt-8">
              <h3 className="font-display mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {stage.leadPartyChoice
                  ? stage.leadPartyChoice.title
                  : "Execution Branches"}
              </h3>
              {stage.leadPartyChoice && (
                <div className="mb-4 border border-border bg-white/[0.03] px-3 py-3">
                  <p className="text-sm leading-relaxed text-foreground">
                    {stage.leadPartyChoice.rule}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {stage.leadPartyChoice.collaborationNote}
                  </p>
                </div>
              )}
              <div className="grid gap-2">
                {stage.branches.map((branch, index) => {
                  const party = getParty(branch.party);
                  return (
                    <div key={branch.id}>
                      {index > 0 && stage.leadPartyChoice && (
                        <p className="font-display my-1.5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                          or
                        </p>
                      )}
                      <div
                        className="flex items-center justify-between border border-border px-3 py-2.5"
                        style={{
                          borderLeftColor: party.color,
                          borderLeftWidth: 3,
                        }}
                      >
                        <span className="text-sm">{branch.label}</span>
                        <span
                          className="font-display text-[10px] font-bold uppercase tracking-wider"
                          style={{ color: party.color }}
                        >
                          {party.short}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {stage.layers && (
            <section className="mt-8">
              <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                Governance Overlay
              </h3>
              <div className="space-y-2">
                {stage.layers.map((layer) => (
                  <div
                    key={layer.title}
                    className="border border-border px-3 py-3"
                  >
                    <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-foreground">
                      {layer.title}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground/85">
                      {layer.items.map((item) => (
                        <li key={item}>
                          <HighlightedText text={item} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
