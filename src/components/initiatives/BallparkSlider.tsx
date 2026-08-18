"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { GripVertical } from "lucide-react";

type Option = { value: string; label: string; hint?: string };

type Props = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[];
  required?: boolean;
};

/**
 * A "ballpark" range slider: a wide draggable bar (~1/3 of the track width)
 * that sits over labeled segments. The center of the bar determines the
 * active label. Feels quick, dirty, and playful vs a precise dropdown.
 */
export function BallparkSlider({
  name,
  value,
  onChange,
  options,
  required,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const userInteracted = useRef(false);

  const segmentCount = options.length;
  const segmentWidth = 100 / segmentCount;
  const barWidth = segmentWidth;
  const barHalf = barWidth / 2;
  const minCenter = barHalf;
  const maxCenter = 100 - barHalf;

  const activeIndex = value
    ? options.findIndex((o) => o.value === value)
    : -1;

  function centerForIndex(idx: number): number {
    return segmentWidth * idx + segmentWidth / 2;
  }

  const [center, setCenter] = useState<number>(() => {
    if (activeIndex >= 0) return centerForIndex(activeIndex);
    return 50;
  });

  useEffect(() => {
    if (userInteracted.current) return;
    if (activeIndex >= 0) {
      setCenter(centerForIndex(activeIndex));
    }
  }, [activeIndex, segmentWidth]);

  const isActive = value !== "";

  function indexFromCenter(c: number): number {
    const idx = Math.floor(c / segmentWidth);
    return Math.max(0, Math.min(segmentCount - 1, idx));
  }

  const handleMove = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(minCenter, Math.min(maxCenter, pct));
      setCenter(pct);
      const idx = indexFromCenter(pct);
      const opt = options[idx];
      if (opt && opt.value !== value) {
        onChange(opt.value);
      }
    },
    [minCenter, maxCenter, options, value, onChange, segmentWidth, segmentCount],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      dragging.current = true;
      userInteracted.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleMove(e.clientX);
    },
    [handleMove],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      handleMove(e.clientX);
    },
    [handleMove],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [],
  );

  const barLeft = center - barHalf;

  return (
    <div className="group mt-2 select-none">
      <input
        type="hidden"
        name={name}
        value={value}
        required={required && !value}
      />

      {/* Track */}
      <div
        ref={trackRef}
        className="ballpark-track relative h-12 w-full cursor-grab border border-border active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="slider"
        aria-valuetext={value || "unset"}
        aria-label={name}
        tabIndex={0}
        onKeyDown={(e) => {
          const step =
            e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            userInteracted.current = true;
            const nextIdx = Math.max(
              0,
              Math.min(segmentCount - 1, (activeIndex < 0 ? Math.floor(segmentCount / 2) : activeIndex) + step),
            );
            onChange(options[nextIdx].value);
            setCenter(centerForIndex(nextIdx));
          }
        }}
      >
        {/* Segment labels (behind the bar) */}
        <div className="pointer-events-none absolute inset-0 flex">
          {options.map((opt, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <div
                key={opt.value}
                className="flex flex-1 flex-col items-center justify-center border-r border-border last:border-r-0"
              >
                <span
                  className={[
                    "font-display text-[11px] font-bold uppercase tracking-wide transition-colors",
                    isSelected
                      ? "text-foreground"
                      : "text-muted/50",
                  ].join(" ")}
                >
                  {opt.label}
                </span>
                {opt.hint && (
                  <span
                    className={[
                      "mt-0.5 text-[9px] normal-case tracking-normal transition-colors",
                      isSelected ? "text-muted" : "text-muted/30",
                    ].join(" ")}
                  >
                    {opt.hint}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Draggable bar */}
        <div
          className={[
            "ballpark-bar absolute inset-y-0 flex items-center justify-center bg-white/[0.06]",
            isActive
              ? "border border-white"
              : "border border-transparent",
          ].join(" ")}
          style={{
            width: `${barWidth}%`,
            left: `${barLeft}%`,
          }}
        >
          <GripVertical
            className={[
              "size-4 opacity-0 transition-opacity group-hover:opacity-100",
              isActive ? "text-white/50" : "text-muted/30",
            ].join(" ")}
          />
        </div>
      </div>

      {/* Active value indicator below — hides on hover (drag mode) */}
      {isActive && (
        <div className="mt-1.5 flex items-center justify-between transition-opacity group-hover:opacity-0">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
            {options[activeIndex]?.label}
          </span>
          {options[activeIndex]?.hint && (
            <span className="text-[10px] text-muted">
              {options[activeIndex].hint}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
