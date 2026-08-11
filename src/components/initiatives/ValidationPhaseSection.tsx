"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  Save,
  SendHorizonal,
  AlertCircle,
  Info,
  FlaskConical,
  BarChart3,
  Compass,
  Shirt,
  Flag,
  Building2,
  Link2,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import {
  saveValidationData,
  submitValidationForApproval,
  type ValidationResult,
} from "@/app/(workspace)/initiatives/[id]/actions";
import { inputClass } from "@/lib/form-styles";
import { Select } from "@/components/ui/Select";
import type { ValidationData } from "@/lib/queries";
import { PARTIES } from "@/data/workflow";

const initial: ValidationResult = {};

const TSHIRT_OPTIONS = [
  { value: "S", label: "S — Small" },
  { value: "M", label: "M — Medium" },
  { value: "L", label: "L — Large" },
  { value: "XL", label: "XL — Extra Large" },
];

const PRIORITY_OPTIONS = [
  { value: "Now", label: "NOW — High priority" },
  { value: "Near", label: "NEAR — Medium priority" },
  { value: "Later", label: "LATER — Lower priority" },
  { value: "Backlog", label: "BACKLOG — On the radar" },
];

const LEAD_PARTY_OPTIONS = PARTIES.map((p) => ({
  value: p.id,
  label: p.label,
}));

const IS_DEV = process.env.NODE_ENV === "development";

const DEV_PREFILL = {
  businessValue:
    "KPI: hours/week on pixel setup. Baseline: ~10h. Target: ~6h (−40%). Secondary: fewer tracking gaps in retargeting data.",
  solutionDirection:
    "Shared config service + templates; push via CMS API; HN owns build, BTR handles rollout to partner sites.",
  tShirtSize: "L",
  priority: "Now",
  leadProductionParty: "hn",
  dependencies:
    "Depends on CMS API access; blocked until partner template audit is complete (WS-1098).",
  risks:
    "Risk: partner template variance breaks auto-deployment. Do nothing: continue manual setup at ~10h/week.",
};

/** Help text for validation form fields. */
const FIELD_HELP: Record<string, string> = {
  businessValue:
    "Define measurable KPIs with baseline and target values. Be specific about the metric, current state, and expected improvement.",
  solutionDirection:
    "Outline the technical approach and architecture. Who owns the build? What systems are involved?",
  tShirtSize:
    "Estimate effort: S (<40h), M (40–80h), L (80–160h), XL (160h+). Consider complexity, unknowns, and team capacity.",
  priority:
    "NOW = urgent/blocking. NEAR = next quarter. LATER = roadmap item. BACKLOG = monitor for now.",
  leadProductionParty:
    "Which party will most likely lead Production for this initiative? They assist the Head of Production during Validation and beyond.",
  dependencies:
    "List upstream blockers, required access, or parallel workstreams. Include ticket refs if known.",
  risks:
    "Identify risks and the cost of inaction. What happens if we do nothing or delay?",
};

const FIELD_ICONS: Record<keyof typeof FIELD_HELP, LucideIcon> = {
  businessValue: BarChart3,
  solutionDirection: Compass,
  tShirtSize: Shirt,
  priority: Flag,
  leadProductionParty: Building2,
  dependencies: Link2,
  risks: ShieldAlert,
};

function FieldInfoIcon({ field }: { field: keyof typeof FIELD_HELP }) {
  const helpText = FIELD_HELP[field];
  return (
    <span className="group relative ml-auto cursor-help">
      <Info className="size-3.5 text-muted/40 transition-colors group-hover:text-foreground" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded border border-border bg-surface-elevated px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {helpText}
      </span>
    </span>
  );
}

function FieldLabel({
  field,
  children,
  required = false,
}: {
  field: keyof typeof FIELD_HELP;
  children: ReactNode;
  required?: boolean;
}) {
  const Icon = FIELD_ICONS[field];
  return (
    <span className="flex items-center gap-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
      <Icon className="size-3.5 shrink-0" />
      {children}
      {required && <span className="text-btr">*</span>}
      <FieldInfoIcon field={field} />
    </span>
  );
}

function BusinessCaseHeader({
  onPrefill,
}: {
  onPrefill?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xs font-bold uppercase tracking-wide">
          Business Case
        </h3>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          Validate whether this initiative is worth building. Capture the value,
          effort, who leads, and what could go wrong — so leadership can decide
          with confidence.
        </p>
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

type Props = {
  initiativeId: number;
  data: ValidationData | null;
  readOnly?: boolean;
};

export function ValidationPhaseSection({
  initiativeId,
  data,
  readOnly = false,
}: Props) {
  const boundSave = saveValidationData.bind(null, initiativeId);
  const boundSubmit = submitValidationForApproval.bind(null, initiativeId);

  const [saveState, saveAction, savePending] = useActionState(boundSave, initial);
  const [submitState, submitAction, submitPending] = useActionState(boundSubmit, initial);

  const pending = savePending || submitPending;
  const error = saveState.error || submitState.error;
  const saved = saveState.success;

  const [tShirtSize, setTShirtSize] = useState(data?.tShirtSize ?? "");
  const [priority, setPriority] = useState(data?.priority ?? "");
  const [leadParty, setLeadParty] = useState(data?.leadProductionParty ?? "");
  const [businessValue, setBusinessValue] = useState(data?.businessValue ?? "");
  const [solutionDirection, setSolutionDirection] = useState(
    data?.solutionDirection ?? "",
  );
  const [dependencies, setDependencies] = useState(data?.dependencies ?? "");
  const [risks, setRisks] = useState(data?.risks ?? "");

  function applyDevPrefill() {
    setBusinessValue(DEV_PREFILL.businessValue);
    setSolutionDirection(DEV_PREFILL.solutionDirection);
    setTShirtSize(DEV_PREFILL.tShirtSize);
    setPriority(DEV_PREFILL.priority);
    setLeadParty(DEV_PREFILL.leadProductionParty);
    setDependencies(DEV_PREFILL.dependencies);
    setRisks(DEV_PREFILL.risks);
  }

  if (readOnly) {
    return (
      <>
        <BusinessCaseHeader />
        <ValidationReadOnly data={data} />
      </>
    );
  }

  return (
    <>
      <BusinessCaseHeader onPrefill={applyDevPrefill} />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <FieldLabel field="businessValue" required>
              Quantifiable Business Value
            </FieldLabel>
            <textarea
              name="businessValue"
              required
              rows={3}
              value={businessValue}
              onChange={(e) => setBusinessValue(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="e.g. KPI: hours/week on pixel setup. Baseline: ~10h. Target: ~6h (−40%)."
            />
          </label>

          <label className="block sm:col-span-2">
            <FieldLabel field="solutionDirection" required>
              Global Solution Direction & Architecture
            </FieldLabel>
            <textarea
              name="solutionDirection"
              required
              rows={3}
              value={solutionDirection}
              onChange={(e) => setSolutionDirection(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Shared config service + templates; push via CMS API; HN owns build."
            />
          </label>

          <div>
            <FieldLabel field="tShirtSize" required>
              Investment Estimate (T-Shirt)
            </FieldLabel>
            <div className="mt-1">
              <Select
                name="tShirtSize"
                value={tShirtSize}
                onChange={setTShirtSize}
                options={TSHIRT_OPTIONS}
                placeholder="Select size…"
                required
              />
            </div>
          </div>

          <div>
            <FieldLabel field="priority" required>
              Strategic Fit & Priority
            </FieldLabel>
            <div className="mt-1">
              <Select
                name="priority"
                value={priority}
                onChange={setPriority}
                options={PRIORITY_OPTIONS}
                placeholder="Select priority…"
                required
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <FieldLabel field="leadProductionParty" required>
              Lead Production Party
            </FieldLabel>
            <div className="mt-1">
              <Select
                name="leadProductionParty"
                value={leadParty}
                onChange={setLeadParty}
                options={LEAD_PARTY_OPTIONS}
                placeholder="Select lead party…"
                required
              />
            </div>
          </div>

          <label className="block sm:col-span-2">
            <FieldLabel field="dependencies" required>
              Dependencies & Blockers
            </FieldLabel>
            <textarea
              name="dependencies"
              required
              rows={2}
              value={dependencies}
              onChange={(e) => setDependencies(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Depends on CMS API access; blocked until redirects are fixed (WS-1098)."
            />
          </label>

          <label className="block sm:col-span-2">
            <FieldLabel field="risks" required>
              Risks & &lsquo;Do Nothing&rsquo; Scenario
            </FieldLabel>
            <textarea
              name="risks"
              required
              rows={2}
              value={risks}
              onChange={(e) => setRisks(e.target.value)}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Risk: partner template variance. Do nothing: continue manual setup."
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          <button
            type="submit"
            formAction={saveAction}
            disabled={pending}
            className="group relative inline-flex items-center gap-2 overflow-hidden border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-foreground/[0.06] transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <Save className="relative size-3.5" />
            <span className="relative">{savePending ? "Saving…" : "Save Draft"}</span>
          </button>
          <button
            type="submit"
            formAction={submitAction}
            disabled={pending}
            className="group relative inline-flex items-center gap-2 overflow-hidden border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:opacity-50"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <SendHorizonal className="relative size-3.5" />
            <span className="relative">{submitPending ? "Submitting…" : "Submit for Approval"}</span>
          </button>
        </div>
      </div>
    </>
  );
}

function ValidationReadOnly({ data }: { data: ValidationData | null }) {
  const partyLabel = PARTIES.find(
    (p) => p.id === data?.leadProductionParty,
  )?.label;

  const fields: {
    field: keyof typeof FIELD_HELP;
    label: string;
    value: string | undefined;
  }[] = [
    { field: "businessValue", label: "Business Value", value: data?.businessValue },
    {
      field: "solutionDirection",
      label: "Solution Direction",
      value: data?.solutionDirection,
    },
    { field: "tShirtSize", label: "Investment Estimate", value: data?.tShirtSize },
    { field: "priority", label: "Priority", value: data?.priority },
    {
      field: "leadProductionParty",
      label: "Lead Production Party",
      value: partyLabel ?? data?.leadProductionParty,
    },
    {
      field: "dependencies",
      label: "Dependencies & Blockers",
      value: data?.dependencies,
    },
    { field: "risks", label: "Risks & 'Do Nothing'", value: data?.risks },
  ];

  return (
    <div className="grid gap-px bg-border sm:grid-cols-2">
      {fields.map((f) => {
        const Icon = FIELD_ICONS[f.field];
        return (
          <div key={f.label} className="bg-surface p-4">
            <div className="flex items-center gap-2 text-muted">
              <Icon className="size-3.5 shrink-0" />
              <p className="font-display text-[10px] font-bold uppercase tracking-wide">
                {f.label}
              </p>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
              {f.value || "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
