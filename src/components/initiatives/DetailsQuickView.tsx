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
  formatBusinessValueSummary,
  getSetupProgress,
  isBusinessValueData,
  parseImpactScore,
  type SetupData,
} from "@/lib/validation-data";

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
  statusLabel: string;
  statusStyle: string;
  goDate?: Date | null;
  goApprover?: string | null;
};

export function DetailsQuickView({
  initiative,
  stageName,
  statusLabel,
  statusStyle,
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

  const scopeIn = sd?.scopeItems?.filter((s) => s.inScope).length ?? 0;
  const scopeOut = sd?.scopeItems?.filter((s) => !s.inScope).length ?? 0;
  const businessValueSummary = formatBusinessValueSummary(vd?.businessValue);

  const setupProgress = getSetupProgress(setup);
  const setupPct = Math.round(
    (setupProgress.completed / setupProgress.total) * 100,
  );

  const hasScoping = currentNum >= 3;
  const hasSetup = currentNum >= 5 && !!setup;

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
        <div className="flex items-center gap-4">
          <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/50">
            Quick View
          </h3>
          <span
            className="font-display text-[10px] font-bold uppercase tracking-wide"
            style={{ color: stageColor }}
          >
            {stageName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {goDate && (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted/50">
              <Calendar className="size-3" />
              GO {goDate.toLocaleDateString("en-US", { dateStyle: "medium" })}
              {goApprover && ` · ${goApprover}`}
            </span>
          )}
          {leadParty && (
            <span
              className="border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
              style={{ borderColor: leadParty.color, color: leadParty.color }}
            >
              {leadParty.label}
            </span>
          )}
          <span
            className={`border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Hero stats — from Scoping onward */}
      {hasScoping && (
        <div className="grid divide-y divide-foreground/[0.06] border-t border-foreground/[0.06] sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4">
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
          {hasSetup ? (
            <Hero
              label="Setup"
              value={`${setupPct}%`}
              accent={setupProgress.allDone ? "#22C55E" : undefined}
              sub={
                <span className="flex items-center gap-2">
                  <span className="h-1 w-24 bg-foreground/[0.08]">
                    <span
                      className="block h-full bg-success transition-all duration-500"
                      style={{ width: `${setupPct}%` }}
                    />
                  </span>
                  {setupProgress.completed}/{setupProgress.total} tasks
                </span>
              }
            />
          ) : (
            <Hero
              label="Scope"
              value={scopeIn + scopeOut > 0 ? scopeIn : "TBD"}
              sub={
                scopeIn + scopeOut > 0
                  ? `items in scope${scopeOut > 0 ? ` · ${scopeOut} excluded` : ""}`
                  : undefined
              }
            />
          )}
        </div>
      )}

      {/* Narrative — problem, solution, value */}
      {(initiative.problemStatement ||
        vd?.solutionDirection ||
        businessValueSummary) && (
        <div className="grid divide-y divide-foreground/[0.06] border-t border-foreground/[0.06] md:grid-cols-3 md:divide-y-0 md:divide-x">
          <Narrative label="Problem" text={initiative.problemStatement} />
          <Narrative label="Solution" text={vd?.solutionDirection} />
          <Narrative label="Business Value" text={businessValueSummary} />
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
        {(tShirtSize || priority) && (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-foreground/30">Sizing</span>
            {tShirtSize && (
              <span className="border border-foreground/15 px-1 font-display text-[9px] font-bold text-foreground/70">
                {tShirtSize}
              </span>
            )}
            {priority && (
              <span className="font-display text-[9px] font-bold uppercase text-foreground/70">
                {priority}
              </span>
            )}
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
