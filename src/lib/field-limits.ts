/** Client-safe min/max lengths for Initiative and Validation narrative fields. */

import type { ValidationData } from "@/lib/validation-data";

export const IDEA_FIELD_LIMITS = {
  title: { min: 20, max: 160 },
  problemStatement: { min: 40, max: 500 },
  opportunitySolution: { min: 40, max: 500 },
  expectedImpact: { min: 30, max: 500 },
  targetAudience: { min: 8, max: 120 },
} as const;

export type IdeaFieldName = keyof typeof IDEA_FIELD_LIMITS;

export const VALIDATION_FIELD_LIMITS = {
  solutionDirection: { min: 50, max: 500 },
  leadPartyOther: { min: 8, max: 80 },
  dependencies: { min: 20, max: 500 },
  risks: { min: 20, max: 500 },
} as const;

export type FieldLimits = { min: number; max: number };

const KNOWN_LEAD_PARTY_IDS = new Set(["adsomnia", "btr", "hn", "bbb", "as"]);

export function fieldLength(value: string): number {
  return value.trim().length;
}

export function meetsFieldMin(value: string, limits: FieldLimits): boolean {
  const n = fieldLength(value);
  return n >= limits.min && n <= limits.max;
}

/** Empty is allowed; if filled, min and max both apply. */
export function meetsOptionalFieldMin(
  value: string,
  limits: FieldLimits,
): boolean {
  if (fieldLength(value) === 0) return true;
  return meetsFieldMin(value, limits);
}

export function isKnownLeadParty(value: string): boolean {
  return KNOWN_LEAD_PARTY_IDS.has(value.trim());
}

export function readIdeaFields(formData: FormData): Record<IdeaFieldName, string> {
  return {
    title: String(formData.get("title") ?? "").trim(),
    problemStatement: String(formData.get("problemStatement") ?? "").trim(),
    opportunitySolution: String(formData.get("opportunitySolution") ?? "").trim(),
    expectedImpact: String(formData.get("expectedImpact") ?? "").trim(),
    targetAudience: String(formData.get("targetAudience") ?? "").trim(),
  };
}

export function fieldLimitError(
  label: string,
  value: string,
  limits: FieldLimits,
  opts?: { required?: boolean; enforceMin?: boolean },
): string | null {
  const required = opts?.required ?? true;
  const enforceMin = opts?.enforceMin ?? true;
  const n = fieldLength(value);

  if (n === 0) {
    return required ? `${label} is required.` : null;
  }
  if (enforceMin && n < limits.min) {
    return `${label} needs at least ${limits.min} characters (currently ${n}).`;
  }
  if (n > limits.max) {
    return `${label} must be ${limits.max} characters or fewer.`;
  }
  return null;
}

export function validateIdeaFields(
  fields: Record<IdeaFieldName, string>,
  opts?: { targetAudienceRequired?: boolean },
): string | null {
  const audienceRequired = opts?.targetAudienceRequired ?? true;
  const checks: [string, IdeaFieldName, { required: boolean }][] = [
    ["Title", "title", { required: true }],
    ["Problem statement", "problemStatement", { required: true }],
    ["Opportunity / solution", "opportunitySolution", { required: true }],
    ["Expected impact", "expectedImpact", { required: true }],
    ["Target audience", "targetAudience", { required: audienceRequired }],
  ];

  for (const [label, name, options] of checks) {
    const error = fieldLimitError(
      label,
      fields[name],
      IDEA_FIELD_LIMITS[name],
      options,
    );
    if (error) return error;
  }
  return null;
}

export function validateValidationNarratives(
  data: Pick<
    ValidationData,
    "solutionDirection" | "leadProductionParty" | "dependencies" | "risks"
  >,
  mode: "save" | "submit",
): string | null {
  const enforceMin = mode === "submit";
  const required = mode === "submit";

  const solutionError = fieldLimitError(
    "High-level approach",
    data.solutionDirection ?? "",
    VALIDATION_FIELD_LIMITS.solutionDirection,
    { required, enforceMin },
  );
  if (solutionError) return solutionError;

  const lead = data.leadProductionParty?.trim() ?? "";
  if (lead && !isKnownLeadParty(lead)) {
    const leadError = fieldLimitError(
      "Lead production party",
      lead,
      VALIDATION_FIELD_LIMITS.leadPartyOther,
      { required, enforceMin },
    );
    if (leadError) return leadError;
  }

  const optionalChecks: [string, string, FieldLimits][] = [
    [
      "Risks, dependencies & blockers",
      data.dependencies ?? "",
      VALIDATION_FIELD_LIMITS.dependencies,
    ],
    ["Other notes", data.risks ?? "", VALIDATION_FIELD_LIMITS.risks],
  ];

  for (const [label, value, limits] of optionalChecks) {
    const error = fieldLimitError(label, value, limits, {
      required: false,
      enforceMin,
    });
    if (error) return error;
  }

  return null;
}
