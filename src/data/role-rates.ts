type RateMember = {
  role?: string;
  roleId?: string;
  hourlyRate?: number;
  totalHours?: number;
};

/** Parties that can be assigned a production role (excludes legacy `as`). */
export type RatePartyId = "adsomnia" | "btr" | "hn" | "bbb";

export type PartyRole = {
  id: string;
  party: RatePartyId;
  name: string;
  hourlyRate: number;
  /**
   * Official rates are still incoming. Assumed rows can be swapped later
   * without changing scoped hours.
   */
  assumed: boolean;
};

export const RATE_PARTY_IDS: RatePartyId[] = ["adsomnia", "btr", "hn", "bbb"];

export const RATE_PARTY_LABELS: Record<RatePartyId, string> = {
  adsomnia: "Adsomnia",
  btr: "Bending The Rules",
  hn: "Harlem Next",
  bbb: "blablabuild",
};

export const RATE_PARTY_SHORT: Record<RatePartyId, string> = {
  adsomnia: "AS",
  btr: "BTR",
  hn: "HN",
  bbb: "BBB",
};

function catalog(
  party: RatePartyId,
  assumed: boolean,
  rows: Array<[slug: string, name: string, hourlyRate: number]>,
): PartyRole[] {
  return rows.map(([slug, name, hourlyRate]) => ({
    id: `${party}-${slug}`,
    party,
    name,
    hourlyRate,
    assumed,
  }));
}

/**
 * Placeholder role catalog for scoping cost estimates.
 * Adsomnia / BTR / HN use a flat €100/h stand-in until official lists arrive.
 * blablabuild Hybrid @ €175 is the only confirmed rate.
 */
export const ROLE_CATALOG: PartyRole[] = [
  ...catalog("adsomnia", true, [
    ["account-executive", "Account Executive", 100],
    ["account-manager", "Account Manager", 100],
    ["senior-account-manager", "Senior Account Manager", 100],
    ["account-director", "Account Director", 100],
    ["campaign-manager", "Campaign Manager", 100],
    ["media-planner", "Media Planner", 100],
    ["media-buyer", "Media Buyer", 100],
    ["performance-marketer", "Performance Marketer", 100],
    ["social-media-manager", "Social Media Manager", 100],
    ["brand-strategist", "Brand Strategist", 100],
    ["creative-strategist", "Creative Strategist", 100],
    ["copywriter", "Copywriter", 100],
    ["art-director", "Art Director", 100],
    ["creative-director", "Creative Director", 100],
    ["project-manager", "Project Manager", 100],
    ["head-of-production", "Head of Production", 100],
    ["traffic-manager", "Traffic Manager", 100],
    ["data-analyst", "Data Analyst", 100],
    ["insights-manager", "Insights Manager", 100],
    ["leadership", "Leadership / Sponsor", 100],
  ]),
  ...catalog("btr", true, [
    ["junior-designer", "Junior Designer", 100],
    ["designer", "Designer", 100],
    ["senior-designer", "Senior Designer", 100],
    ["art-director", "Art Director", 100],
    ["motion-designer", "Motion Designer", 100],
    ["senior-motion-designer", "Senior Motion Designer", 100],
    ["animator", "Animator", 100],
    ["video-editor", "Video Editor", 100],
    ["senior-video-editor", "Senior Video Editor", 100],
    ["producer", "Producer", 100],
    ["senior-producer", "Senior Producer", 100],
    ["creative-producer", "Creative Producer", 100],
    ["production-manager", "Production Manager", 100],
    ["project-manager", "Project Manager", 100],
    ["copywriter", "Copywriter", 100],
    ["director", "Director", 100],
    ["post-production-lead", "Post-Production Lead", 100],
    ["sound-designer", "Sound Designer", 100],
    ["studio-lead", "Studio Lead", 100],
    ["creative-director", "Creative Director", 100],
  ]),
  ...catalog("hn", true, [
    ["junior-developer", "Junior Developer", 100],
    ["frontend-engineer", "Frontend Engineer", 100],
    ["backend-engineer", "Backend Engineer", 100],
    ["full-stack-engineer", "Full-Stack Engineer", 100],
    ["senior-frontend-engineer", "Senior Frontend Engineer", 100],
    ["senior-backend-engineer", "Senior Backend Engineer", 100],
    ["tech-lead", "Tech Lead", 100],
    ["solution-architect", "Solution Architect", 100],
    ["product-owner", "Product Owner", 100],
    ["product-manager", "Product Manager", 100],
    ["scrum-master", "Scrum Master", 100],
    ["ux-designer", "UX Designer", 100],
    ["ui-designer", "UI Designer", 100],
    ["data-engineer", "Data Engineer", 100],
    ["data-analyst", "Data Analyst", 100],
    ["data-scientist", "Data Scientist", 100],
    ["pricing-analyst", "Pricing Analyst", 100],
    ["qa-engineer", "QA Engineer", 100],
    ["devops-engineer", "DevOps / Platform Engineer", 100],
    ["engineering-manager", "Engineering Manager", 100],
  ]),
  ...catalog("bbb", false, [["hybrid", "Hybrid", 175]]),
];

const ROLE_BY_ID = new Map(ROLE_CATALOG.map((role) => [role.id, role]));

export function getRoleById(id: string | undefined): PartyRole | undefined {
  if (!id) return undefined;
  return ROLE_BY_ID.get(id);
}

export function isRatePartyId(value: string | undefined): value is RatePartyId {
  return (
    value === "adsomnia" || value === "btr" || value === "hn" || value === "bbb"
  );
}

export function rolesForParty(party?: string | null): PartyRole[] {
  if (!party || !isRatePartyId(party)) return ROLE_CATALOG;
  return ROLE_CATALOG.filter((role) => role.party === party);
}

export function searchRoles(query: string, party?: string | null): PartyRole[] {
  const pool = rolesForParty(party);
  const needle = query.trim().toLowerCase();
  if (!needle) return pool;
  return pool.filter((role) => {
    const partyLabel = RATE_PARTY_LABELS[role.party].toLowerCase();
    const partyShort = RATE_PARTY_SHORT[role.party].toLowerCase();
    return (
      role.name.toLowerCase().includes(needle) ||
      partyLabel.includes(needle) ||
      partyShort.includes(needle) ||
      String(role.hourlyRate).includes(needle)
    );
  });
}

export function resolveHourlyRate(
  member: Pick<RateMember, "roleId" | "hourlyRate">,
): number | null {
  if (typeof member.hourlyRate === "number" && member.hourlyRate > 0) {
    return member.hourlyRate;
  }
  const fromCatalog = getRoleById(member.roleId)?.hourlyRate;
  return fromCatalog && fromCatalog > 0 ? fromCatalog : null;
}

export function estimateMemberCost(
  member: Pick<RateMember, "roleId" | "hourlyRate" | "totalHours">,
): number | null {
  const rate = resolveHourlyRate(member);
  if (rate == null || !member.totalHours) return null;
  return rate * member.totalHours;
}

export type TeamCostSummary = {
  total: number | null;
  pricedCount: number;
  unpricedCount: number;
  usesAssumedRates: boolean;
};

export function summarizeTeamCost(
  team: Array<Pick<RateMember, "roleId" | "hourlyRate" | "totalHours" | "role">>,
): TeamCostSummary {
  let total = 0;
  let pricedCount = 0;
  let unpricedCount = 0;
  let usesAssumedRates = false;

  for (const member of team) {
    if (!(member.role ?? "").trim() || !member.totalHours || member.totalHours <= 0) {
      continue;
    }
    const cost = estimateMemberCost(member);
    if (cost == null) {
      unpricedCount += 1;
      continue;
    }
    pricedCount += 1;
    total += cost;
    const role = getRoleById(member.roleId);
    if (role ? role.assumed : true) {
      usesAssumedRates = true;
    }
  }

  return {
    total: pricedCount > 0 ? total : null,
    pricedCount,
    unpricedCount,
    usesAssumedRates,
  };
}

const euroFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatEuro(amount: number): string {
  return euroFormatter.format(amount);
}
