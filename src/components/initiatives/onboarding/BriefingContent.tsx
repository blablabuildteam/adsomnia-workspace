"use client";

import {
  Coins,
  Gauge,
  GitBranch,
  Lightbulb,
  ListChecks,
  Milestone,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  Users,
  UsersRound,
  Zap,
} from "lucide-react";
import { PARTIES, getStageColor } from "@/data/workflow";
import { MilestoneGantt } from "../MilestoneGantt";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  BUSINESS_VALUE_TYPES,
  IMPACT_MAX,
  adsomniaPriority,
  consensusPriority,
  impactScoreLabel,
  isBusinessValueData,
  parseImpactScore,
  type BusinessValueType,
} from "@/lib/validation-data";

/**
 * Read-only recaps of Phases 01–03, used both inline and in the fullscreen
 * briefing. `presenting` only scales type — the content stays identical so the
 * team sees exactly what Coen sees.
 */
export type BriefingBodyProps = {
  initiative: InitiativeWithUsers;
  presenting?: boolean;
};

/** Staged reveal for fullscreen slides — see `.briefing-reveal` in globals.css. */
const REVEAL_CLASS = "briefing-reveal";
const VALIDATION_ACCENT = getStageColor("validation");

function Field({
  label,
  value,
  presenting,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  presenting?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
        {Icon && <Icon className={presenting ? "size-3.5" : "size-3"} />}
        {label}
      </p>
      <p
        className={`mt-1 whitespace-pre-line ${
          presenting ? "text-base leading-relaxed" : "text-xs"
        } ${value ? "text-foreground" : "text-muted/40"}`}
      >
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

function Chip({
  children,
  color,
  presenting,
}: {
  children: React.ReactNode;
  color?: string;
  presenting?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border px-2 py-0.5 font-display font-bold uppercase tracking-wide ${
        presenting ? "text-xs" : "text-[10px]"
      } ${color ? "" : "border-border text-muted"}`}
      style={color ? { borderColor: color, color } : undefined}
    >
      {children}
    </span>
  );
}

function SubHeading({
  children,
  presenting,
  aside,
  icon: Icon,
}: {
  children: React.ReactNode;
  presenting?: boolean;
  aside?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h4
        className={`flex items-center gap-1.5 font-display font-bold uppercase tracking-wide text-foreground ${
          presenting ? "text-sm" : "text-[11px]"
        }`}
      >
        {Icon && (
          <Icon
            className={`shrink-0 text-muted/60 ${presenting ? "size-4" : "size-3.5"}`}
          />
        )}
        {children}
      </h4>
      {aside}
    </div>
  );
}

const VALUE_ICONS: Record<
  BusinessValueType,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  speed: Gauge,
  "cost-efficiency": Coins,
  growth: TrendingUp,
};

/** Business value as a 10-segment meter — reads at presentation distance. */
function ValueMeter({
  type,
  score,
  presenting,
}: {
  type: BusinessValueType;
  score: number | null;
  presenting?: boolean;
}) {
  const label = BUSINESS_VALUE_TYPES.find((t) => t.id === type)?.label ?? type;
  const Icon = VALUE_ICONS[type];
  const filled = score ?? 0;

  return (
    <div className="border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon
            className={`shrink-0 ${presenting ? "size-4" : "size-3.5"}`}
            style={{ color: VALIDATION_ACCENT }}
          />
          <span
            className={`truncate font-display font-bold uppercase tracking-wide ${
              presenting ? "text-xs" : "text-[10px]"
            }`}
          >
            {label}
          </span>
        </span>
        {score != null && (
          <span
            className={`shrink-0 font-display font-bold uppercase tracking-wide text-muted ${
              presenting ? "text-[10px]" : "text-[9px]"
            }`}
          >
            {impactScoreLabel(score)}
          </span>
        )}
      </div>

      <p className="mt-2 flex items-baseline gap-1">
        <span
          className={`font-display font-extrabold leading-none tabular-nums ${
            presenting ? "text-4xl" : "text-2xl"
          }`}
        >
          {score ?? "—"}
        </span>
        {score != null && (
          <span
            className={`font-display font-bold tabular-nums text-muted ${
              presenting ? "text-sm" : "text-[10px]"
            }`}
          >
            /{IMPACT_MAX}
          </span>
        )}
      </p>

      <span
        aria-hidden
        className={`mt-2.5 flex gap-[3px] ${presenting ? "h-2.5" : "h-1.5"}`}
      >
        {Array.from({ length: IMPACT_MAX }, (_, index) => (
          <span
            key={index}
            className="h-full flex-1"
            style={{
              backgroundColor:
                index < filled ? VALIDATION_ACCENT : "rgb(255 255 255 / 0.08)",
            }}
          />
        ))}
      </span>
    </div>
  );
}

export function InitiativeBriefBody({
  initiative,
  presenting,
}: BriefingBodyProps) {
  return (
    <div className={presenting ? REVEAL_CLASS + " space-y-6" : "space-y-4"}>
      <div className={`grid gap-4 ${presenting ? "sm:grid-cols-2" : ""}`}>
        <Field
          icon={Target}
          label="The Problem"
          value={initiative.problemStatement}
          presenting={presenting}
        />
        <Field
          icon={Lightbulb}
          label="Opportunity / Solution"
          value={initiative.opportunitySolution}
          presenting={presenting}
        />
        <Field
          icon={TrendingUp}
          label="Expected Impact"
          value={initiative.expectedImpact}
          presenting={presenting}
        />
        <Field
          icon={Users}
          label="Target Audience"
          value={initiative.targetAudience}
          presenting={presenting}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-3">
        <span
          className={`inline-flex items-center gap-1.5 text-muted ${
            presenting ? "text-sm" : "text-[11px]"
          }`}
        >
          <UserRound className="size-3.5 shrink-0 text-muted/50" />
          Submitted by{" "}
          <span className="text-foreground">{initiative.submitter.name}</span>
        </span>
        <span
          className={`inline-flex items-center gap-1.5 text-muted ${
            presenting ? "text-sm" : "text-[11px]"
          }`}
        >
          <ShieldCheck className="size-3.5 shrink-0 text-muted/50" />
          Sponsor{" "}
          <span className="text-foreground">{initiative.sponsor.name}</span>
        </span>
      </div>
    </div>
  );
}

export function ValidationBriefBody({
  initiative,
  presenting,
}: BriefingBodyProps) {
  const vd = initiative.validationData;
  const leadParty = PARTIES.find((p) => p.id === vd?.leadProductionParty);
  const businessValue = vd?.businessValue;
  const valueTypes =
    businessValue && isBusinessValueData(businessValue)
      ? businessValue.types
      : [];

  return (
    <div className={presenting ? REVEAL_CLASS + " space-y-6" : "space-y-4"}>
      <Field
        icon={Zap}
        label="Solution Direction"
        value={vd?.solutionDirection}
        presenting={presenting}
      />

      <div className="space-y-2">
        <SubHeading
          icon={TrendingUp}
          presenting={presenting}
          aside={
            valueTypes.length > 0 ? (
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                {valueTypes.length} value driver
                {valueTypes.length === 1 ? "" : "s"}
              </span>
            ) : undefined
          }
        >
          Business Value
        </SubHeading>
        {valueTypes.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {valueTypes.map((type) => (
              <ValueMeter
                key={type}
                type={type}
                score={
                  businessValue && isBusinessValueData(businessValue)
                    ? parseImpactScore(businessValue.expectations[type])
                    : null
                }
                presenting={presenting}
              />
            ))}
          </div>
        ) : typeof businessValue === "string" && businessValue.trim() ? (
          <p className={presenting ? "text-base" : "text-xs"}>
            {businessValue}
          </p>
        ) : (
          <p className="text-xs text-muted/40">—</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {leadParty && (
          <Chip color={leadParty.color} presenting={presenting}>
            Lead · {leadParty.label}
          </Chip>
        )}
        {vd?.tShirtSize && (
          <Chip presenting={presenting}>Size {vd.tShirtSize}</Chip>
        )}
        {vd?.priority && (
          <Chip presenting={presenting}>Adsomnia Priority {vd.priority}</Chip>
        )}
      </div>

      {(vd?.dependencies || vd?.risks) && (
        <div className={`grid gap-4 ${presenting ? "sm:grid-cols-2" : ""}`}>
          {vd?.dependencies && (
            <Field
              icon={GitBranch}
              label="Dependencies"
              value={vd.dependencies}
              presenting={presenting}
            />
          )}
          {vd?.risks && (
            <Field
              icon={Lightbulb}
              label="Notes"
              value={vd.risks}
              presenting={presenting}
            />
          )}
        </div>
      )}
    </div>
  );
}

function formatDateRange(start?: string, end?: string): string {
  if (!start && !end) return "Dates TBC";
  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        })
      : "?";
  return `${fmt(start)} – ${fmt(end)}`;
}

export function ScopingBriefBody({
  initiative,
  presenting,
}: BriefingBodyProps) {
  const sd = initiative.scopingData;
  const consensus = consensusPriority(sd);
  const adsomnia = adsomniaPriority(initiative.validationData);
  const milestones = sd?.milestones ?? [];
  const team = sd?.team ?? [];
  const inScope = sd?.scopeItems?.filter((item) => item.inScope) ?? [];
  const outOfScope = sd?.scopeItems?.filter((item) => !item.inScope) ?? [];
  const totalHours = team.reduce((sum, t) => sum + (t.totalHours || 0), 0);
  const hasTimeline =
    milestones.some((m) => m.startDate && m.endDate) ||
    team.some((t) => t.startDate && t.endDate);

  return (
    <div className={presenting ? REVEAL_CLASS + " space-y-6" : "space-y-5"}>
      {(consensus || adsomnia) && (
        <div className="flex flex-wrap items-center gap-2">
          {consensus && (
            <Chip presenting={presenting}>Consensus Priority {consensus}</Chip>
          )}
          {adsomnia && (
            <Chip presenting={presenting}>Adsomnia {adsomnia}</Chip>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-2">
        <SubHeading
          icon={Milestone}
          presenting={presenting}
          aside={
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              {milestones.length} milestone{milestones.length === 1 ? "" : "s"}
            </span>
          }
        >
          Epic &amp; Milestone Timeline
        </SubHeading>
        {milestones.length > 0 ? (
          <div className="divide-y divide-border border border-border">
            {milestones.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-surface px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 shrink-0"
                    style={{ backgroundColor: m.color || "#2DD4BF" }}
                  />
                  <span
                    className={`font-display font-bold uppercase tracking-wide text-muted ${
                      presenting ? "text-xs" : "text-[10px]"
                    }`}
                  >
                    {m.epic || "Epic"}
                  </span>
                  <span className={presenting ? "text-sm" : "text-xs"}>
                    {m.milestone || "—"}
                  </span>
                </span>
                <span
                  className={`shrink-0 font-display tabular-nums text-muted ${
                    presenting ? "text-xs" : "text-[10px]"
                  }`}
                >
                  {formatDateRange(m.startDate, m.endDate)}
                </span>
              </div>
            ))}
            {hasTimeline && (
              /* Zoom keeps the Gantt legible from the back of the room */
              <div className={presenting ? "p-3 [zoom:1.15]" : "p-3"}>
                <MilestoneGantt milestones={milestones} team={team} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted/40">No milestones recorded.</p>
        )}
      </div>

      {/* Team — hours only, no rates */}
      <div className="space-y-2">
        <SubHeading
          icon={UsersRound}
          presenting={presenting}
          aside={
            <span className="font-display text-[10px] font-bold uppercase tracking-wide tabular-nums text-muted">
              {team.length} member{team.length === 1 ? "" : "s"} · {totalHours}h
            </span>
          }
        >
          Team &amp; Capacity
        </SubHeading>
        {team.length > 0 ? (
          <div className="divide-y divide-border border border-border">
            {team.map((member) => {
              const party = PARTIES.find((p) => p.id === member.party);
              return (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-surface px-3 py-2"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={`font-medium ${presenting ? "text-sm" : "text-xs"}`}
                    >
                      {member.name || "Unnamed"}
                    </span>
                    <span
                      className={`text-muted ${presenting ? "text-xs" : "text-[10px]"}`}
                    >
                      {member.role}
                    </span>
                    {party && (
                      <span
                        className="border px-1.5 font-display text-[9px] font-bold uppercase tracking-wide"
                        style={{ borderColor: party.color, color: party.color }}
                      >
                        {party.short}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 font-display tabular-nums text-muted ${
                      presenting ? "text-xs" : "text-[10px]"
                    }`}
                  >
                    {member.totalHours}h · {member.hoursPerDay}h/day ·{" "}
                    {formatDateRange(member.startDate, member.endDate)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted/40">No team members recorded.</p>
        )}
      </div>

      {/* Scope */}
      <div className="space-y-2">
        <SubHeading icon={ListChecks} presenting={presenting}>
          Scope Boundaries
        </SubHeading>
        {inScope.length + outOfScope.length > 0 ? (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {[...inScope, ...outOfScope].map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 border border-border bg-surface px-3 py-1.5"
              >
                <span
                  className={`${presenting ? "text-sm" : "text-xs"} ${
                    item.inScope ? "text-success" : "text-muted/50 line-through"
                  }`}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted/40">No scope items recorded.</p>
        )}
      </div>

      {sd?.dependencies && (
        <Field
          icon={GitBranch}
          label="Dependencies & Risks"
          value={sd.dependencies}
          presenting={presenting}
        />
      )}
    </div>
  );
}
