"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Save,
  SendHorizonal,
  AlertCircle,
  Check,
  Info,
  Plus,
  Trash2,
  FlaskConical,
  Calendar,
  Users,
  SplitSquareVertical,
  Link2,
  Milestone as MilestoneIcon,
  UserPlus,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import {
  saveScopingData,
  submitScopingForApproval,
  type ScopingResult,
} from "@/app/(workspace)/workstreams/[id]/actions";
import { inputClass } from "@/lib/form-styles";
import type {
  ScopingData,
  ScopingMilestone,
  ScopingTeamMember,
  ScopingScopeItem,
} from "@/lib/validation-data";
import { PARTIES } from "@/data/workflow";

const initial: ScopingResult = {};

const IS_DEV = process.env.NODE_ENV === "development";

/* ─── Help text & icons ─────────────────────────────────── */

const FIELD_HELP: Record<string, string> = {
  milestones:
    "Break delivery into Epics and Milestones with target date windows. These feed directly into the Jira structure and capacity booking.",
  team:
    "For each role: who, how many hours total, hours per day, and which period. This drives resource booking and Go/No-Go cost analysis.",
  scope:
    "Define what's in scope for the first delivery slice, and what's explicitly out. Flip items between in and out.",
  dependencies:
    "Technical, partner, and calendar dependencies that affect timeline or estimates. Assumptions that must hold true.",
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  milestones: Calendar,
  team: Users,
  scope: SplitSquareVertical,
  dependencies: Link2,
};

/* ─── ID generator ─────────────────────────────────────── */

let _id = 0;
function uid(): string {
  return `s${Date.now()}-${++_id}`;
}

/* ─── Factories ────────────────────────────────────────── */

function emptyMilestone(): ScopingMilestone {
  return { id: uid(), epic: "", milestone: "", startDate: "", endDate: "" };
}

function emptyTeamMember(): ScopingTeamMember {
  return {
    id: uid(),
    role: "",
    name: "",
    totalHours: 0,
    hoursPerDay: 0,
    startDate: "",
    endDate: "",
    party: "",
  };
}

function emptyScopeItem(inScope = true): ScopingScopeItem {
  return { id: uid(), label: "", inScope };
}

/* ─── Dev prefill ──────────────────────────────────────── */

const DEV_PREFILL: ScopingData = {
  milestones: [
    {
      id: uid(),
      epic: "Onboarding Flow Redesign",
      milestone: "User research & wireframes",
      startDate: "2026-09-01",
      endDate: "2026-09-14",
    },
    {
      id: uid(),
      epic: "Onboarding Flow Redesign",
      milestone: "Frontend implementation",
      startDate: "2026-09-15",
      endDate: "2026-10-06",
    },
    {
      id: uid(),
      epic: "Data Pipeline Migration",
      milestone: "Schema migration & testing",
      startDate: "2026-09-08",
      endDate: "2026-09-28",
    },
  ],
  team: [
    {
      id: uid(),
      role: "Senior Frontend Engineer",
      name: "Alex V.",
      totalHours: 120,
      hoursPerDay: 6,
      startDate: "2026-09-01",
      endDate: "2026-10-06",
      party: "hn",
    },
    {
      id: uid(),
      role: "UX Designer",
      name: "Sophie K.",
      totalHours: 40,
      hoursPerDay: 4,
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      party: "btr",
    },
  ],
  scopeItems: [
    { id: uid(), label: "New user onboarding wizard", inScope: true },
    { id: uid(), label: "SSO/SAML integration", inScope: true },
    { id: uid(), label: "Data pipeline v2 migration", inScope: true },
    { id: uid(), label: "Legacy API deprecation", inScope: false },
    { id: uid(), label: "Mobile app support", inScope: false },
  ],
  dependencies:
    "Requires partner API v3 access (pending contract). Calendar dependency: design team on partial leave Sep 20–27. Assumes current infrastructure can handle 2× throughput.",
};

/* ─── Shared sub-components ────────────────────────────── */

function ScopingFieldInfo({ field }: { field: string }) {
  const helpText = FIELD_HELP[field];
  if (!helpText) return null;
  return (
    <span className="group relative ml-auto cursor-help">
      <Info className="size-3.5 text-muted/40 transition-colors group-hover:text-foreground" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded border border-border bg-surface-elevated px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {helpText}
      </span>
    </span>
  );
}

function ScopingFieldLabel({
  field,
  children,
  required = false,
  complete = false,
}: {
  field: string;
  children: ReactNode;
  required?: boolean;
  complete?: boolean;
}) {
  return (
    <span
      className={[
        "flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide",
        complete ? "text-foreground" : "text-muted",
      ].join(" ")}
    >
      {children}
      {required && !complete && <span className="text-btr">*</span>}
      {complete && (
        <Check className="animate-check-pop size-3.5 shrink-0 text-success" />
      )}
      <ScopingFieldInfo field={field} />
    </span>
  );
}

function MiniDateInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div className="flex-1">
      <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
        {label}
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-surface-input px-2 py-1.5 text-xs text-foreground transition-colors focus:border-muted focus:outline-none [color-scheme:dark]"
        aria-label={label}
      />
    </div>
  );
}

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-muted">
      <span className="flex size-5 items-center justify-center border border-border font-display text-[10px] font-bold tabular-nums">
        {count}
      </span>
      {label}
    </span>
  );
}

/* ─── Milestone Timeline Cards ─────────────────────────── */

function MilestoneCard({
  milestone,
  index,
  onChange,
  onRemove,
}: {
  milestone: ScopingMilestone;
  index: number;
  onChange: (updated: ScopingMilestone) => void;
  onRemove: () => void;
}) {
  const hasContent = milestone.epic.trim() || milestone.milestone.trim();
  const hasDates = milestone.startDate || milestone.endDate;

  return (
    <div
      className={[
        "group relative border transition-colors",
        hasContent && hasDates
          ? "border-success/30 bg-success/[0.03]"
          : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <GripVertical className="size-3 shrink-0 text-muted/30" />
        <span className="font-display text-[9px] font-bold uppercase tracking-widest text-muted/50">
          Milestone {index + 1}
        </span>
        <MilestoneIcon className="size-3 text-bbb/60" />
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove milestone"
        >
          <Trash2 className="size-3 text-btr/70 hover:text-btr" />
        </button>
      </div>
      <div className="space-y-2 p-3">
        <input
          type="text"
          value={milestone.epic}
          onChange={(e) => onChange({ ...milestone, epic: e.target.value })}
          placeholder="Epic name…"
          className="w-full border-b border-border bg-transparent px-0 py-1 font-display text-sm font-bold uppercase tracking-wide text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none"
        />
        <input
          type="text"
          value={milestone.milestone}
          onChange={(e) => onChange({ ...milestone, milestone: e.target.value })}
          placeholder="Milestone deliverable…"
          className="w-full border-b border-border bg-transparent px-0 py-1 text-xs text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none"
        />
        <div className="flex gap-2">
          <MiniDateInput
            value={milestone.startDate ?? ""}
            onChange={(v) => onChange({ ...milestone, startDate: v })}
            label="Start"
          />
          <MiniDateInput
            value={milestone.endDate ?? ""}
            onChange={(v) => onChange({ ...milestone, endDate: v })}
            label="End"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Team Member Cards ────────────────────────────────── */

const PARTY_OPTIONS = PARTIES.filter((p) => p.id !== "as").map((p) => ({
  value: p.id,
  label: p.short,
  color: p.color,
}));

function HoursBar({ hours, max }: { hours: number; max: number }) {
  const pct = max > 0 ? Math.min((hours / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full bg-border">
      <div
        className="h-full bg-bbb/60 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TeamMemberCard({
  member,
  maxHours,
  onChange,
  onRemove,
}: {
  member: ScopingTeamMember;
  maxHours: number;
  onChange: (updated: ScopingTeamMember) => void;
  onRemove: () => void;
}) {
  const filled = member.role.trim() && member.name.trim() && member.totalHours > 0;
  const partyColor = PARTY_OPTIONS.find((p) => p.value === member.party)?.color;

  return (
    <div
      className={[
        "group relative border transition-colors",
        filled ? "border-success/30 bg-success/[0.03]" : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <div
          className="flex size-6 items-center justify-center border text-[10px] font-bold uppercase"
          style={{
            borderColor: partyColor ?? "#333",
            color: partyColor ?? "#666",
          }}
        >
          {member.name ? member.name.charAt(0) : "?"}
        </div>
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={member.name}
            onChange={(e) => onChange({ ...member, name: e.target.value })}
            placeholder="Person name…"
            className="w-full bg-transparent font-display text-xs font-bold uppercase tracking-wide text-foreground placeholder:text-muted/40 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove team member"
        >
          <Trash2 className="size-3 text-btr/70 hover:text-btr" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <input
          type="text"
          value={member.role}
          onChange={(e) => onChange({ ...member, role: e.target.value })}
          placeholder="Role description (e.g. Senior Frontend Engineer)…"
          className="w-full border-b border-border bg-transparent px-0 py-1 text-xs text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none"
        />

        {/* Party selector — small inline pill buttons */}
        <div className="flex flex-wrap gap-1">
          {PARTY_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() =>
                onChange({
                  ...member,
                  party: member.party === p.value ? "" : p.value,
                })
              }
              className={[
                "border px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider transition-colors",
                member.party === p.value
                  ? "border-current"
                  : "border-border text-muted/50 hover:text-muted",
              ].join(" ")}
              style={member.party === p.value ? { color: p.color } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Hours — dual inline number inputs with live bar */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
              Total hours
            </span>
            <input
              type="number"
              min={0}
              value={member.totalHours || ""}
              onChange={(e) =>
                onChange({
                  ...member,
                  totalHours: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full border border-border bg-surface-input px-2 py-1.5 text-xs tabular-nums text-foreground focus:border-muted focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
              Hours / day
            </span>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={member.hoursPerDay || ""}
              onChange={(e) =>
                onChange({
                  ...member,
                  hoursPerDay: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full border border-border bg-surface-input px-2 py-1.5 text-xs tabular-nums text-foreground focus:border-muted focus:outline-none"
              placeholder="0"
            />
          </div>
        </div>
        <HoursBar hours={member.totalHours} max={maxHours} />

        <div className="flex gap-2">
          <MiniDateInput
            value={member.startDate ?? ""}
            onChange={(v) => onChange({ ...member, startDate: v })}
            label="From"
          />
          <MiniDateInput
            value={member.endDate ?? ""}
            onChange={(v) => onChange({ ...member, endDate: v })}
            label="Until"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Scope Toggle Chips ───────────────────────────────── */

function ScopeItemChip({
  item,
  onToggle,
  onLabelChange,
  onRemove,
}: {
  item: ScopingScopeItem;
  onToggle: () => void;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={[
        "group flex items-center gap-1.5 border px-2.5 py-1.5 transition-colors",
        item.inScope
          ? "border-success/40 bg-success/[0.06]"
          : "border-btr/30 bg-btr/[0.04]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex size-4 shrink-0 items-center justify-center border text-[8px] font-bold transition-colors",
          item.inScope
            ? "border-success bg-success/20 text-success"
            : "border-btr/60 bg-btr/10 text-btr",
        ].join(" ")}
        title={item.inScope ? "Click to mark out of scope" : "Click to mark in scope"}
        aria-label={item.inScope ? "In scope — click to toggle" : "Out of scope — click to toggle"}
      >
        {item.inScope ? "IN" : "OUT"}
      </button>
      <input
        type="text"
        value={item.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Scope item…"
        className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted/40 focus:outline-none"
      />
      <button
        type="button"
        onClick={onRemove}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove scope item"
      >
        <Trash2 className="size-3 text-muted/50 hover:text-btr" />
      </button>
    </div>
  );
}

/* ─── Progress Ring ────────────────────────────────────── */

function ProgressRing({ sections }: { sections: { done: boolean; label: string }[] }) {
  const total = sections.length;
  const completed = sections.filter((s) => s.done).length;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex items-center gap-3">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#222" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={pct === 100 ? "#22c55e" : "#CEFF00"}
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          className="transition-all duration-500"
        />
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-xs font-bold tabular-nums">
          {completed}/{total}
        </span>
        <span className="text-[10px] text-muted">sections ready</span>
      </div>
    </div>
  );
}

/* ─── Scoping Header ───────────────────────────────────── */

function ScopingHeader({
  onPrefill,
  sections,
}: {
  onPrefill?: () => void;
  sections: { done: boolean; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-4">
        <ProgressRing sections={sections} />
        <div>
          <h3 className="font-display text-xs font-bold uppercase tracking-wide">
            Scoping Proposal
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Define the delivery plan — milestones, team, and scope boundaries.
            This feeds directly into the Go/No-Go decision and Jira project setup.
          </p>
        </div>
      </div>
      {IS_DEV && onPrefill && (
        <button
          type="button"
          onClick={onPrefill}
          title="Prefill form (dev only)"
          aria-label="Prefill form for testing"
          className="inline-flex size-8 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:border-bbb/50 hover:text-bbb"
        >
          <FlaskConical className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */

type Props = {
  initiativeId: number;
  data: ScopingData | null;
  readOnly?: boolean;
  resubmitting?: boolean;
};

export function ScopingPhaseSection({
  initiativeId,
  data,
  readOnly = false,
  resubmitting = false,
}: Props) {
  const boundSave = saveScopingData.bind(null, initiativeId);
  const boundSubmit = submitScopingForApproval.bind(null, initiativeId);

  const [saveState, saveAction, savePending] = useActionState(boundSave, initial);
  const [submitState, submitAction, submitPending] = useActionState(
    boundSubmit,
    initial,
  );

  const pending = savePending || submitPending;
  const error = saveState.error || submitState.error;
  const saved = saveState.success;
  const [submissionUpdated, setSubmissionUpdated] = useState(false);

  useEffect(() => {
    if (submitState.success && resubmitting) setSubmissionUpdated(true);
  }, [submitState.success, resubmitting]);

  function markDirty() {
    if (submissionUpdated) setSubmissionUpdated(false);
  }

  // ── Milestones state
  const [milestones, setMilestones] = useState<ScopingMilestone[]>(
    data?.milestones?.length ? data.milestones : [emptyMilestone()],
  );
  const addMilestone = () => {
    markDirty();
    setMilestones((prev) => [...prev, emptyMilestone()]);
  };
  const updateMilestone = useCallback(
    (i: number, updated: ScopingMilestone) => {
      markDirty();
      setMilestones((prev) => prev.map((m, idx) => (idx === i ? updated : m)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const removeMilestone = (i: number) => {
    markDirty();
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Team state
  const [team, setTeam] = useState<ScopingTeamMember[]>(
    data?.team?.length ? data.team : [emptyTeamMember()],
  );
  const maxHours = Math.max(...team.map((t) => t.totalHours), 1);
  const totalHours = team.reduce((sum, t) => sum + t.totalHours, 0);
  const addTeamMember = () => {
    markDirty();
    setTeam((prev) => [...prev, emptyTeamMember()]);
  };
  const updateTeamMember = useCallback(
    (i: number, updated: ScopingTeamMember) => {
      markDirty();
      setTeam((prev) => prev.map((m, idx) => (idx === i ? updated : m)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const removeTeamMember = (i: number) => {
    markDirty();
    setTeam((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Scope items state
  const [scopeItems, setScopeItems] = useState<ScopingScopeItem[]>(
    data?.scopeItems?.length
      ? data.scopeItems
      : [emptyScopeItem(true), emptyScopeItem(false)],
  );
  const addScopeItem = (inScope: boolean) => {
    markDirty();
    setScopeItems((prev) => [...prev, emptyScopeItem(inScope)]);
  };
  const updateScopeItem = (i: number, changes: Partial<ScopingScopeItem>) => {
    markDirty();
    setScopeItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, ...changes } : item)),
    );
  };
  const removeScopeItem = (i: number) => {
    markDirty();
    setScopeItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Dependencies state
  const [dependencies, setDependencies] = useState(data?.dependencies ?? "");

  // ── Completeness checks
  const milestonesReady =
    milestones.length > 0 &&
    milestones.every((m) => m.epic.trim() && m.milestone.trim());
  const teamReady =
    team.length > 0 &&
    team.every((t) => t.role.trim() && t.name.trim() && t.totalHours > 0);
  const scopeReady =
    scopeItems.length > 0 && scopeItems.every((s) => s.label.trim());
  const depsReady = dependencies.trim().length > 0;

  const sections = [
    { done: milestonesReady, label: "Milestones" },
    { done: teamReady, label: "Team" },
    { done: scopeReady, label: "Scope" },
    { done: depsReady, label: "Dependencies" },
  ];

  function applyDevPrefill() {
    markDirty();
    setMilestones(DEV_PREFILL.milestones!.map((m) => ({ ...m, id: uid() })));
    setTeam(DEV_PREFILL.team!.map((t) => ({ ...t, id: uid() })));
    setScopeItems(
      DEV_PREFILL.scopeItems!.map((s) => ({ ...s, id: uid() })),
    );
    setDependencies(DEV_PREFILL.dependencies!);
  }

  const inScopeItems = scopeItems.filter((s) => s.inScope);
  const outScopeItems = scopeItems.filter((s) => !s.inScope);

  if (readOnly) {
    return (
      <>
        <ScopingHeader sections={sections} />
        <ScopingReadOnly data={data} maxHours={maxHours} />
      </>
    );
  }

  return (
    <>
      <ScopingHeader onPrefill={applyDevPrefill} sections={sections} />

      {/* Hidden JSON fields for server action */}
      <input type="hidden" name="milestones" value={JSON.stringify(milestones)} />
      <input type="hidden" name="team" value={JSON.stringify(team)} />
      <input type="hidden" name="scopeItems" value={JSON.stringify(scopeItems)} />

      <div className="space-y-4 p-4">
        {error && (
          <div className="flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2 text-xs text-btr">
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </div>
        )}
        {saved && (
          <p className="border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
            Draft saved successfully.
          </p>
        )}

        <div className="divide-y divide-border">
          {/* ─── 1. Milestone Timeline ──────────────────────── */}
          <div className="space-y-3 py-5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between">
              <ScopingFieldLabel field="milestones" required complete={milestonesReady}>
                Epic & Milestone Timeline
              </ScopingFieldLabel>
              <CountBadge count={milestones.length} label="milestones" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((m, i) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  index={i}
                  onChange={(updated) => updateMilestone(i, updated)}
                  onRemove={() => removeMilestone(i)}
                />
              ))}
              <button
                type="button"
                onClick={addMilestone}
                className="flex min-h-[120px] items-center justify-center gap-2 border border-dashed border-border text-xs text-muted transition-colors hover:border-bbb/50 hover:text-bbb"
              >
                <Plus className="size-3.5" />
                Add Milestone
              </button>
            </div>
          </div>

          {/* ─── 2. Team & Hour Estimates ───────────────────── */}
          <div className="space-y-3 py-5 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between">
              <ScopingFieldLabel field="team" required complete={teamReady}>
                Role-Based Team & Hours
              </ScopingFieldLabel>
              <div className="flex items-center gap-3">
                <span className="font-display text-[10px] font-bold tabular-nums text-muted">
                  {totalHours}h total
                </span>
                <CountBadge count={team.length} label="members" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {team.map((m, i) => (
                <TeamMemberCard
                  key={m.id}
                  member={m}
                  maxHours={maxHours}
                  onChange={(updated) => updateTeamMember(i, updated)}
                  onRemove={() => removeTeamMember(i)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addTeamMember}
              className="flex w-full items-center justify-center gap-2 border border-dashed border-border px-3 py-3 text-xs text-muted transition-colors hover:border-bbb/50 hover:text-bbb"
            >
              <UserPlus className="size-3.5" />
              Add Team Member
            </button>
          </div>

          {/* ─── 3. Scope Boundaries (toggle chips) ────────── */}
          <div className="space-y-3 py-5 first:pt-0 last:pb-0">
            <ScopingFieldLabel field="scope" required complete={scopeReady}>
              Scope Boundaries
            </ScopingFieldLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-4 items-center justify-center border border-success bg-success/20 text-[7px] font-bold text-success">
                    IN
                  </span>
                  <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    In Scope ({inScopeItems.length})
                  </span>
                </div>
                {inScopeItems.map((item) => {
                  const idx = scopeItems.findIndex((s) => s.id === item.id);
                  return (
                    <ScopeItemChip
                      key={item.id}
                      item={item}
                      onToggle={() => updateScopeItem(idx, { inScope: false })}
                      onLabelChange={(label) => updateScopeItem(idx, { label })}
                      onRemove={() => removeScopeItem(idx)}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => addScopeItem(true)}
                  className="flex w-full items-center justify-center gap-1.5 border border-dashed border-success/30 px-2 py-1.5 text-[10px] text-success/60 transition-colors hover:border-success/50 hover:text-success"
                >
                  <Plus className="size-3" />
                  Add in-scope item
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-4 items-center justify-center border border-btr/60 bg-btr/10 text-[7px] font-bold text-btr">
                    OUT
                  </span>
                  <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Out of Scope ({outScopeItems.length})
                  </span>
                </div>
                {outScopeItems.map((item) => {
                  const idx = scopeItems.findIndex((s) => s.id === item.id);
                  return (
                    <ScopeItemChip
                      key={item.id}
                      item={item}
                      onToggle={() => updateScopeItem(idx, { inScope: true })}
                      onLabelChange={(label) => updateScopeItem(idx, { label })}
                      onRemove={() => removeScopeItem(idx)}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => addScopeItem(false)}
                  className="flex w-full items-center justify-center gap-1.5 border border-dashed border-btr/30 px-2 py-1.5 text-[10px] text-btr/60 transition-colors hover:border-btr/50 hover:text-btr"
                >
                  <Plus className="size-3" />
                  Add out-of-scope item
                </button>
              </div>
            </div>
          </div>

          {/* ─── 4. Dependencies & Assumptions ─────────────── */}
          <label className="block py-5 first:pt-0 last:pb-0">
            <ScopingFieldLabel field="dependencies" required complete={depsReady}>
              Dependencies & Assumptions
            </ScopingFieldLabel>
            <textarea
              name="scopeDependencies"
              required
              rows={3}
              value={dependencies}
              onChange={(e) => {
                markDirty();
                setDependencies(e.target.value);
              }}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Requires partner API v3 access (pending contract). Assumes current infra handles 2× throughput."
            />
          </label>
        </div>

        {/* ─── Actions ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          {!resubmitting && (
            <button
              type="submit"
              formAction={saveAction}
              disabled={pending}
              className="group relative inline-flex items-center gap-2 overflow-hidden border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-foreground/[0.06] transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <Save className="relative size-3.5" />
              <span className="relative">
                {savePending ? "Saving…" : "Save Draft"}
              </span>
            </button>
          )}
          {submissionUpdated ? (
            <span className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success">
              <Check className="animate-check-pop size-3.5" />
              Saved
            </span>
          ) : (
            <button
              type="submit"
              formAction={submitAction}
              disabled={pending}
              className="group relative inline-flex items-center gap-2 overflow-hidden border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <SendHorizonal className="relative size-3.5" />
              <span className="relative">
                {submitPending
                  ? "Submitting…"
                  : resubmitting
                    ? "Update Submission"
                    : "Submit for Go/No-Go"}
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Read-Only View ───────────────────────────────────── */

function ScopingReadOnly({
  data,
  maxHours,
}: {
  data: ScopingData | null;
  maxHours: number;
}) {
  const milestones = data?.milestones ?? [];
  const team = data?.team ?? [];
  const scopeItems = data?.scopeItems ?? [];

  return (
    <div className="divide-y divide-border">
      {/* Milestones */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <Calendar className="size-3.5 shrink-0" />
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Epic & Milestone Timeline
          </p>
          <CountBadge count={milestones.length} label="milestones" />
        </div>
        {milestones.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((m, i) => (
              <div key={m.id ?? i} className="border border-border bg-surface p-3">
                <p className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                  {m.epic}
                </p>
                <p className="mt-0.5 text-xs text-muted">{m.milestone}</p>
                {(m.startDate || m.endDate) && (
                  <p className="mt-1.5 text-[10px] tabular-nums text-muted/70">
                    {m.startDate ?? "—"} → {m.endDate ?? "—"}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/90">—</p>
        )}
      </div>

      {/* Team */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <Users className="size-3.5 shrink-0" />
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Team & Hours
          </p>
          <span className="ml-auto font-display text-[10px] font-bold tabular-nums">
            {team.reduce((s, t) => s + t.totalHours, 0)}h total
          </span>
        </div>
        {team.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {team.map((t, i) => {
              const partyColor = PARTY_OPTIONS.find(
                (p) => p.value === t.party,
              )?.color;
              return (
                <div key={t.id ?? i} className="border border-border bg-surface p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex size-5 items-center justify-center border text-[9px] font-bold"
                      style={{
                        borderColor: partyColor ?? "#333",
                        color: partyColor ?? "#666",
                      }}
                    >
                      {t.name.charAt(0) || "?"}
                    </div>
                    <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      {t.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t.role}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="font-display text-[10px] font-bold tabular-nums text-foreground">
                      {t.totalHours}h
                    </span>
                    <span className="text-[10px] text-muted">
                      @ {t.hoursPerDay}h/day
                    </span>
                  </div>
                  <HoursBar hours={t.totalHours} max={maxHours} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-foreground/90">—</p>
        )}
      </div>

      {/* Scope */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <SplitSquareVertical className="size-3.5 shrink-0" />
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Scope Boundaries
          </p>
        </div>
        {scopeItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="font-display text-[9px] font-bold uppercase tracking-wider text-success">
                In Scope
              </span>
              {scopeItems
                .filter((s) => s.inScope)
                .map((s, i) => (
                  <div
                    key={s.id ?? i}
                    className="flex items-center gap-1.5 border border-success/30 bg-success/[0.04] px-2 py-1 text-xs text-foreground"
                  >
                    <Check className="size-3 text-success" />
                    {s.label}
                  </div>
                ))}
            </div>
            <div className="space-y-1">
              <span className="font-display text-[9px] font-bold uppercase tracking-wider text-btr">
                Out of Scope
              </span>
              {scopeItems
                .filter((s) => !s.inScope)
                .map((s, i) => (
                  <div
                    key={s.id ?? i}
                    className="flex items-center gap-1.5 border border-btr/30 bg-btr/[0.04] px-2 py-1 text-xs text-foreground/70 line-through"
                  >
                    {s.label}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90">—</p>
        )}
      </div>

      {/* Dependencies */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <Link2 className="size-3.5 shrink-0" />
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Dependencies & Assumptions
          </p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {data?.dependencies || "—"}
        </p>
      </div>
    </div>
  );
}
