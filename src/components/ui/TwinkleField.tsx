import type { CSSProperties } from "react";

/**
 * Upper-right dotted atmosphere. Static grid plus a few staggered
 * twinkles — decorative only, no pointer events.
 */

type Dot = {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  duration?: number;
  delay?: number;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const COLS = 36;
const ROWS = 20;
const GAP = 16;
const rand = mulberry32(20260820);

const DOTS: Dot[] = [];
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    if (rand() < 0.14) continue;
    const towardCorner = (col / (COLS - 1)) * (1 - row / (ROWS - 1));
    const twinkle = rand() < 0.22 + towardCorner * 0.28;
    DOTS.push({
      cx: col * GAP + 8,
      cy: row * GAP + 8,
      r: rand() < 0.1 ? 1.2 : 0.85,
      opacity: 0.07 + rand() * 0.16 + towardCorner * 0.14,
      ...(twinkle
        ? { duration: 3.6 + rand() * 5.2, delay: rand() * 9 }
        : {}),
    });
  }
}

const VIEW_W = (COLS - 1) * GAP + 16;
const VIEW_H = (ROWS - 1) * GAP + 16;

export function TwinkleField({
  corner = "top-right",
  contained = false,
}: {
  corner?: "top-right" | "top-left";
  /** Size the field to its parent instead of the viewport. */
  contained?: boolean;
} = {}) {
  return (
    <div
      aria-hidden
      className={[
        "twinkle-field print:hidden",
        corner === "top-left" ? "twinkle-field--tl" : "",
        contained ? "twinkle-field--contained" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        className="twinkle-field__svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        fill="none"
      >
        {DOTS.map((dot) => (
          <circle
            key={`${dot.cx}-${dot.cy}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill="#ffffff"
            className={dot.duration ? "twinkle-dot" : undefined}
            style={
              {
                "--dot-o": String(dot.opacity),
                "--twinkle-dur": dot.duration ? `${dot.duration}s` : undefined,
                "--twinkle-delay": dot.delay ? `${dot.delay}s` : undefined,
                opacity: dot.opacity,
              } as CSSProperties
            }
          />
        ))}
      </svg>
    </div>
  );
}
