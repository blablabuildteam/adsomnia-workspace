/** Jira Cloud Create project: name is 2–80 characters. */
export const JIRA_PROJECT_NAME_MIN = 2;
export const JIRA_PROJECT_NAME_MAX = 80;

/** Jira Cloud project keys: 2–10 letters/digits, must start with a letter. */
export const JIRA_PROJECT_KEY_MIN = 2;
export const JIRA_PROJECT_KEY_MAX = 10;

/** Jira issue summary (epic title) maximum. */
export const JIRA_ISSUE_SUMMARY_MAX = 255;

export function suggestedJiraName(title: string, ticketId: string): string {
  const trimmedTitle = title.trim();
  const suffix = ticketId.trim() ? ` - ${ticketId.trim()}` : "";
  const combined = `${trimmedTitle}${suffix}`;
  if (combined.length <= JIRA_PROJECT_NAME_MAX) return combined;
  const titleBudget = Math.max(
    JIRA_PROJECT_NAME_MIN,
    JIRA_PROJECT_NAME_MAX - suffix.length,
  );
  return `${trimmedTitle.slice(0, titleBudget).trimEnd()}${suffix}`.slice(
    0,
    JIRA_PROJECT_NAME_MAX,
  );
}

export function clampJiraProjectName(name: string): string {
  return name.trim().slice(0, JIRA_PROJECT_NAME_MAX);
}

export function validateJiraProjectName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < JIRA_PROJECT_NAME_MIN) {
    return `Space title must be at least ${JIRA_PROJECT_NAME_MIN} characters (Jira limit).`;
  }
  if (trimmed.length > JIRA_PROJECT_NAME_MAX) {
    return `Space title must be ${JIRA_PROJECT_NAME_MAX} characters or fewer (Jira limit).`;
  }
  return null;
}

/** Jira project keys: 2–10 letters/digits, must start with a letter. */
export function ticketIdToProjectKeyHint(ticketId: string): string {
  const compact = ticketId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const keyed = compact.replace(/^[^A-Z]+/, "") || "WS";
  return keyed.slice(0, JIRA_PROJECT_KEY_MAX);
}

export const JIRA_EPIC_COLORS = [
  "blue",
  "green",
  "orange",
  "purple",
  "teal",
  "yellow",
  "dark_blue",
  "dark_green",
  "dark_orange",
  "dark_purple",
  "dark_teal",
  "dark_yellow",
  "grey",
] as const;

export type JiraEpicColor = (typeof JIRA_EPIC_COLORS)[number];

export const JIRA_EPIC_COLOR_HEX: Record<JiraEpicColor, string> = {
  blue: "#2684FF",
  green: "#57D9A3",
  orange: "#FF7452",
  purple: "#8777D9",
  teal: "#00C7E6",
  yellow: "#FFC400",
  dark_blue: "#0052CC",
  dark_green: "#00875A",
  dark_orange: "#DE350B",
  dark_purple: "#5243AA",
  dark_teal: "#00A3BF",
  dark_yellow: "#FF991F",
  grey: "#6B778C",
};

const HEX_TO_JIRA_COLOR: Record<string, JiraEpicColor> = {
  "#CEFF00": "yellow",
  "#38BDF8": "blue",
  "#FF3B1F": "dark_orange",
  "#7E90A3": "grey",
  "#22C55E": "green",
  "#EAB308": "yellow",
  "#A78BFA": "purple",
  "#F472B6": "purple",
  "#FB923C": "orange",
  "#2DD4BF": "teal",
};

export function isJiraEpicColor(value: string | undefined): value is JiraEpicColor {
  return Boolean(value && (JIRA_EPIC_COLORS as readonly string[]).includes(value));
}

export function toJiraEpicColor(
  value: string | undefined,
  index: number,
): JiraEpicColor {
  const raw = value?.trim();
  if (raw) {
    const named = raw.toLowerCase().replace(/[\s-]+/g, "_");
    if (isJiraEpicColor(named)) return named;
    const hex = raw.startsWith("#") ? raw.toUpperCase() : `#${raw.toUpperCase()}`;
    const mapped = HEX_TO_JIRA_COLOR[hex];
    if (mapped && isJiraEpicColor(mapped)) return mapped;
  }
  return JIRA_EPIC_COLORS[index % JIRA_EPIC_COLORS.length];
}

export function assignDistinctEpicColors<T extends { color?: string }>(
  seeds: T[],
): (T & { color: JiraEpicColor })[] {
  const used = new Set<string>();
  return seeds.map((seed, index) => {
    let color = toJiraEpicColor(seed.color, index);
    if (used.has(color)) {
      color =
        JIRA_EPIC_COLORS.find((candidate) => !used.has(candidate)) ?? color;
    }
    used.add(color);
    return { ...seed, color };
  });
}

export type JiraEpicSeed = {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  color?: JiraEpicColor;
};

export function toIsoDate(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().slice(0, 10);
}

/** One Jira Epic per unique scoping epic name; dates span all milestone rows. */
export function milestonesToEpicSeeds(
  milestones: {
    epic?: string;
    milestone?: string;
    startDate?: string;
    endDate?: string;
    color?: string;
  }[],
): JiraEpicSeed[] {
  const byName = new Map<
    string,
    JiraEpicSeed & { milestoneNotes: string[]; sourceColor?: string }
  >();

  for (const row of milestones) {
    const name = (
      (row.epic ?? "").trim() || (row.milestone ?? "").trim()
    ).slice(0, JIRA_ISSUE_SUMMARY_MAX);
    if (!name) continue;
    const note = (row.milestone ?? "").trim();
    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, {
        name,
        startDate: toIsoDate(row.startDate),
        endDate: toIsoDate(row.endDate),
        sourceColor: row.color,
        milestoneNotes: note && note !== name ? [note] : [],
      });
      continue;
    }
    const start = toIsoDate(row.startDate);
    const end = toIsoDate(row.endDate);
    if (start && (!existing.startDate || start < existing.startDate)) {
      existing.startDate = start;
    }
    if (end && (!existing.endDate || end > existing.endDate)) {
      existing.endDate = end;
    }
    if (note && note !== name && !existing.milestoneNotes.includes(note)) {
      existing.milestoneNotes.push(note);
    }
  }

  return assignDistinctEpicColors(
    [...byName.values()].map(({ milestoneNotes, sourceColor, ...seed }) => ({
      ...seed,
      color: sourceColor,
      description: milestoneNotes.length ? milestoneNotes.join("\n") : undefined,
    })),
  );
}

export function sanitizeEpicSeeds(raw: unknown): JiraEpicSeed[] {
  if (!Array.isArray(raw)) return [];
  const seeds: JiraEpicSeed[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) continue;
    const description =
      typeof rec.description === "string" ? rec.description.trim() : "";
    seeds.push({
      name: name.slice(0, JIRA_ISSUE_SUMMARY_MAX),
      description: description || undefined,
      startDate: toIsoDate(
        typeof rec.startDate === "string" ? rec.startDate : undefined,
      ),
      endDate: toIsoDate(
        typeof rec.endDate === "string" ? rec.endDate : undefined,
      ),
      color: toJiraEpicColor(
        typeof rec.color === "string" ? rec.color : undefined,
        seeds.length,
      ),
    });
  }
  return assignDistinctEpicColors(seeds);
}
