/** Client-safe validation types & helpers (no database imports). */

export type BusinessValueType = "speed" | "cost-efficiency" | "growth";

/** Impact score 1–10 for a selected business value type. */
export type BusinessValueImpact = number;

export type BusinessValueData = {
  types: BusinessValueType[];
  /** Impact scores 1–10. Legacy free-text strings may still exist in stored data. */
  expectations: Partial<Record<BusinessValueType, BusinessValueImpact | string>>;
};

export type ValidationData = {
  /** Structured value types + impact scores; legacy free-text string still supported. */
  businessValue?: BusinessValueData | string;
  solutionDirection?: string;
  tShirtSize?: string;
  priority?: string;
  leadProductionParty?: string;
  dependencies?: string;
  risks?: string;
};

export const BUSINESS_VALUE_TYPES: {
  id: BusinessValueType;
  label: string;
}[] = [
  { id: "speed", label: "Speed" },
  { id: "cost-efficiency", label: "Cost Efficiency" },
  { id: "growth", label: "Growth" },
];

export const IMPACT_MIN = 1;
export const IMPACT_MAX = 10;
export const IMPACT_DEFAULT = 5;

export function isBusinessValueData(
  value: ValidationData["businessValue"],
): value is BusinessValueData {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(value.types) &&
    typeof value.expectations === "object" &&
    value.expectations !== null
  );
}

/** Normalize a stored expectation to a 1–10 score, or null if unset/unparseable. */
export function parseImpactScore(
  value: BusinessValueImpact | string | undefined | null,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.round(value);
    return n >= IMPACT_MIN && n <= IMPACT_MAX ? n : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (Number.isFinite(n)) {
      const rounded = Math.round(n);
      return rounded >= IMPACT_MIN && rounded <= IMPACT_MAX ? rounded : null;
    }
  }
  return null;
}

/** True when at least one type is selected and every selected type has a 1–10 impact. */
export function isBusinessValueComplete(
  value: ValidationData["businessValue"],
): boolean {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (!isBusinessValueData(value) || value.types.length === 0) return false;
  return value.types.every((type) => parseImpactScore(value.expectations[type]) !== null);
}

export function formatBusinessValueSummary(
  value: ValidationData["businessValue"],
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (!isBusinessValueData(value) || value.types.length === 0) return null;

  const parts = value.types.map((type) => {
    const label =
      BUSINESS_VALUE_TYPES.find((t) => t.id === type)?.label ?? type;
    const score = parseImpactScore(value.expectations[type]);
    return score !== null ? `${label}: ${score}/10` : label;
  });
  return parts.join(" · ");
}
