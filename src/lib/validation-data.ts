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
  /** Optional Other Notes. Key kept as `risks` so existing drafts still load. */
  risks?: string;
  attachments?: Attachment[];
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

export const EMPTY_IMPACTS: Record<BusinessValueType, number | null> = {
  speed: null,
  "cost-efficiency": null,
  growth: null,
};

export function impactScoreLabel(score: number): string {
  if (score <= 2) return "Minimal";
  if (score <= 4) return "Low";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "High";
  return "Critical";
}

export function resolveBusinessValueState(
  stored: ValidationData["businessValue"],
): {
  types: BusinessValueType[];
  impacts: Record<BusinessValueType, number | null>;
} {
  if (!stored || typeof stored === "string" || !isBusinessValueData(stored)) {
    return { types: [], impacts: { ...EMPTY_IMPACTS } };
  }
  const impacts = { ...EMPTY_IMPACTS };
  for (const type of stored.types) {
    impacts[type] =
      parseImpactScore(stored.expectations[type]) ?? IMPACT_DEFAULT;
  }
  return { types: stored.types, impacts };
}

export function buildBusinessValueData(
  types: BusinessValueType[],
  impacts: Record<BusinessValueType, number | null>,
): BusinessValueData {
  const expectations: BusinessValueData["expectations"] = {};
  for (const type of types) {
    const score = impacts[type];
    if (score !== null) expectations[type] = score;
  }
  return { types, expectations };
}

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

/* ─── Attachments (shared by Validation & Scoping) ──────── */

export type AttachmentKind =
  | "google-doc"
  | "google-sheet"
  | "google-slides"
  | "google-form"
  | "google-drive"
  | "link"
  | "file";

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  title: string;
  url?: string;
  /** Fetched HTML <title> / og:title, shown under the chip for links. */
  pageTitle?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

const GOOGLE_URL_PATTERNS: { pattern: RegExp; kind: AttachmentKind }[] = [
  { pattern: /docs\.google\.com\/document/, kind: "google-doc" },
  { pattern: /docs\.google\.com\/spreadsheets/, kind: "google-sheet" },
  { pattern: /docs\.google\.com\/presentation/, kind: "google-slides" },
  { pattern: /docs\.google\.com\/forms/, kind: "google-form" },
  { pattern: /drive\.google\.com/, kind: "google-drive" },
];

export function detectAttachmentKind(url: string): AttachmentKind {
  for (const { pattern, kind } of GOOGLE_URL_PATTERNS) {
    if (pattern.test(url)) return kind;
  }
  return "link";
}

export function attachmentKindLabel(kind: AttachmentKind): string {
  switch (kind) {
    case "google-doc": return "Google Doc";
    case "google-sheet": return "Google Sheet";
    case "google-slides": return "Google Slides";
    case "google-form": return "Google Form";
    case "google-drive": return "Google Drive";
    case "link": return "Link";
    case "file": return "File";
  }
}

/**
 * Accepts bare domains (`google.nl`), `www.` hosts, or full URLs.
 * Returns a normalized `https://…` href, or null if it is not a usable link.
 */
export function normalizeUrl(raw: string): string | null {
  const input = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!input) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Hostname used as the chip title for generic links (`google.nl`). */
export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 60);
  }
}

/**
 * Extract a human-readable title from a Google URL.
 * Falls back to the domain + path tail.
 */
export function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("google.com") && segments.length >= 3) {
      const last = segments[segments.length - 1];
      if (last === "edit" || last === "view" || last === "preview") {
        return decodeURIComponent(segments[segments.length - 2]).replace(/[-_]/g, " ");
      }
      return decodeURIComponent(last).replace(/[-_]/g, " ");
    }
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.hostname.replace(/^www\./, "")}${path}`.slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
}

/* ─── Scoping Data ──────────────────────────────────────── */

export type ScopingMilestone = {
  id: string;
  epic: string;
  milestone: string;
  startDate?: string;
  endDate?: string;
  color?: string;
};

export type ScopingTeamMember = {
  id: string;
  role: string;
  name: string;
  totalHours: number;
  hoursPerDay: number;
  startDate?: string;
  endDate?: string;
  party?: string;
};

export type ScopingScopeItem = {
  id: string;
  label: string;
  inScope: boolean;
};

export type ScopingValueMetric = {
  type: BusinessValueType;
  metric: string;
  target: number | null;
  unit: string;
};

export type ScopingData = {
  milestones?: ScopingMilestone[];
  team?: ScopingTeamMember[];
  /** Refined Impact carried forward from Validation. */
  impact?: BusinessValueData;
  /** @deprecated Replaced by `impact`. Kept so existing drafts still parse. */
  valueMetrics?: ScopingValueMetric[];
  scopeItems?: ScopingScopeItem[];
  dependencies?: string;
  attachments?: Attachment[];
};

export function isScopingComplete(data: ScopingData | null | undefined): boolean {
  if (!data) return false;
  const hasMilestones = (data.milestones?.length ?? 0) > 0 &&
    data.milestones!.every((m) => m.epic.trim() && m.milestone.trim());
  const hasTeam = (data.team?.length ?? 0) > 0 &&
    data.team!.every((t) => t.role.trim() && t.name.trim() && t.totalHours > 0);
  const hasImpact = isBusinessValueComplete(data.impact);
  const hasScope = (data.scopeItems?.length ?? 0) > 0;
  return hasMilestones && hasTeam && hasImpact && hasScope;
}

/* ─── Business Value helpers ────────────────────────────── */

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
