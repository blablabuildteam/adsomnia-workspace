"use client";

import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import {
  IMPACT_MAX,
  IMPACT_MIN,
  impactScoreLabel,
} from "@/lib/validation-data";

export function ImpactSlider({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const pct = ((value - IMPACT_MIN) / (IMPACT_MAX - IMPACT_MIN)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
          Impact — {label}
          <Check className="animate-check-pop size-3.5 shrink-0 text-success" />
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold tabular-nums text-foreground">
            {value}
            <span className="text-muted">/10</span>
          </span>
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            {impactScoreLabel(value)}
          </span>
        </span>
      </div>
      <div className="relative pt-1">
        <input
          type="range"
          name={name}
          min={IMPACT_MIN}
          max={IMPACT_MAX}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} impact score`}
          className="impact-slider w-full"
          style={{ "--impact-pct": `${pct}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}
