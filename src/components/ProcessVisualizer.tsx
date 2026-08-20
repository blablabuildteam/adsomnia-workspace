"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Gauge, Sparkles } from "lucide-react";
import { FAST_TRACK, STAGES, type PartyId } from "@/data/workflow";
import { HighlightedText } from "@/components/HighlightedText";
import { StageCard } from "@/components/StageCard";
import { StageDrawer } from "@/components/StageDrawer";
import { VisualizerToolbar } from "@/components/VisualizerToolbar";
import { WorkspaceChip } from "@/components/WorkspaceChip";

export function ProcessVisualizer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fastTrackActive, setFastTrackActive] = useState(false);
  const [activeParty, setActiveParty] = useState<PartyId | null>(null);

  const selectedStage = useMemo(
    () => STAGES.find((s) => s.id === selectedId) ?? null,
    [selectedId],
  );

  const landingStage = useMemo(
    () => STAGES.find((s) => s.fastTrackLanding) ?? null,
    [],
  );

  const bypassedStages = useMemo(
    () => STAGES.filter((s) => s.fastTrackBypass),
    [],
  );

  return (
    <div className="app-atmosphere flex min-h-full w-full min-w-0 flex-1 flex-col overflow-x-hidden">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
                Adsomnia Workspace
              </p>
              <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
                Production
                <br />
                Framework
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                Interactive process map of how initiatives move through the{" "}
                <WorkspaceChip /> — 7 stages, Fast-Track exception, and
                multi-party execution.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <Image
                src="/brand/traffic-never-sleeps.png"
                alt="Traffic Never Sleeps"
                width={806}
                height={208}
                priority
                className="h-auto w-[220px] sm:w-[260px] lg:w-[300px]"
              />
              <div className="flex items-center gap-2 border border-border px-3 py-2 text-xs text-muted">
                <Gauge className="size-3.5 text-foreground" />
                <span>7 stages · Fast-Track · Governance</span>
              </div>
            </div>
          </div>

          <VisualizerToolbar
            fastTrackActive={fastTrackActive}
            onToggleFastTrack={() => setFastTrackActive((v) => !v)}
            activeParty={activeParty}
            onSelectParty={setActiveParty}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col py-6">
        <div className="px-4 sm:px-6 lg:px-8">
          {fastTrackActive && (
            <div className="mb-5 flex items-start gap-3 border border-foreground/40 bg-white/5 px-4 py-3 animate-fade-in">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-foreground" />
              <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                {FAST_TRACK.name} — Straight to Production
              </p>
                <p className="mt-1 text-sm text-foreground/90">
                  <span className="text-foreground">{FAST_TRACK.condition}</span>
                  {" — "}
                  <HighlightedText text={FAST_TRACK.action} />
                </p>
              </div>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              Workflow Timeline
            </p>
            <p className="text-xs text-muted">
              Scroll horizontally · Click a stage for detail
            </p>
          </div>
        </div>

        {/* Isolated scrollport: min-w-0 prevents flex from expanding the page */}
        <div className="timeline-scroll min-w-0 overflow-x-auto overscroll-x-contain pb-4">
          <div className="flex w-max items-stretch gap-0 px-4 py-2 sm:px-6 lg:px-8">
            {fastTrackActive ? (
              <>
                <div className="flex w-[280px] shrink-0 flex-col border border-foreground bg-white/5 fast-track-pulse">
                  <div className="border-b border-foreground/30 px-4 py-3">
                    <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                      Exception
                    </p>
                    <h3 className="font-display mt-1 text-2xl font-extrabold uppercase leading-none">
                      Fast-Track
                    </h3>
                  </div>
                  <div className="flex flex-1 flex-col justify-between px-4 py-4 text-sm">
                    <p>
                      Condition: request duration{" "}
                      <span className="text-foreground">&lt; 4 hours</span>
                    </p>
                    <p className="mt-3 text-sm text-foreground/90">
                      Skips{" "}
                      <span className="font-semibold">all</span> standard stages
                      and goes straight into{" "}
                      <span className="font-semibold">Production</span>.
                    </p>
                    <p className="mt-3 text-sm text-muted">
                      Ticket created in the <WorkspaceChip />{" "}
                      <span className="text-foreground">Fast-Track View</span>
                    </p>
                  </div>
                </div>
                <FlowConnector
                  label="→ Production"
                  accent="#FFFFFF"
                  animated
                />
                {landingStage && (
                  <StageCard
                    stage={landingStage}
                    selected={selectedId === landingStage.id}
                    dimmed={false}
                    fastTrackActive={fastTrackActive}
                    activeParty={activeParty}
                    onSelect={setSelectedId}
                  />
                )}
                <div className="mx-2 flex w-14 shrink-0 flex-col items-center justify-center gap-2">
                  <div className="h-8 w-px bg-border" />
                  <span className="font-display text-center text-[9px] font-bold uppercase leading-tight tracking-[0.14em] text-muted">
                    Skipped
                    <br />
                    stages
                  </span>
                  <div className="h-8 w-px bg-border" />
                </div>
                {bypassedStages.map((stage, index) => (
                  <div key={stage.id} className="flex shrink-0 items-stretch">
                    <StageCard
                      stage={stage}
                      selected={selectedId === stage.id}
                      dimmed={false}
                      fastTrackActive={fastTrackActive}
                      activeParty={activeParty}
                      onSelect={setSelectedId}
                    />
                    {index < bypassedStages.length - 1 && (
                      <FlowConnector accent="#444" muted />
                    )}
                  </div>
                ))}
              </>
            ) : (
              STAGES.map((stage, index) => (
                <div key={stage.id} className="flex shrink-0 items-stretch">
                  <StageCard
                    stage={stage}
                    selected={selectedId === stage.id}
                    dimmed={false}
                    fastTrackActive={false}
                    activeParty={activeParty}
                    onSelect={setSelectedId}
                  />
                  {index < STAGES.length - 1 && (
                    <FlowConnector accent="#FFFFFF" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <section className="mt-8 grid gap-4 border border-border bg-surface/60 p-4 mx-4 sm:grid-cols-2 sm:mx-6 sm:p-5 lg:mx-8 lg:grid-cols-4">
          <LegendItem
            color="#FFFFFF"
            title="Adsomnia"
            detail="Leadership, intake, validation, governance"
          />
          <LegendItem
            color="#E8A07C"
            title="Bending The Rules"
            detail="Production execution lane"
          />
          <LegendItem
            color="#7E90A3"
            title="Harlem Next"
            detail="Production lane for IT/Product, Data & Pricing"
          />
          <LegendItem
            color="#CEFF00"
            title="blablabuild"
            detail="AI innovation partner"
          />
        </section>
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        Adsomnia Production Framework · Presentation view for client reviews
      </footer>

      <StageDrawer stage={selectedStage} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function FlowConnector({
  label,
  accent = "#FFFFFF",
  muted = false,
  animated = false,
}: {
  label?: string;
  accent?: string;
  muted?: boolean;
  animated?: boolean;
}) {
  return (
    <div
      className={[
        "flex w-12 shrink-0 flex-col items-center justify-center px-1",
        muted ? "opacity-30" : "opacity-100",
      ].join(" ")}
    >
      {label && (
        <span
          className="mb-1 font-display text-[8px] font-bold uppercase tracking-wider"
          style={{ color: accent }}
        >
          {label}
        </span>
      )}
      <svg width="40" height="12" viewBox="0 0 40 12" aria-hidden>
        <line
          x1="0"
          y1="6"
          x2="28"
          y2="6"
          stroke={accent}
          strokeWidth="1.5"
          className={animated ? "flow-arrow-animated" : undefined}
        />
        <polygon points="28,2 40,6 28,10" fill={accent} />
      </svg>
      {!label && <ArrowRight className="sr-only" />}
    </div>
  );
}

function LegendItem({
  color,
  title,
  detail,
}: {
  color: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 border border-border px-3 py-3">
      <span
        className="mt-1 size-2.5 shrink-0"
        style={{ backgroundColor: color }}
      />
      <div>
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.14em]">
          {title}
        </p>
        <p className="mt-1 text-xs text-muted">{detail}</p>
      </div>
    </div>
  );
}
