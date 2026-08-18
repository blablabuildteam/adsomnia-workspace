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
 * blablabuild Hybrid @ €175 is the only confirmed rate; the rest are assumed
 * NL agency / delivery rates until official lists arrive.
 */
export const ROLE_CATALOG: PartyRole[] = [
  ...catalog("adsomnia", true, [
    ["account-executive", "Account Executive", 95],
    ["account-manager", "Account Manager", 125],
    ["senior-account-manager", "Senior Account Manager", 145],
    ["account-director", "Account Director", 175],
    ["campaign-manager", "Campaign Manager", 130],
    ["media-planner", "Media Planner", 125],
    ["media-buyer", "Media Buyer", 120],
    ["performance-marketer", "Performance Marketer", 140],
    ["social-media-manager", "Social Media Manager", 115],
    ["brand-strategist", "Brand Strategist", 155],
    ["creative-strategist", "Creative Strategist", 150],
    ["copywriter", "Copywriter", 130],
    ["art-director", "Art Director", 150],
    ["creative-director", "Creative Director", 190],
    ["project-manager", "Project Manager", 135],
    ["head-of-production", "Head of Production", 185],
    ["traffic-manager", "Traffic Manager", 110],
    ["data-analyst", "Data Analyst", 140],
    ["insights-manager", "Insights Manager", 155],
    ["leadership", "Leadership / Sponsor", 220],
  ]),
  ...catalog("btr", true, [
    ["junior-designer", "Junior Designer", 95],
    ["designer", "Designer", 125],
    ["senior-designer", "Senior Designer", 150],
    ["art-director", "Art Director", 160],
    ["motion-designer", "Motion Designer", 145],
    ["senior-motion-designer", "Senior Motion Designer", 165],
    ["animator", "Animator", 140],
    ["video-editor", "Video Editor", 130],
    ["senior-video-editor", "Senior Video Editor", 155],
    ["producer", "Producer", 140],
    ["senior-producer", "Senior Producer", 165],
    ["creative-producer", "Creative Producer", 155],
    ["production-manager", "Production Manager", 150],
    ["project-manager", "Project Manager", 145],
    ["copywriter", "Copywriter", 130],
    ["director", "Director", 180],
    ["post-production-lead", "Post-Production Lead", 170],
    ["sound-designer", "Sound Designer", 140],
    ["studio-lead", "Studio Lead", 185],
    ["creative-director", "Creative Director", 195],
  ]),
  ...catalog("hn", true, [
    ["junior-developer", "Junior Developer", 105],
    ["frontend-engineer", "Frontend Engineer", 140],
    ["backend-engineer", "Backend Engineer", 145],
    ["full-stack-engineer", "Full-Stack Engineer", 150],
    ["senior-frontend-engineer", "Senior Frontend Engineer", 165],
    ["senior-backend-engineer", "Senior Backend Engineer", 170],
    ["tech-lead", "Tech Lead", 185],
    ["solution-architect", "Solution Architect", 195],
    ["product-owner", "Product Owner", 155],
    ["product-manager", "Product Manager", 165],
    ["scrum-master", "Scrum Master", 140],
    ["ux-designer", "UX Designer", 145],
    ["ui-designer", "UI Designer", 135],
    ["data-engineer", "Data Engineer", 160],
    ["data-analyst", "Data Analyst", 140],
    ["data-scientist", "Data Scientist", 170],
    ["pricing-analyst", "Pricing Analyst", 150],
    ["qa-engineer", "QA Engineer", 125],
    ["devops-engineer", "DevOps / Platform Engineer", 165],
    ["engineering-manager", "Engineering Manager", 195],
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
    if (!member.role.trim() || member.totalHours <= 0) continue;
    const cost = estimateMemberCost(member);
    if (cost == null) {
      unpricedCount += 1;
      continue;
    }
    pricedCount += 1;
    total += cost;
    const role = getRoleById(member.roleId);
    if (role?.assumed || member.hourlyRate !== role?.hourlyRate) {
      usesAssumedRates = usesAssumedRates || (role?.assumed ?? true);
    } else if (role && !role.assumed) {
      // confirmed catalog rate
    } else {
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
