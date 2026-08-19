"use client";

import {
  Calendar,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
import { PARTIES, getStageColor } from "@/data/workflow";
import { formatEuro, summarizeTeamCost } from "@/data/role-rates";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  BUSINESS_VALUE_TYPES,
  IMPACT_MAX,
  IMPACT_MIN,
  formatBusinessValueSummary,
  impactScoreLabel,
  isBusinessValueData,
  parseImpactScore,
  type BusinessValueType,
  type SetupData,
  type ValidationData,
} from "@/lib/validation-data";

const VALUE_COLORS: Record<BusinessValueType, string> = {
  speed: "#38BDF8",
  "cost-efficiency": "#CEFF00",
  growth: "#22C55E",
};

const PRIORITY_META: Record<string, { color: string; hint: string }> = {
  Now: { color: "#FF3B1F", hint: "Urgent / blocking" },
  Near: { color: "#EAB308", hint: "Next up" },
  Later: { color: "#7E90A3", hint: "Lower priority" },
  Backlog: { color: "#FFFFFF80", hint: "On the radar" },
};

const STAGE_NUM: Record<string, number> = {
  idea: 1,
  validation: 2,
  scoping: 3,
  "go-nogo": 4,
  setup: 5,
  onboarding: 6,
  production: 7,
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** Hero stat — big display number with a small label above it. */
function Hero({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 px-5 py-4">
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/30">
        {label}
      </span>
      <div>
        <div
          className="font-display text-xl font-extrabold uppercase leading-none tracking-tight sm:text-2xl"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </div>
        {sub && (
          <div className="mt-1.5 text-[10px] text-muted">{sub}</div>
        )}
      </div>
    </div>
  );
}

/** Narrative column — label + up to 3 lines of text. */
function Narrative({
  label,
  text,
}: {
  label: string;
  text?: string | null;
}) {
  if (!text) return null;
  return (
    <div className="min-w-0 px-5 py-4">
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/30">
        {label}
      </span>
      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-foreground/80">
        {text}
      </p>
    </div>
  );
}

/** Score bars for Speed / Cost / Growth. Falls back to text for legacy notes. */
function BusinessValueVisual({
  value,
}: {
  value: ValidationData["businessValue"];
}) {
  if (!value) return null;
  if (typeof value === "string") {
    return <Narrative label="Business Value" text={value} />;
  }
  if (!isBusinessValueData(value) || value.types.length === 0) return null;

  return (
    <div className="min-w-0 px-5 py-4">
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/30">
        Business Value
      </span>
      <div className="mt-2.5 space-y-2.5">
        {value.types.map((type) => {
          const meta = BUSINESS_VALUE_TYPES.find((t) => t.id === type);
          const score = parseImpactScore(value.expectations[type]);
          const color = VALUE_COLORS[type];
          const pct =
            score !== null
              ? ((score - IMPACT_MIN) / (IMPACT_MAX - IMPACT_MIN)) * 100
              : 0;
          return (
            <div key={type}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="font-display text-[10px] font-bold uppercase tracking-wide text-foreground/70">
                  {meta?.label ?? type}
                </span>
                <span className="flex items-baseline gap-1.5">
                  {score !== null ? (
                    <>
                      <span
                        className="font-display text-sm font-extrabold tabular-nums leading-none"
                        style={{ color }}
                      >
                        {score}
                      </span>
                      <span className="text-[9px] text-muted">/10</span>
                      <span className="hidden font-display text-[9px] font-bold uppercase tracking-wide text-muted sm:inline">
                        {impactScoreLabel(score)}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted">—</span>
                  )}
                </span>
              </div>
              <div className="flex gap-px">
                {Array.from({ length: IMPACT_MAX }, (_, i) => {
                  const filled = score !== null && i < score;
                  return (
                    <span
                      key={i}
                      className="h-1.5 flex-1"
                      style={{
                        backgroundColor: filled ? color : "rgb(255 255 255 / 0.08)",
                        opacity: filled ? 0.35 + (i / IMPACT_MAX) * 0.65 : 1,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tool chip — logo + name, links out when a URL exists. */
function ToolChip({
  logo,
  name,
  href,
}: {
  logo: string;
  name: string;
  href?: string;
}) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" className="size-3.5 shrink-0 object-contain" />
      <span className="max-w-[220px] truncate">{name}</span>
      {href && (
        <ExternalLink className="size-3 shrink-0 text-muted/50 transition-colors group-hover/chip:text-foreground" />
      )}
    </>
  );
  const cls =
    "group/chip inline-flex items-center gap-2 border border-foreground/10 bg-foreground/[0.03] px-3 py-1.5 text-xs text-foreground/80";
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cls} transition-colors hover:border-foreground/30 hover:bg-foreground/[0.06] hover:text-foreground`}
      >
        {inner}
      </a>
    );
  }
  return <span className={cls}>{inner}</span>;
}

type Props = {
  initiative: InitiativeWithUsers;
  stageName: string;
  goDate?: Date | null;
  goApprover?: string | null;
};

export function DetailsQuickView({
  initiative,
  stageName,
  goDate,
  goApprover,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const currentNum = STAGE_NUM[initiative.currentStage] ?? 1;
  const stageColor = getStageColor(initiative.currentStage);

  const vd = initiative.validationData;
  const sd = initiative.scopingData;
  const setup = initiative.setupData as SetupData | null;

  const leadParty = PARTIES.find((p) => p.id === vd?.leadProductionParty);
  const tShirtSize = vd?.tShirtSize;
  const priority = vd?.priority;

  const teamCount = sd?.team?.length ?? 0;
  const totalHours =
    sd?.team?.reduce((s, t) => s + (t.totalHours || 0), 0) ?? 0;
  const teamCost = sd?.team?.length ? summarizeTeamCost(sd.team) : null;

  const milestones = sd?.milestones ?? [];
  const dates = milestones
    .flatMap((m) => [m.startDate, m.endDate])
    .filter(Boolean) as string[];
  const sortedDates = dates.sort();
  const dateRange =
    sortedDates.length >= 2
      ? `${fmtDate(sortedDates[0])} – ${fmtDate(sortedDates[sortedDates.length - 1])}`
      : null;

  const businessValueSummary = formatBusinessValueSummary(vd?.businessValue);

  const hasScoping = currentNum >= 3;
  const pastScoping = currentNum > 3;
  const priorityMeta = priority ? PRIORITY_META[priority] : undefined;

  const slackName = setup?.slack.channelName;
  const jiraName = setup?.jira.projectName;
  const jiraUrl = setup?.jira.boardUrl || setup?.jira.projectUrl;
  const driveName = setup?.drive.driveName;
  const driveUrl = setup?.drive.driveUrl;
  const hasTools = !!(slackName || jiraUrl || driveUrl);

  const hasExpandableContent = !!(
    (vd?.businessValue &&
      isBusinessValueData(vd.businessValue) &&
      vd.businessValue.types.length > 0) ||
    (sd?.scopeItems && sd.scopeItems.length > 0) ||
    sd?.dependencies ||
    vd?.dependencies
  );

  return (
    <div className="mb-8 bg-[#0D0D0D]">
      {/* Stage accent */}
      <div className="h-[2px]" style={{ backgroundColor: stageColor }} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/50">
            Current Phase:
          </h3>
          <span
            className="font-display text-[10px] font-bold uppercase tracking-wide"
            style={{ color: stageColor }}
          >
            {stageName}
          </span>
        </div>
        {goDate && (
          <span className="inline-flex items-center gap-1.5 text-[10px] text-muted/50">
            <Calendar className="size-3" />
            GO {goDate.toLocaleDateString("en-US", { dateStyle: "medium" })}
            {goApprover && ` · ${goApprover}`}
          </span>
        )}
      </div>

      {/* Hero stats — from Scoping onward. Priority leads; t-shirt sizing drops out. */}
      {hasScoping && (
        <div className="grid divide-y divide-foreground/[0.06] border-t border-foreground/[0.06] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
          <Hero
            label="Priority"
            value={priority ?? "TBD"}
            accent={priorityMeta?.color}
            sub={priorityMeta?.hint}
          />
          <Hero
            label="Timeline"
            value={dateRange ?? "TBD"}
            sub={
              milestones.length > 0
                ? `${milestones.length} epic${milestones.length !== 1 ? "s" : ""}`
                : undefined
            }
          />
          <Hero
            label="Team"
            value={teamCount > 0 ? teamCount : "TBD"}
            sub={teamCount > 0 ? `members · ${totalHours}h booked` : undefined}
          />
          <Hero
            label="Budget"
            value={
              teamCost?.total != null ? formatEuro(teamCost.total) : "TBD"
            }
            sub={
              teamCost?.usesAssumedRates ? "assumed rates" : undefined
            }
          />
        </div>
      )}

      {/* Narrative — problem, solution, value */}
      {(initiative.problemStatement ||
        vd?.solutionDirection ||
        businessValueSummary) && (
        <div className="grid divide-y divide-foreground/[0.06] border-t border-foreground/[0.06] md:grid-cols-3 md:divide-y-0 md:divide-x">
          <Narrative label="Problem" text={initiative.problemStatement} />
          <Narrative label="Solution" text={vd?.solutionDirection} />
          {vd?.businessValue ? (
            <BusinessValueVisual value={vd.businessValue} />
          ) : businessValueSummary ? (
            <Narrative label="Business Value" text={businessValueSummary} />
          ) : null}
        </div>
      )}

      {/* Tools — from Setup onward */}
      {hasTools && (
        <div className="flex flex-wrap items-center gap-2 border-t border-foreground/[0.06] px-5 py-3">
          <span className="mr-1 font-display text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/30">
            Workspace
          </span>
          {slackName && (
            <ToolChip logo="/logos/slack.png" name={`#${slackName}`} />
          )}
          {jiraUrl && (
            <ToolChip
              logo="/logos/jira.png"
              name={jiraName || "Jira board"}
              href={jiraUrl}
            />
          )}
          {driveUrl && (
            <ToolChip
              logo="/logos/google-drive.png"
              name={driveName || "Google Drive"}
              href={driveUrl}
            />
          )}
        </div>
      )}

      {/* Footer meta — one slim line */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-foreground/[0.06] px-5 py-2.5 text-[10px] text-muted/60">
        <span>
          <span className="text-foreground/30">Submitter</span>{" "}
          <span className="text-foreground/70">{initiative.submitter.name}</span>
        </span>
        <span>
          <span className="text-foreground/30">Sponsor</span>{" "}
          <span className="text-foreground/70">{initiative.sponsor.name}</span>
        </span>
        {leadParty && (
          <span>
            <span className="text-foreground/30">Production</span>{" "}
            <span
              className="font-display text-[10px] font-bold uppercase tracking-wide"
              style={{ color: leadParty.color }}
            >
              {leadParty.label}
            </span>
          </span>
        )}
        {!pastScoping && tShirtSize && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/30">Sizing</span>
            <span className="border border-foreground/15 px-1 font-display text-[9px] font-bold text-foreground/70">
              {tShirtSize}
            </span>
          </span>
        )}
        {!hasScoping && priority && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/30">Priority</span>
            <span
              className="font-display text-[9px] font-bold uppercase"
              style={{ color: priorityMeta?.color }}
            >
              {priority}
            </span>
          </span>
        )}
        <span className="ml-auto">
          Updated{" "}
          {initiative.updatedAt.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>

      {/* Expandable deep dive */}
      {hasExpandableContent && (
        <>
          <div
            className={[
              "grid transition-[grid-template-rows] duration-300 ease-out",
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            ].join(" ")}
          >
            <div className="overflow-hidden">
              <div
                className={[
                  "space-y-4 border-t border-foreground/[0.06] px-5 py-4 transition-opacity duration-300 ease-out",
                  expanded ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                {vd?.businessValue &&
                  isBusinessValueData(vd.businessValue) &&
                  vd.businessValue.types.length > 0 && (
                    <div>
                      <h4 className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/30">
                        Impact Breakdown
                      </h4>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {vd.businessValue.types.map((type) => {
                          const label =
                            BUSINESS_VALUE_TYPES.find((t) => t.id === type)
                              ?.label ?? type;
                          const score = parseImpactScore(
                            vd.businessValue &&
                              isBusinessValueData(vd.businessValue)
                              ? vd.businessValue.expectations[type]
                              : undefined,
                          );
                          return (
                            <div
                              key={type}
                              className="border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-2"
                            >
                              <span className="text-xs font-medium">
                                {label}
                              </span>
                              {score != null && (
                                <span className="ml-2 font-display text-sm font-bold tabular-nums text-foreground">
                                  {score}/10
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {sd?.scopeItems && sd.scopeItems.length > 0 && (
                  <div>
                    <h4 className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/30">
                      Scope Boundaries
                    </h4>
                    <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                      {sd.scopeItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-1.5 text-xs"
                        >
                          <span
                            className={
                              item.inScope
                                ? "text-success"
                                : "text-muted/50 line-through"
                            }
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(sd?.dependencies || vd?.dependencies) && (
                  <div>
                    <h4 className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-foreground/30">
                      Dependencies & Risks
                    </h4>
                    <p className="mt-1 text-xs text-muted">
                      {sd?.dependencies || vd?.dependencies}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="group/expand flex w-full items-center justify-center gap-1.5 border-t border-foreground/[0.06] py-2 text-[10px] font-bold uppercase tracking-wide text-foreground/25 transition-colors hover:bg-foreground/[0.03] hover:text-foreground/50"
          >
            {expanded ? "Less" : "More"}
            <span
              className={
                expanded
                  ? "inline-flex group-hover/expand:animate-[chevron-hint-up_480ms_ease-in-out]"
                  : "inline-flex group-hover/expand:animate-[chevron-hint-down_480ms_ease-in-out]"
              }
            >
              <ChevronDown
                className={`size-3 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
              />
            </span>
          </button>
        </>
      )}
    </div>
  );
}
