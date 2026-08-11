"use client";

import { useActionState, useState } from "react";
import { Save, SendHorizonal, AlertCircle } from "lucide-react";
import {
  saveValidationData,
  submitValidationForApproval,
  type ValidationResult,
} from "@/app/(workspace)/initiatives/[id]/actions";
import { inputClass } from "@/lib/form-styles";
import { Select } from "@/components/ui/Select";
import type { ValidationData } from "@/lib/queries";

const initial: ValidationResult = {};

const TSHIRT_OPTIONS = [
  { value: "S", label: "S — Small" },
  { value: "M", label: "M — Medium" },
  { value: "L", label: "L — Large" },
  { value: "XL", label: "XL — Extra Large" },
];

const PRIORITY_OPTIONS = [
  { value: "Now", label: "Now" },
  { value: "Next", label: "Next" },
  { value: "Later", label: "Later" },
  { value: "Rollout", label: "Rollout" },
];

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

  if (readOnly) {
    return <ValidationReadOnly data={data} />;
  }

  return (
    <div className="space-y-4">
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
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Quantifiable Business Value<span className="ml-1 text-btr">*</span>
          </span>
          <textarea
            name="businessValue"
            required
            rows={3}
            defaultValue={data?.businessValue ?? ""}
            className={`${inputClass} mt-1`}
            placeholder="e.g. KPI: hours/week on pixel setup. Baseline: ~10h. Target: ~6h (−40%)."
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Global Solution Direction & Architecture<span className="ml-1 text-btr">*</span>
          </span>
          <textarea
            name="solutionDirection"
            required
            rows={3}
            defaultValue={data?.solutionDirection ?? ""}
            className={`${inputClass} mt-1`}
            placeholder="e.g. Shared config service + templates; push via CMS API; HN owns build."
          />
        </label>

        <div>
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Investment Estimate (T-Shirt)<span className="ml-1 text-btr">*</span>
          </span>
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

        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            T-Shirt Rationale<span className="ml-1 text-btr">*</span>
          </span>
          <textarea
            name="tShirtRationale"
            required
            rows={2}
            defaultValue={data?.tShirtRationale ?? ""}
            className={`${inputClass} mt-1`}
            placeholder="e.g. L — touches multiple partner templates; limited unknowns."
          />
        </label>

        <div>
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Strategic Fit & Priority<span className="ml-1 text-btr">*</span>
          </span>
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

        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Priority Rationale<span className="ml-1 text-btr">*</span>
          </span>
          <textarea
            name="priorityRationale"
            required
            rows={2}
            defaultValue={data?.priorityRationale ?? ""}
            className={`${inputClass} mt-1`}
            placeholder="e.g. Now — blocks reliable retargeting for DE/NL campaigns starting Q3."
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Dependencies & Blockers<span className="ml-1 text-btr">*</span>
          </span>
          <textarea
            name="dependencies"
            required
            rows={2}
            defaultValue={data?.dependencies ?? ""}
            className={`${inputClass} mt-1`}
            placeholder="e.g. Depends on CMS API access; blocked until redirects are fixed (WS-1098)."
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Risks & &lsquo;Do Nothing&rsquo; Scenario<span className="ml-1 text-btr">*</span>
          </span>
          <textarea
            name="risks"
            required
            rows={2}
            defaultValue={data?.risks ?? ""}
            className={`${inputClass} mt-1`}
            placeholder="e.g. Risk: partner template variance. Do nothing: continue manual setup."
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="submit"
          formAction={saveAction}
          disabled={pending}
          className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          <Save className="size-3.5" />
          {savePending ? "Saving…" : "Save Draft"}
        </button>
        <button
          type="submit"
          formAction={submitAction}
          disabled={pending}
          className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity disabled:opacity-50"
        >
          <SendHorizonal className="size-3.5" />
          {submitPending ? "Submitting…" : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
}

function ValidationReadOnly({ data }: { data: ValidationData | null }) {
  const fields: { label: string; value: string | undefined }[] = [
    { label: "Business Value", value: data?.businessValue },
    { label: "Solution Direction", value: data?.solutionDirection },
    { label: "Investment Estimate", value: data?.tShirtSize },
    { label: "T-Shirt Rationale", value: data?.tShirtRationale },
    { label: "Priority", value: data?.priority },
    { label: "Priority Rationale", value: data?.priorityRationale },
    { label: "Dependencies & Blockers", value: data?.dependencies },
    { label: "Risks & 'Do Nothing'", value: data?.risks },
  ];

  return (
    <div className="grid gap-px bg-border sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.label} className="bg-surface p-4">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            {f.label}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
            {f.value || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}
