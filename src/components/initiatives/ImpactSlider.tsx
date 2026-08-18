"use client";

import { Check, PiggyBank, TrendingUp, Zap, type LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import {
  IMPACT_MAX,
  IMPACT_MIN,
  impactScoreLabel,
  type BusinessValueType,
} from "@/lib/validation-data";

export const BUSINESS_VALUE_ICONS: Record<BusinessValueType, LucideIcon> = {
  speed: Zap,
  "cost-efficiency": PiggyBank,
  growth: TrendingUp,
};

export function BusinessValueTypeButton({
  id,
  label,
  selected,
  onClick,
}: {
  id: BusinessValueType;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  const TypeIcon = BUSINESS_VALUE_ICONS[id];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "flex items-center gap-1.5 border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
        selected
          ? "border-foreground bg-foreground/[0.06] text-foreground"
          : "border-border text-muted hover:border-foreground hover:text-foreground",
      ].join(" ")}
    >
      {selected ? (
        <Check className="animate-check-pop size-3.5 shrink-0" />
      ) : (
        <TypeIcon className="size-3.5 shrink-0" />
      )}
      {label}
    </button>
  );
}

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
