"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Eye } from "lucide-react";
import {
  EXPAND_PHASE_EVENT,
  phaseCardDomId,
} from "./PhaseCard";

const STATUS_COLORS = {
  progress: "#EAB308",
  review: "#38BDF8",
  ready: "#22C55E",
} as const;

type PhaseStatus = "current" | "review" | "ready";

type Props = {
  stageId: string;
  stageNumber: number;
  stageName: string;
  stageColor: string;
  status: PhaseStatus;
  readyLabel?: string;
};

function getScroller(): HTMLElement | null {
  return document.querySelector("main.workspace-content");
}

export function CurrentPhaseBar({
  stageId,
  stageNumber,
  stageName,
  stageColor,
  status,
  readyLabel = "Ready for Onboarding",
}: Props) {
  const [visible, setVisible] = useState(false);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  const rafId = useRef(0);

  const syncBox = useCallback(() => {
    const scroller = getScroller();
    if (!scroller) return;
    const rect = scroller.getBoundingClientRect();
    setBox((prev) =>
      prev && prev.left === rect.left && prev.width === rect.width
        ? prev
        : { left: rect.left, width: rect.width },
    );
  }, []);

  useEffect(() => {
    const scroller = getScroller();
    if (!scroller) return;

    syncBox();
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(syncBox);
    });
    resize.observe(scroller);
    window.addEventListener("resize", syncBox);

    return () => {
      resize.disconnect();
      window.removeEventListener("resize", syncBox);
      cancelAnimationFrame(rafId.current);
    };
  }, [syncBox]);

  useEffect(() => {
    const scroller = getScroller();
    let observer: IntersectionObserver | null = null;
    let retryId = 0;

    function attach() {
      const card = document.getElementById(phaseCardDomId(stageId));
      if (!card) {
        setVisible(false);
        return;
      }

      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          const fold = entry.rootBounds?.bottom ?? window.innerHeight;
          // Only while the phase is still below the fold — not after its
          // title has scrolled up and the user is working inside it.
          setVisible(entry.boundingClientRect.top > fold);
        },
        {
          root: scroller,
          threshold: 0,
        },
      );
      observer.observe(card);
    }

    attach();
    retryId = requestAnimationFrame(attach);

    return () => {
      cancelAnimationFrame(retryId);
      observer?.disconnect();
    };
  }, [stageId]);

  function jumpToPhase() {
    const card = document.getElementById(phaseCardDomId(stageId));
    if (!card) return;
    card.dispatchEvent(new Event(EXPAND_PHASE_EVENT));
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    card.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  const phaseLabel = `Phase ${String(stageNumber).padStart(2, "0")}`;
  const ready = box !== null;

  return (
    <div
      className={[
        "fixed z-40 print:hidden transition-all duration-300",
        ready && visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0",
      ].join(" ")}
      style={{
        left: box?.left ?? 0,
        width: box?.width ?? "100%",
        bottom: 0,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <button
        type="button"
        onClick={jumpToPhase}
        aria-hidden={!ready || !visible}
        tabIndex={ready && visible ? 0 : -1}
        className="group/jump flex w-full flex-col border-t border-border bg-surface/90 text-left backdrop-blur-sm transition-colors hover:bg-surface-elevated"
        aria-label={`Open current phase: ${stageName}`}
      >
        <span
          aria-hidden
          className="h-[3px] w-full"
          style={{ backgroundColor: stageColor }}
        />
        <span className="mx-auto flex h-[68px] w-full max-w-[1200px] items-center gap-3.5 px-4 sm:px-6">
          <span className="min-w-0 flex-1">
            <span
              className="font-display block text-[10px] font-bold uppercase tracking-[0.25em]"
              style={{ color: stageColor }}
            >
              {phaseLabel}
            </span>
            <span className="font-display mt-0.5 block truncate text-base font-extrabold uppercase tracking-tight text-foreground">
              {stageName}
            </span>
          </span>
          {status === "review" ? (
            <span
              className="font-display hidden items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:flex"
              style={{
                borderColor: STATUS_COLORS.review,
                color: STATUS_COLORS.review,
                backgroundColor: `${STATUS_COLORS.review}1A`,
              }}
            >
              <Eye className="size-3 animate-pulse" />
              Review
            </span>
          ) : status === "ready" ? (
            <span
              className="font-display hidden items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:flex"
              style={{
                borderColor: STATUS_COLORS.ready,
                color: STATUS_COLORS.ready,
                backgroundColor: `${STATUS_COLORS.ready}1A`,
              }}
            >
              <Check className="size-3" />
              {readyLabel}
            </span>
          ) : (
            <span
              className="font-display hidden items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:flex"
              style={{
                borderColor: STATUS_COLORS.progress,
                color: STATUS_COLORS.progress,
                backgroundColor: `${STATUS_COLORS.progress}1A`,
              }}
            >
              <span
                className="size-1.5 shrink-0 animate-pulse rounded-full"
                style={{ backgroundColor: STATUS_COLORS.progress }}
                aria-hidden
              />
              In Progress
            </span>
          )}
          <span className="font-display ml-1 inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted transition-colors group-hover/jump:text-foreground">
            Open
            <ChevronRight className="size-4" />
          </span>
        </span>
      </button>
    </div>
  );
}
