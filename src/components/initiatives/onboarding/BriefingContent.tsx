"use client";

import {
  Building2,
  Coins,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Flag,
  Gauge,
  GitBranch,
  HardDrive,
  Lightbulb,
  Link2,
  ListChecks,
  Milestone,
  Paperclip,
  Presentation,
  Sheet,
  ShieldCheck,
  Shirt,
  StickyNote,
  Target,
  TrendingUp,
  UserRound,
  Users,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PARTIES, getPartyInk, getStageColor } from "@/data/workflow";
import { MilestoneGantt } from "../MilestoneGantt";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  BUSINESS_VALUE_TYPES,
  IMPACT_MAX,
  PRIORITY_META,
  adsomniaPriority,
  consensusPriority,
  impactScoreLabel,
  attachmentKindLabel,
  hostFromUrl,
  isBusinessValueData,
  parseImpactScore,
  type Attachment,
  type AttachmentKind,
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
  attachments?: Attachment[];
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

const VALUE_BLURB: Record<BusinessValueType, string> = {
  speed: "Shorter cycle time and less waiting",
  "cost-efficiency": "Lower cost to serve and less waste",
  growth: "More revenue, reach, or conversion",
};

const TSHIRT_HINT: Record<string, string> = {
  S: "Contained change",
  M: "Focused build",
  L: "Multi-week investment",
  XL: "Significant investment",
};

const PARTY_LOGOS: Record<string, string> = {
  adsomnia: "/logos/adsomnia.png",
  btr: "/logos/bendingtherules.jpeg",
  hn: "/logos/harlemnext.webp",
  bbb: "/logos/blablabuild.png",
};

function resolveLeadParty(stored?: string | null): {
  id?: string;
  label: string;
  color?: string;
  logo?: string;
} | null {
  if (!stored?.trim()) return null;
  const id = stored === "as" ? "adsomnia" : stored;
  const known = PARTIES.find((p) => p.id === id);
  if (known) {
    return {
      id: known.id,
      label: known.label,
      color: known.color,
      logo: PARTY_LOGOS[known.id],
    };
  }
  return { label: stored };
}

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

      <p
        className={`mt-2 text-muted ${
          presenting ? "text-sm leading-relaxed" : "text-[11px]"
        }`}
      >
        {VALUE_BLURB[type]}
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
  const lead = resolveLeadParty(vd?.leadProductionParty);
  const businessValue = vd?.businessValue;
  const valueTypes =
    businessValue && isBusinessValueData(businessValue)
      ? businessValue.types
      : [];
  const priorityMeta = vd?.priority ? PRIORITY_META[vd.priority] : undefined;

  return (
    <div className={presenting ? REVEAL_CLASS + " space-y-6" : "space-y-4"}>
      <Field
        icon={Target}
        label="The outcome we are buying"
        value={initiative.expectedImpact}
        presenting={presenting}
      />

      <Field
        icon={Zap}
        label="High-level approach"
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
          Where the value is created
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
          <p className={presenting ? "text-base leading-relaxed" : "text-xs"}>
            {businessValue}
          </p>
        ) : (
          <p className="text-xs text-muted/40">No value drivers recorded.</p>
        )}
      </div>

      <div className={`grid gap-2 ${presenting ? "sm:grid-cols-3" : "sm:grid-cols-1"}`}>
        <div className="border border-border bg-surface p-3">
          <p className="flex items-center gap-1.5 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
            <Building2 className={presenting ? "size-3.5" : "size-3"} />
            Lead production party
          </p>
          {lead ? (
            <div className="mt-2 flex items-center gap-2">
              {lead.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lead.logo}
                  alt=""
                  className={presenting ? "h-6 w-auto object-contain" : "h-5 w-auto object-contain"}
                />
              )}
              <span
                className={`font-display font-bold uppercase tracking-wide ${
                  presenting ? "text-sm" : "text-xs"
                }`}
                style={lead.color ? { color: lead.color } : undefined}
              >
                {lead.label}
              </span>
            </div>
          ) : (
            <p className={`mt-2 text-muted/40 ${presenting ? "text-sm" : "text-xs"}`}>
              —
            </p>
          )}
          <p className={`mt-1 text-muted ${presenting ? "text-xs" : "text-[11px]"}`}>
            Owns the build in Production
          </p>
        </div>

        <div className="border border-border bg-surface p-3">
          <p className="flex items-center gap-1.5 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
            <Shirt className={presenting ? "size-3.5" : "size-3"} />
            Investment estimate
          </p>
          <p
            className={`mt-2 font-display font-extrabold uppercase tracking-wide ${
              presenting ? "text-2xl" : "text-lg"
            }`}
          >
            {vd?.tShirtSize || "—"}
          </p>
          <p className={`mt-1 text-muted ${presenting ? "text-xs" : "text-[11px]"}`}>
            {vd?.tShirtSize
              ? TSHIRT_HINT[vd.tShirtSize] ?? "Relative effort"
              : "Relative effort (S–XL)"}
          </p>
        </div>

        <div className="border border-border bg-surface p-3">
          <p className="flex items-center gap-1.5 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
            <Flag className={presenting ? "size-3.5" : "size-3"} />
            Adsomnia priority
          </p>
          <p
            className={`mt-2 font-display font-extrabold uppercase tracking-wide ${
              presenting ? "text-2xl" : "text-lg"
            }`}
            style={priorityMeta ? { color: priorityMeta.color } : undefined}
          >
            {vd?.priority || "—"}
          </p>
          <p className={`mt-1 text-muted ${presenting ? "text-xs" : "text-[11px]"}`}>
            {priorityMeta?.hint ?? "Adsomnia placement before consensus"}
          </p>
        </div>
      </div>

      <div className={`grid gap-4 ${presenting ? "sm:grid-cols-2" : ""}`}>
        <Field
          icon={GitBranch}
          label="Risks, dependencies & blockers"
          value={vd?.dependencies}
          presenting={presenting}
        />
        <Field
          icon={StickyNote}
          label="Other notes"
          value={vd?.risks}
          presenting={presenting}
        />
      </div>
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
                        style={{ borderColor: party.color, color: getPartyInk(party.id) }}
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

const ATTACHMENT_ICONS: Record<AttachmentKind, LucideIcon> = {
  "google-doc": FileText,
  "google-sheet": FileSpreadsheet,
  "google-slides": Presentation,
  "google-form": Sheet,
  "google-drive": HardDrive,
  link: Link2,
  file: Paperclip,
};

const ATTACHMENT_COLORS: Record<AttachmentKind, string> = {
  "google-doc": "#4285F4",
  "google-sheet": "#0F9D58",
  "google-slides": "#F4B400",
  "google-form": "#7627BB",
  "google-drive": "#1FA463",
  link: "#7E90A3",
  file: "#CEFF00",
};

function formatAddedAt(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Workstream files plus any leftover Validation/Scoping attachments. */
export function collectFunnelAttachments(
  initiative: InitiativeWithUsers,
  workstream: Attachment[] = [],
): Attachment[] {
  const seen = new Set<string>();
  const merged: Attachment[] = [];
  for (const item of [
    ...workstream,
    ...(initiative.validationData?.attachments ?? []),
    ...(initiative.scopingData?.attachments ?? []),
  ]) {
    const key = (item.url || item.id).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged;
}

export function AttachmentsBriefBody({
  presenting,
  attachments = [],
}: BriefingBodyProps) {
  if (attachments.length === 0) {
    return (
      <p className={presenting ? "text-base text-muted" : "text-xs text-muted/40"}>
        No files or links were added during the funnel.
      </p>
    );
  }

  return (
    <div className={presenting ? REVEAL_CLASS + " space-y-4" : "space-y-3"}>
      <p className={presenting ? "text-base text-muted" : "text-xs text-muted"}>
        Everything dropped on this workstream from Initiative through Go / No-Go.
      </p>
      <div
        className={`grid gap-2 ${
          presenting ? "sm:grid-cols-2" : "sm:grid-cols-1"
        }`}
      >
        {attachments.map((item) => {
          const Icon = ATTACHMENT_ICONS[item.kind];
          const color = ATTACHMENT_COLORS[item.kind];
          const canOpen = Boolean(item.url);
          const addedOn = formatAddedAt(item.addedAt);
          const host =
            item.kind !== "file" && item.url ? hostFromUrl(item.url) : null;
          const subtitle =
            item.pageTitle &&
            item.pageTitle !== item.title &&
            item.pageTitle !== host
              ? item.pageTitle
              : host && host !== item.title
                ? host
                : null;

          return (
            <div
              key={item.id}
              className="flex items-start gap-3 border border-border bg-surface px-3 py-3"
            >
              <span
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center border"
                style={{ borderColor: `${color}66`, color }}
              >
                <Icon className={presenting ? "size-4" : "size-3.5"} />
              </span>
              <div className="min-w-0 flex-1">
                {canOpen ? (
                  <a
                    href={item.url}
                    target={item.kind === "file" ? undefined : "_blank"}
                    rel={
                      item.kind === "file" ? undefined : "noopener noreferrer"
                    }
                    download={
                      item.kind === "file" ? item.fileName : undefined
                    }
                    className={`block truncate font-medium text-foreground underline-offset-2 hover:underline ${
                      presenting ? "text-base" : "text-sm"
                    }`}
                    title={item.title}
                  >
                    {item.title}
                  </a>
                ) : (
                  <p
                    className={`truncate font-medium ${
                      presenting ? "text-base" : "text-sm"
                    }`}
                  >
                    {item.title}
                  </p>
                )}
                <p
                  className={`mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted ${
                    presenting ? "text-xs" : "text-[10px]"
                  }`}
                >
                  <span
                    className="border px-1.5 py-px font-display text-[9px] font-bold uppercase tracking-wide"
                    style={{ borderColor: `${color}66`, color }}
                  >
                    {attachmentKindLabel(item.kind)}
                  </span>
                  {subtitle && <span className="truncate">{subtitle}</span>}
                  {item.addedBy && <span>{item.addedBy}</span>}
                  {addedOn && <span>{addedOn}</span>}
                </p>
              </div>
              {canOpen && (
                <a
                  href={item.url}
                  target={item.kind === "file" ? undefined : "_blank"}
                  rel={
                    item.kind === "file" ? undefined : "noopener noreferrer"
                  }
                  download={item.kind === "file" ? item.fileName : undefined}
                  className="flex size-8 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:border-foreground hover:text-foreground"
                  aria-label={
                    item.kind === "file"
                      ? `Download ${item.title}`
                      : `Open ${item.title}`
                  }
                >
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
