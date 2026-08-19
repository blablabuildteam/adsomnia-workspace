"use client";

import {
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useState, type CSSProperties } from "react";
import { PARTIES } from "@/data/workflow";
import { MilestoneGantt } from "./MilestoneGantt";
import { formatEuro, summarizeTeamCost } from "@/data/role-rates";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  BUSINESS_VALUE_TYPES,
  IMPACT_MAX,
  formatBusinessValueSummary,
  impactScoreLabel,
  isBusinessValueData,
  parseImpactScore,
  type SetupData,
  type ValidationData,
} from "@/lib/validation-data";

/** Gray → white. Higher scores read brighter. */
function scoreTone(score: number, max = IMPACT_MAX): string {
  const t = Math.min(1, Math.max(0, score / max));
  const v = Math.round(90 + t * 165);
  return `rgb(${v} ${v} ${v})`;
}

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

function parseDay(iso: string) {
  const date = new Date(iso.includes("T") ? iso : `${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fmtDate(iso: string) {
  const date = parseDay(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/** Inclusive calendar span, rounded up to whole weeks. */
function weeksInPeriod(startIso: string, endIso: string): number | null {
  const start = parseDay(startIso);
  const end = parseDay(endIso);
  if (!start || !end || end < start) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.ceil(days / 7));
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
    <div className="flex flex-col justify-between gap-2 py-4 first:pl-0 last:pr-0 sm:px-5">
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
    <div className="min-w-0 py-4 first:pl-0 last:pr-0 sm:px-5">
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
    <div className="min-w-0 py-4 first:pl-0 last:pr-0 sm:px-5">
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/30">
        Business Value
      </span>
      <div className="mt-2.5 space-y-2.5">
        {value.types.map((type) => {
          const meta = BUSINESS_VALUE_TYPES.find((t) => t.id === type);
          const score = parseImpactScore(value.expectations[type]);
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
                        style={{ color: scoreTone(score) }}
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
                        backgroundColor: filled
                          ? scoreTone(i + 1)
                          : "rgb(255 255 255 / 0.08)",
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
      <span>{name}</span>
      {href && (
        <ExternalLink className="size-3 shrink-0 text-muted/50 transition-colors group-hover/chip:text-foreground" />
      )}
    </>
  );
  const cls =
    "group/chip inline-flex items-center gap-2 text-xs text-foreground/80";
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${cls} transition-colors hover:text-foreground`}
      >
        {inner}
      </a>
    );
  }
  return <span className={cls}>{inner}</span>;
}

type Props = {
  initiative: InitiativeWithUsers;
  goDate?: Date | null;
  goApprover?: string | null;
  className?: string;
  style?: CSSProperties;
};

export function DetailsQuickView({
  initiative,
  goDate,
  goApprover,
  className,
  style,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const currentNum = STAGE_NUM[initiative.currentStage] ?? 1;

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
  const weekCount =
    sortedDates.length >= 2
      ? weeksInPeriod(sortedDates[0], sortedDates[sortedDates.length - 1])
      : null;
  const weekLabel =
    weekCount != null
      ? `${weekCount} week${weekCount !== 1 ? "s" : ""}`
      : null;

  const businessValueSummary = formatBusinessValueSummary(vd?.businessValue);

  // Progressive visibility gates
  const hasValidation = currentNum >= 2;
  const hasScoping = currentNum >= 3;
  const pastScoping = currentNum > 3;
  const hasGoNoGo = currentNum >= 4;
  const hasSetup = currentNum >= 5 && !!setup;
  const priorityMeta = priority ? PRIORITY_META[priority] : undefined;

  const slackName = setup?.slack.channelName;
  const jiraName = setup?.jira.projectName;
  const jiraUrl = setup?.jira.boardUrl || setup?.jira.projectUrl;
  const driveName = setup?.drive.driveName;
  const driveUrl = setup?.drive.driveUrl;
  const hasTools = hasSetup && !!(slackName || jiraUrl || driveUrl);

  const hasTimeline =
    hasScoping &&
    (milestones.some((m) => m.startDate && m.endDate) ||
    (sd?.team ?? []).some((t) => t.startDate && t.endDate));
  const hasExpandableContent = hasScoping && !!(
    hasTimeline ||
    (sd?.scopeItems && sd.scopeItems.length > 0) ||
    sd?.dependencies ||
    vd?.dependencies
  );

  return (
    <div
      className={["mb-10", className].filter(Boolean).join(" ")}
      style={style}
    >
      {/* Hero stats — from Scoping onward. Priority leads; t-shirt sizing drops out. */}
      {hasScoping && (
        <div className="grid divide-y divide-foreground/10 border-t border-foreground/10 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
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
              [
                weekLabel,
                milestones.length > 0
                  ? `${milestones.length} epic${milestones.length !== 1 ? "s" : ""}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ") || undefined
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

      {/* Narrative — from Validation onward */}
      {hasValidation && (initiative.problemStatement ||
        vd?.solutionDirection ||
        businessValueSummary) && (
        <div className="grid divide-y divide-foreground/10 border-t border-foreground/10 md:grid-cols-3 md:divide-y-0 md:divide-x">
          <Narrative label="Problem" text={initiative.problemStatement} />
          <Narrative label="Solution" text={vd?.solutionDirection} />
          {vd?.businessValue ? (
            <BusinessValueVisual value={vd.businessValue} />
          ) : businessValueSummary ? (
            <Narrative label="Business Value" text={businessValueSummary} />
          ) : null}
        </div>
      )}

      {/* Tool links — from Setup onward */}
      {hasTools && (
        <div className="flex flex-wrap items-center gap-4 border-t border-foreground/10 py-3">
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
      <div
        className={[
          "flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-foreground/10 py-2.5 text-[10px] text-muted/60",
          hasExpandableContent ? "" : "border-b",
        ].join(" ")}
      >
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
        {hasGoNoGo && goDate && (
          <span>
            <span className="text-foreground/30">GO</span>{" "}
            <span className="text-foreground/70">
              {goDate.toLocaleDateString("en-US", { dateStyle: "medium" })}
              {goApprover && ` · ${goApprover}`}
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
                  "space-y-4 border-t border-foreground/10 py-4 transition-opacity duration-300 ease-out",
                  expanded ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                {hasTimeline && (
                  <MilestoneGantt
                    milestones={milestones}
                    team={sd?.team ?? []}
                  />
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
            className="group/expand flex w-full items-center justify-center gap-1.5 border-t border-b border-foreground/10 py-2 text-[10px] font-bold uppercase tracking-wide text-foreground/25 transition-colors hover:text-foreground/50"
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
