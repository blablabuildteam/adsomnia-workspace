"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Loader2,
  Maximize2,
  Presentation,
  X,
} from "lucide-react";
import { getStageColor } from "@/data/workflow";
import { PhaseSectionCard } from "../PhaseSectionCard";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  getOnboardingProgress,
  type OnboardingData,
  type OnboardingTaskId,
} from "@/lib/validation-data";
import {
  InitiativeBriefBody,
  ScopingBriefBody,
  ValidationBriefBody,
  type BriefingBodyProps,
} from "./BriefingContent";

const ACCENT = getStageColor("onboarding");

const BLOCKS: {
  taskId: OnboardingTaskId;
  dataKey: keyof OnboardingData;
  number: number;
  stage: string;
  title: string;
  Body: (props: BriefingBodyProps) => React.ReactNode;
}[] = [
  {
    taskId: "briefing-initiative",
    dataKey: "briefingInitiative",
    number: 1,
    stage: "Initiative",
    title: "Why we are doing this",
    Body: InitiativeBriefBody,
  },
  {
    taskId: "briefing-validation",
    dataKey: "briefingValidation",
    number: 2,
    stage: "Validation",
    title: "The business case",
    Body: ValidationBriefBody,
  },
  {
    taskId: "briefing-scoping",
    dataKey: "briefingScoping",
    number: 3,
    stage: "Scoping",
    title: "Scope, timeline & team",
    Body: ScopingBriefBody,
  },
];

type Props = {
  initiative: InitiativeWithUsers;
  data: OnboardingData;
  readOnly?: boolean;
  pendingTask?: OnboardingTaskId | null;
  onReview: (taskId: OnboardingTaskId) => void;
  onUndo: (taskId: OnboardingTaskId) => void;
};

function isReviewed(data: OnboardingData, dataKey: keyof OnboardingData) {
  const block = data[dataKey] as { status?: string } | undefined;
  return block?.status === "completed";
}

export function BriefingDeck({
  initiative,
  data,
  readOnly,
  pendingTask,
  onReview,
  onUndo,
}: Props) {
  const progress = getOnboardingProgress(data, "briefing");
  const firstUnreviewed =
    BLOCKS.find((block) => !isReviewed(data, block.dataKey))?.taskId ?? null;

  const [openBlock, setOpenBlock] = useState<OnboardingTaskId | null>(
    firstUnreviewed,
  );
  const [presenting, setPresenting] = useState(false);
  const [slide, setSlide] = useState(0);

  const startPresenting = () => {
    const index = BLOCKS.findIndex((block) => block.taskId === firstUnreviewed);
    setSlide(index === -1 ? 0 : index);
    setPresenting(true);
  };

  const next = useCallback(
    () => setSlide((current) => Math.min(current + 1, BLOCKS.length - 1)),
    [],
  );
  const previous = useCallback(
    () => setSlide((current) => Math.max(current - 1, 0)),
    [],
  );

  useEffect(() => {
    if (!presenting) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPresenting(false);
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [presenting, next, previous]);

  const current = BLOCKS[slide];
  const currentReviewed = isReviewed(data, current.dataKey);
  const isLast = slide === BLOCKS.length - 1;

  const reviewAndAdvance = () => {
    if (!currentReviewed) onReview(current.taskId);
    if (!isLast) next();
    else setPresenting(false);
  };

  return (
    <>
      <PhaseSectionCard
        header={
          <>
            <div className="flex items-center gap-2 text-muted">
              <Presentation
                className="size-3.5 shrink-0"
                style={{ color: ACCENT }}
              />
              <p className="font-display text-[10px] font-bold uppercase tracking-wide">
                Kickoff Briefing
              </p>
              <span className="font-display text-[10px] font-bold tabular-nums text-muted/60">
                {progress.completed}/{progress.total} reviewed
              </span>
            </div>
            <button
              type="button"
              onClick={startPresenting}
              className="inline-flex items-center gap-2 border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors hover:bg-white/[0.06]"
              style={{ borderColor: `${ACCENT}66`, color: ACCENT }}
            >
              <Maximize2 className="size-3" />
              Present Fullscreen
            </button>
          </>
        }
        bodyClassName="space-y-2 p-4"
      >
        <p className="text-xs text-muted">
          Walk the team through each phase, then mark it reviewed.
        </p>

        {/* Inline accordion */}
        <div className="space-y-2">
          {BLOCKS.map((block) => {
            const reviewed = isReviewed(data, block.dataKey);
            const open = openBlock === block.taskId;
            const busy = pendingTask === block.taskId;

            return (
              <div
                key={block.taskId}
                className="border border-border transition-colors hover:border-border-strong"
              >
                <div className="relative flex items-center gap-3 bg-surface px-4 py-3">
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-label={`${open ? "Collapse" : "Expand"} ${block.title}`}
                    onClick={() => setOpenBlock(open ? null : block.taskId)}
                    className="absolute inset-0 z-0 cursor-pointer"
                  />
                  <button
                    type="button"
                    disabled={readOnly || busy}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (reviewed) onUndo(block.taskId);
                      else onReview(block.taskId);
                    }}
                    aria-label={
                      reviewed
                        ? `Mark ${block.title} not reviewed`
                        : `Mark ${block.title} reviewed`
                    }
                    title={
                      readOnly
                        ? "Only the Head of Production can run the briefing"
                        : reviewed
                          ? "Click to undo"
                          : "Mark reviewed"
                    }
                    className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded border transition-colors ${
                      reviewed
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-white/[0.12] text-muted/40"
                    } ${
                      readOnly || busy
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:border-success hover:text-success"
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : reviewed ? (
                      <Check className="size-4" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                  </button>
                  <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-3">
                    <span className="min-w-0 flex-1">
                      <span
                        className="font-display text-[9px] font-bold uppercase tracking-[0.25em]"
                        style={{ color: ACCENT }}
                      >
                        Phase {String(block.number).padStart(2, "0")} ·{" "}
                        {block.stage}
                      </span>
                      <span
                        className={`block font-display text-xs font-bold uppercase tracking-wide ${
                          reviewed ? "text-muted" : "text-foreground"
                        }`}
                      >
                        {block.title}
                      </span>
                    </span>
                    <ChevronDown
                      className={`size-3.5 shrink-0 text-muted transition-transform duration-300 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </div>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="border-t border-border px-4 py-4 sm:px-5">
                      <block.Body initiative={initiative} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </PhaseSectionCard>

      {/* Fullscreen presentation — only ever opened by a click, so the DOM exists */}
      {presenting &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Kickoff briefing"
            className="animate-fade-in fixed inset-0 z-[100] flex flex-col bg-background"
          >
            <header className="relative flex items-center justify-between gap-4 border-b border-border px-5 py-4">
              {pendingTask === current.taskId && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
                >
                  <span
                    className="briefing-loading-bar block h-full w-1/4"
                    style={{ backgroundColor: ACCENT }}
                  />
                </span>
              )}
              <div className="min-w-0">
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-muted">
                  {initiative.ticketId} · Kickoff Briefing
                </p>
                <p className="truncate font-display text-sm font-bold uppercase tracking-wide">
                  {initiative.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPresenting(false)}
                className="inline-flex items-center gap-2 border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
              >
                <X className="size-3" />
                Close
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 sm:py-12">
              {/* Keyed on the slide so the staged reveal replays on every move */}
              <div key={current.taskId} className="mx-auto w-full max-w-4xl">
                <p
                  className="briefing-slide-eyebrow font-display text-xs font-bold uppercase tracking-[0.35em]"
                  style={{ color: ACCENT }}
                >
                  Phase {String(current.number).padStart(2, "0")} ·{" "}
                  {current.stage}
                </p>
                <h3 className="briefing-slide-title mt-2 font-display text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
                  {current.title}
                </h3>
                <div
                  aria-hidden
                  className="briefing-slide-rule mt-5 h-px w-full"
                  style={{
                    background: `linear-gradient(to right, ${ACCENT}, ${ACCENT}00)`,
                  }}
                />
                <div className="mt-8">
                  <current.Body initiative={initiative} presenting />
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-between gap-4 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={previous}
                disabled={slide === 0}
                className="inline-flex items-center gap-2 border border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-30"
              >
                <ArrowLeft className="size-3" />
                Previous
              </button>

              <div className="flex items-center gap-2">
                {BLOCKS.map((block, index) => (
                  <span
                    key={block.taskId}
                    aria-hidden
                    className="h-1 w-8 bg-white/[0.12]"
                  >
                    {(index === slide || isReviewed(data, block.dataKey)) && (
                      <span
                        key={index === slide ? "active" : "reviewed"}
                        className="briefing-progress-fill block h-full w-full"
                        style={{
                          backgroundColor: index === slide ? ACCENT : "#22C55E",
                        }}
                      />
                    )}
                  </span>
                ))}
                <span className="ml-2 font-display text-[10px] font-bold uppercase tracking-wide tabular-nums text-muted">
                  {slide + 1} / {BLOCKS.length}
                </span>
              </div>

              {readOnly ? (
                <button
                  type="button"
                  onClick={isLast ? () => setPresenting(false) : next}
                  className="inline-flex items-center gap-2 border border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
                >
                  {isLast ? "Close" : "Next"}
                  <ArrowRight className="size-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={reviewAndAdvance}
                  disabled={pendingTask === current.taskId}
                  className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                >
                  {pendingTask === current.taskId ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Check className="size-3" />
                  )}
                  {currentReviewed
                    ? isLast
                      ? "Finish Briefing"
                      : "Next Phase"
                    : isLast
                      ? "Mark Reviewed & Finish"
                      : "Mark Reviewed & Next"}
                </button>
              )}
            </footer>
          </div>,
          document.body,
        )}
    </>
  );
}
