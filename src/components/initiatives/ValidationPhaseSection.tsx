"use client";

import {
  useActionState,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Save,
  SendHorizonal,
  AlertCircle,
  Check,
  Info,
  FlaskConical,
  BarChart3,
  Compass,
  Shirt,
  Flag,
  Building2,
  Link2,
  PenLine,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import {
  saveValidationData,
  submitValidationForApproval,
  type ValidationResult,
} from "@/app/(workspace)/workstreams/[id]/actions";
import { inputClass } from "@/lib/form-styles";
import {
  BUSINESS_VALUE_TYPES,
  IMPACT_DEFAULT,
  IMPACT_MAX,
  IMPACT_MIN,
  isBusinessValueData,
  parseImpactScore,
  type BusinessValueType,
  type ValidationData,
} from "@/lib/validation-data";
import { PARTIES } from "@/data/workflow";
import type { ValidationDecision } from "./ValidationApprovalPanel";

const initial: ValidationResult = {};

const TSHIRT_OPTIONS = [
  { value: "S", label: "S", hint: "<40h" },
  { value: "M", label: "M", hint: "40–80h" },
  { value: "L", label: "L", hint: "80–160h" },
  { value: "XL", label: "XL", hint: "160h+" },
];

const PRIORITY_OPTIONS = [
  { value: "Now", label: "NOW", hint: "High priority" },
  { value: "Near", label: "NEAR", hint: "Medium priority" },
  { value: "Later", label: "LATER", hint: "Lower priority" },
  { value: "Backlog", label: "BACKLOG", hint: "On the radar" },
];

const OTHER_PARTY_VALUE = "other";

const KNOWN_LEAD_PARTIES = PARTIES.filter((p) => p.id !== "as");

const PARTY_LOGOS: Record<string, string> = {
  adsomnia: "/logos/adsomnia.png",
  btr: "/logos/bendingtherules.jpeg",
  hn: "/logos/harlemnext.webp",
  bbb: "/logos/blablabuild.png",
};

const PARTY_BUTTONS: { value: string; label: string; logo?: string }[] = [
  ...KNOWN_LEAD_PARTIES.map((p) => ({
    value: p.id,
    label: p.label,
    logo: PARTY_LOGOS[p.id],
  })),
  { value: OTHER_PARTY_VALUE, label: "Other…" },
];

const KNOWN_LEAD_PARTY_IDS = new Set<string>(
  KNOWN_LEAD_PARTIES.map((p) => p.id),
);

function resolveLeadPartyState(stored: string | undefined | null): {
  select: string;
  other: string;
} {
  if (!stored) return { select: "", other: "" };
  // Legacy "Adsomnia Internal" maps to Adsomnia
  if (stored === "as") return { select: "adsomnia", other: "" };
  if (KNOWN_LEAD_PARTY_IDS.has(stored)) {
    return { select: stored, other: "" };
  }
  return { select: OTHER_PARTY_VALUE, other: stored };
}

const IS_DEV = process.env.NODE_ENV === "development";

const EMPTY_IMPACTS: Record<BusinessValueType, number | null> = {
  speed: null,
  "cost-efficiency": null,
  growth: null,
};

const DEV_PREFILL = {
  businessValueTypes: ["speed", "cost-efficiency"] as BusinessValueType[],
  businessValueImpacts: {
    speed: 8,
    "cost-efficiency": 6,
    growth: null,
  } satisfies Record<BusinessValueType, number | null>,
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

function resolveBusinessValueState(stored: ValidationData["businessValue"]): {
  types: BusinessValueType[];
  impacts: Record<BusinessValueType, number | null>;
} {
  if (!stored || typeof stored === "string" || !isBusinessValueData(stored)) {
    return { types: [], impacts: { ...EMPTY_IMPACTS } };
  }
  const impacts = { ...EMPTY_IMPACTS };
  for (const type of stored.types) {
    impacts[type] =
      parseImpactScore(stored.expectations[type]) ?? IMPACT_DEFAULT;
  }
  return { types: stored.types, impacts };
}

/** Help text for validation form fields. */
const FIELD_HELP: Record<string, string> = {
  businessValue:
    "Select where value is created — Speed, Cost Efficiency, and/or Growth — then rate expected impact from 1 (low) to 10 (high) for each.",
  solutionDirection:
    "Outline the technical approach and architecture. Who owns the build? What systems are involved?",
  tShirtSize:
    "Estimate effort: S (<40h), M (40–80h), L (80–160h), XL (160h+). Consider complexity, unknowns, and team capacity.",
  priority:
    "NOW = urgent/blocking. NEAR = next up. LATER = lower priority. BACKLOG = on the radar for now.",
  leadProductionParty:
    "Which party will most likely lead Production for this initiative? Choose Other if it is someone outside the listed parties.",
  dependencies:
    "List upstream blockers, required access, or parallel workstreams. Include ticket refs if known.",
  risks:
    "Call out the main risks if we proceed — technical, operational, or commercial.",
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

function impactLabel(score: number): string {
  if (score <= 2) return "Minimal";
  if (score <= 4) return "Low";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "High";
  return "Critical";
}

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

function ImpactSlider({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const pct = ((value - IMPACT_MIN) / (IMPACT_MAX - IMPACT_MIN)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
          Impact — {label}
          <Check className="animate-check-pop size-3.5 shrink-0 text-success" />
        </span>
        <span className="flex items-baseline gap-2">
          <span className="font-display text-sm font-bold tabular-nums text-foreground">
            {value}
            <span className="text-muted">/10</span>
          </span>
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            {impactLabel(value)}
          </span>
        </span>
      </div>
      <div className="relative pt-1">
        <input
          type="range"
          name={name}
          min={IMPACT_MIN}
          max={IMPACT_MAX}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} impact score`}
          className="impact-slider w-full"
          style={{ "--impact-pct": `${pct}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}

function ChoiceButtons({
  name,
  value,
  onChange,
  options,
  required,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string; hint?: string }[];
  required?: boolean;
}) {
  return (
    <div className="mt-1">
      <input
        type="hidden"
        name={name}
        value={value}
        required={required && !value}
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(selected ? "" : option.value)}
              aria-pressed={selected}
              title={option.hint}
              className={[
                "border px-3 py-2.5 text-left transition-colors",
                selected
                  ? "border-foreground bg-foreground/[0.06] text-foreground"
                  : "border-border text-muted hover:border-foreground hover:text-foreground",
              ].join(" ")}
            >
              <span className="font-display flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide">
                {selected && (
                  <Check className="animate-check-pop size-3.5 shrink-0" />
                )}
                {option.label}
              </span>
              {option.hint && (
                <span className="mt-0.5 block text-[10px] normal-case tracking-normal text-muted/70">
                  {option.hint}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({
  field,
  children,
  required = false,
  complete = false,
}: {
  field: keyof typeof FIELD_HELP;
  children: ReactNode;
  required?: boolean;
  /** Shows a green check when the field is filled in. */
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
  /** Leadership feedback shown above the form when the case was bounced back. */
  feedback?: ValidationDecision | null;
  /** True when the case is already submitted and the creator is updating it. */
  resubmitting?: boolean;
};

export function ValidationPhaseSection({
  initiativeId,
  data,
  readOnly = false,
  feedback = null,
  resubmitting = false,
}: Props) {
  const boundSave = saveValidationData.bind(null, initiativeId);
  const boundSubmit = submitValidationForApproval.bind(null, initiativeId);

  const [saveState, saveAction, savePending] = useActionState(boundSave, initial);
  const [submitState, submitAction, submitPending] = useActionState(boundSubmit, initial);

  const pending = savePending || submitPending;
  const error = saveState.error || submitState.error;
  const saved = saveState.success;
  const [submissionUpdated, setSubmissionUpdated] = useState(false);

  useEffect(() => {
    if (submitState.success && resubmitting) {
      setSubmissionUpdated(true);
    }
  }, [submitState.success, resubmitting]);

  function markFormDirty() {
    if (submissionUpdated) setSubmissionUpdated(false);
  }

  const [tShirtSize, setTShirtSize] = useState(data?.tShirtSize ?? "");
  const [priority, setPriority] = useState(data?.priority ?? "");
  const initialLead = resolveLeadPartyState(data?.leadProductionParty);
  const [leadPartySelect, setLeadPartySelect] = useState(initialLead.select);
  const [leadPartyOther, setLeadPartyOther] = useState(initialLead.other);
  const initialBusinessValue = resolveBusinessValueState(data?.businessValue);
  const [businessValueTypes, setBusinessValueTypes] = useState<
    BusinessValueType[]
  >(initialBusinessValue.types);
  const [businessValueImpacts, setBusinessValueImpacts] = useState(
    initialBusinessValue.impacts,
  );
  const [solutionDirection, setSolutionDirection] = useState(
    data?.solutionDirection ?? "",
  );
  const [dependencies, setDependencies] = useState(data?.dependencies ?? "");
  const [risks, setRisks] = useState(data?.risks ?? "");

  const isOtherLead = leadPartySelect === OTHER_PARTY_VALUE;

  const businessValueComplete =
    businessValueTypes.length > 0 &&
    businessValueTypes.every((type) => businessValueImpacts[type] !== null);
  const leadPartyComplete = isOtherLead
    ? leadPartyOther.trim().length > 0
    : leadPartySelect.length > 0;

  function toggleBusinessValueType(type: BusinessValueType) {
    markFormDirty();
    setBusinessValueTypes((current) => {
      if (current.includes(type)) {
        setBusinessValueImpacts((impacts) => ({ ...impacts, [type]: null }));
        return current.filter((item) => item !== type);
      }
      setBusinessValueImpacts((impacts) => ({
        ...impacts,
        [type]: impacts[type] ?? IMPACT_DEFAULT,
      }));
      return [...current, type];
    });
  }

  function applyDevPrefill() {
    markFormDirty();
    setBusinessValueTypes(DEV_PREFILL.businessValueTypes);
    setBusinessValueImpacts({ ...DEV_PREFILL.businessValueImpacts });
    setSolutionDirection(DEV_PREFILL.solutionDirection);
    setTShirtSize(DEV_PREFILL.tShirtSize);
    setPriority(DEV_PREFILL.priority);
    setLeadPartySelect(DEV_PREFILL.leadProductionParty);
    setLeadPartyOther("");
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
        {feedback?.decision === "feedback" && (
          <div className="border border-hn/50 bg-hn/10 px-3 py-2.5">
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-hn">
              Feedback from leadership — revise & resubmit
            </p>
            {feedback.comment && (
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                “{feedback.comment}” — {feedback.approverName}
              </p>
            )}
          </div>
        )}
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
          <div className="space-y-3 py-5 first:pt-0 last:pb-0">
            <FieldLabel field="businessValue" required complete={businessValueComplete}>
              Quantifiable Business Value
            </FieldLabel>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_VALUE_TYPES.map((type) => {
                const selected = businessValueTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => toggleBusinessValueType(type.id)}
                    aria-pressed={selected}
                    className={[
                      "flex items-center gap-1.5 border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                      selected
                        ? "border-foreground bg-foreground/[0.06] text-foreground"
                        : "border-border text-muted hover:border-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {selected && (
                      <Check className="animate-check-pop size-3.5 shrink-0" />
                    )}
                    {type.label}
                  </button>
                );
              })}
            </div>
            {businessValueTypes.map((type) => (
              <input
                key={`hidden-${type}`}
                type="hidden"
                name="businessValueTypes"
                value={type}
              />
            ))}
            {businessValueTypes.length === 0 ? (
              <p className="text-xs text-muted">
                Select one or more value types, then rate impact from 1 to 10 for each.
              </p>
            ) : (
              <div className="space-y-4">
                {businessValueTypes.map((type) => {
                  const label =
                    BUSINESS_VALUE_TYPES.find((item) => item.id === type)
                      ?.label ?? type;
                  const score = businessValueImpacts[type] ?? IMPACT_DEFAULT;
                  return (
                    <ImpactSlider
                      key={type}
                      name={`businessValueExpectation_${type}`}
                      label={label}
                      value={score}
                      onChange={(next) => {
                        markFormDirty();
                        setBusinessValueImpacts((current) => ({
                          ...current,
                          [type]: next,
                        }));
                      }}
                    />
                  );
                })}
              </div>
            )}

            <div className="border-t border-border pt-4">
              <FieldLabel
                field="leadProductionParty"
                required
                complete={leadPartyComplete}
              >
                Lead Production Party
              </FieldLabel>
              <div className="mt-1 space-y-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {PARTY_BUTTONS.map((party) => {
                    const selected = leadPartySelect === party.value;
                    return (
                      <button
                        key={party.value}
                        type="button"
                        onClick={() => {
                          markFormDirty();
                          setLeadPartySelect(selected ? "" : party.value);
                        }}
                        aria-pressed={selected}
                        title={party.label}
                        className={[
                          "flex flex-col items-center justify-center gap-2 border px-3 py-3 transition-colors",
                          selected
                            ? "border-foreground bg-foreground/[0.06] text-foreground"
                            : "border-border text-muted hover:border-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        {party.logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={party.logo}
                            alt={party.label}
                            className="h-6 w-auto max-w-full object-contain"
                          />
                        ) : (
                          <span className="flex h-6 items-center text-muted">
                            <PenLine className="size-4" />
                          </span>
                        )}
                        <span className="font-display flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide">
                          {selected && (
                            <Check className="animate-check-pop size-3 shrink-0" />
                          )}
                          {party.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!isOtherLead && (
                  <input
                    type="hidden"
                    name="leadProductionParty"
                    value={leadPartySelect}
                    required={!leadPartySelect}
                  />
                )}
                {isOtherLead && (
                  <input
                    type="text"
                    name="leadProductionParty"
                    required
                    value={leadPartyOther}
                    onChange={(e) => {
                      markFormDirty();
                      setLeadPartyOther(e.target.value);
                    }}
                    className={inputClass}
                    placeholder="Enter the lead party or team name…"
                  />
                )}
              </div>
            </div>
          </div>

          <label className="block py-5 first:pt-0 last:pb-0">
            <FieldLabel
              field="solutionDirection"
              required
              complete={solutionDirection.trim().length > 0}
            >
              Global Solution Direction & Architecture
            </FieldLabel>
            <textarea
              name="solutionDirection"
              required
              rows={3}
              value={solutionDirection}
              onChange={(e) => {
                markFormDirty();
                setSolutionDirection(e.target.value);
              }}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Shared config service + templates; push via CMS API; HN owns build."
            />
          </label>

          <div className="py-5 first:pt-0 last:pb-0">
            <FieldLabel
              field="tShirtSize"
              required
              complete={tShirtSize.length > 0}
            >
              Investment Estimate (T-Shirt)
            </FieldLabel>
            <ChoiceButtons
              name="tShirtSize"
              value={tShirtSize}
              onChange={(value) => {
                markFormDirty();
                setTShirtSize(value);
              }}
              options={TSHIRT_OPTIONS}
              required
            />
          </div>

          <div className="py-5 first:pt-0 last:pb-0">
            <FieldLabel field="priority" required complete={priority.length > 0}>
              Priority
            </FieldLabel>
            <ChoiceButtons
              name="priority"
              value={priority}
              onChange={(value) => {
                markFormDirty();
                setPriority(value);
              }}
              options={PRIORITY_OPTIONS}
              required
            />
          </div>

          <label className="block py-5 first:pt-0 last:pb-0">
            <FieldLabel
              field="dependencies"
              required
              complete={dependencies.trim().length > 0}
            >
              Dependencies & Blockers
            </FieldLabel>
            <textarea
              name="dependencies"
              required
              rows={2}
              value={dependencies}
              onChange={(e) => {
                markFormDirty();
                setDependencies(e.target.value);
              }}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Depends on CMS API access; blocked until redirects are fixed (WS-1098)."
            />
          </label>

          <label className="block py-5 first:pt-0 last:pb-0">
            <FieldLabel field="risks" required complete={risks.trim().length > 0}>
              Risk
            </FieldLabel>
            <textarea
              name="risks"
              required
              rows={2}
              value={risks}
              onChange={(e) => {
                markFormDirty();
                setRisks(e.target.value);
              }}
              className={`${inputClass} mt-1`}
              placeholder="e.g. Partner template variance breaks auto-deployment."
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          {!resubmitting && (
            <button
              type="submit"
              formAction={saveAction}
              formNoValidate
              disabled={pending}
              className="group relative inline-flex items-center gap-2 overflow-hidden border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-foreground/[0.06] transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <Save className="relative size-3.5" />
              <span className="relative">{savePending ? "Saving…" : "Save Draft"}</span>
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
                    : "Submit for Approval"}
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function ReadOnlyChip({
  value,
  hint,
}: {
  value: string;
  hint?: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-2 border border-foreground/40 bg-foreground/[0.06] px-2.5 py-1">
      <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
        {value}
      </span>
      {hint && <span className="text-[10px] text-muted">{hint}</span>}
    </span>
  );
}

function ValidationReadOnly({ data }: { data: ValidationData | null }) {
  const storedParty = data?.leadProductionParty;
  const partyId = storedParty === "as" ? "adsomnia" : storedParty;
  const knownParty = KNOWN_LEAD_PARTIES.find((p) => p.id === partyId);
  const partyLabel =
    storedParty === "as" ? "Adsomnia" : knownParty?.label;
  const partyLogo = partyId ? PARTY_LOGOS[partyId] : undefined;

  const tShirtHint = TSHIRT_OPTIONS.find(
    (o) => o.value === data?.tShirtSize,
  )?.hint;
  const priorityHint = PRIORITY_OPTIONS.find(
    (o) => o.value === data?.priority,
  )?.hint;

  const businessValue = data?.businessValue;
  const structuredBusinessValue = isBusinessValueData(businessValue)
    ? businessValue
    : null;
  const legacyBusinessValue =
    typeof businessValue === "string" ? businessValue : null;

  const fields: {
    field: keyof typeof FIELD_HELP;
    label: string;
    value: string | undefined;
  }[] = [
    {
      field: "solutionDirection",
      label: "Solution Direction",
      value: data?.solutionDirection,
    },
    {
      field: "dependencies",
      label: "Dependencies & Blockers",
      value: data?.dependencies,
    },
    { field: "risks", label: "Risk", value: data?.risks },
  ];

  return (
    <div className="grid gap-px bg-border sm:grid-cols-2">
      <div className="bg-surface p-4 sm:col-span-2">
        <div className="mb-2 flex items-center gap-2 text-muted">
          <BarChart3 className="size-3.5 shrink-0" />
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Business Value
          </p>
        </div>
        {structuredBusinessValue && structuredBusinessValue.types.length > 0 ? (
          <div className="space-y-3">
            {structuredBusinessValue.types.map((type) => {
              const label =
                BUSINESS_VALUE_TYPES.find((item) => item.id === type)?.label ??
                type;
              const score = parseImpactScore(
                structuredBusinessValue.expectations[type],
              );
              const pct =
                score !== null
                  ? ((score - IMPACT_MIN) / (IMPACT_MAX - IMPACT_MIN)) * 100
                  : 0;
              return (
                <div key={type}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="border border-border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
                      {label}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-xs font-bold tabular-nums text-foreground">
                        {score !== null ? (
                          <>
                            {score}
                            <span className="text-muted">/10</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                      {score !== null && (
                        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                          {impactLabel(score)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-border">
                    <div
                      className="h-full bg-muted transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/90">
            {legacyBusinessValue || "—"}
          </p>
        )}
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Building2 className="size-3.5 shrink-0" />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Lead Production Party
            </p>
          </div>
          {(partyLabel ?? data?.leadProductionParty) ? (
            <span className="inline-flex items-center gap-2 border border-foreground/40 bg-foreground/[0.06] px-2.5 py-1.5">
              {partyLogo && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={partyLogo}
                  alt=""
                  className="h-4 w-auto object-contain"
                />
              )}
              <span className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                {(partyLabel ?? data?.leadProductionParty)!}
              </span>
            </span>
          ) : (
            <p className="text-sm leading-relaxed text-foreground/90">—</p>
          )}
        </div>
      </div>
      <div className="bg-surface p-4">
        <div className="flex items-center gap-2 text-muted">
          <Shirt className="size-3.5 shrink-0" />
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Investment Estimate
          </p>
        </div>
        <div className="mt-1.5">
          {data?.tShirtSize ? (
            <ReadOnlyChip value={data.tShirtSize} hint={tShirtHint} />
          ) : (
            <p className="text-sm text-foreground/90">—</p>
          )}
        </div>
      </div>
      <div className="bg-surface p-4">
        <div className="flex items-center gap-2 text-muted">
          <Flag className="size-3.5 shrink-0" />
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Priority
          </p>
        </div>
        <div className="mt-1.5">
          {data?.priority ? (
            <ReadOnlyChip value={data.priority.toUpperCase()} hint={priorityHint} />
          ) : (
            <p className="text-sm text-foreground/90">—</p>
          )}
        </div>
      </div>
      {fields.map((f) => {
        const Icon = FIELD_ICONS[f.field];
        return (
          <div
            key={f.label}
            className={`bg-surface p-4 ${
              f.field === "solutionDirection" ? "sm:col-span-2" : ""
            }`}
          >
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
