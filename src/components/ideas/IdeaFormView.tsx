"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle, Info } from "lucide-react";
import { STAGES } from "@/data/workflow";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import {
  submitIdea,
  type SubmitIdeaResult,
} from "@/app/(workspace)/ideas/new/actions";

const IDEA_STAGE = STAGES.find((s) => s.id === "idea")!;

const SPONSOR_OPTIONS = ["Sietse", "Jasper", "Oleg", "Coen"];

const FORM_FIELDS = [
  {
    name: "title",
    label: "Title & Short Description",
    hint: "State the core idea in 1–2 plain sentences (what are we building or changing?).",
    type: "text" as const,
  },
  {
    name: "problemStatement",
    label: "Problem Statement or Opportunity",
    hint: "Name the concrete problem this solves, or the opportunity Adsomnia is leaving on the table if we do nothing.",
    type: "textarea" as const,
  },
  {
    name: "expectedImpact",
    label: "Expected Impact / Value (Hypothesis)",
    hint: "Describe the intended outcome and how you would recognise success (revenue, efficiency, data quality, churn, etc.).",
    type: "textarea" as const,
  },
  {
    name: "targetAudience",
    label: "Target Audience / Stakeholder",
    hint: "Who is this for, and who is affected (internal team, end user, business unit)?",
    type: "text" as const,
  },
];

const inputClass =
  "w-full border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none";

const initial: SubmitIdeaResult = {};

export function IdeaFormView({ submitterName }: { submitterName: string }) {
  const [state, formAction, pending] = useActionState(submitIdea, initial);

  return (
    <div className="mx-auto w-full max-w-[800px] flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Dashboard
      </Link>

      <header className="mb-8">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
          Stage 1 · {IDEA_STAGE.name}
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
          Submit an Idea
        </h1>
        <p className="mt-3 max-w-lg text-sm text-muted">
          Capture the minimal intake for a new initiative. On submit, a ticket is
          created in the <WorkspaceChip /> and enters the Production Framework
          at Idea stage.
        </p>
      </header>

      <div className="mb-8 border border-border bg-surface-elevated p-4">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" />
          <div className="text-xs leading-relaxed text-muted">
            <p className="font-display font-bold uppercase tracking-wide text-foreground">
              What happens next
            </p>
            <p className="mt-1">
              Your idea is registered as a ticket in the Adsomnia Workspace
              System. It will await approval from Sietse or Oleg before
              advancing to Validation.
            </p>
            <p className="mt-2">
              Owner: <span className="text-foreground">{IDEA_STAGE.owner}</span>
            </p>
          </div>
        </div>
      </div>

      <form action={formAction} className="space-y-6">
        {state.error && (
          <div className="flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2.5 text-sm text-btr">
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </div>
        )}

        {FORM_FIELDS.map((field) => (
          <div key={field.name}>
            <label
              htmlFor={field.name}
              className="font-display block text-xs font-bold uppercase tracking-wide text-foreground"
            >
              {field.label}
              <span className="ml-1 text-btr">*</span>
            </label>
            <p className="mt-1 text-xs text-muted">{field.hint}</p>
            <div className="mt-2">
              {field.type === "textarea" ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  required
                  rows={3}
                  className={inputClass}
                  placeholder={`Enter ${field.label.toLowerCase()}…`}
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type="text"
                  required
                  className={inputClass}
                  placeholder={`Enter ${field.label.toLowerCase()}…`}
                />
              )}
            </div>
          </div>
        ))}

        {/* Submitter (auto-filled from session) */}
        <div>
          <label className="font-display block text-xs font-bold uppercase tracking-wide text-foreground">
            Submitter
          </label>
          <p className="mt-1 text-xs text-muted">
            Auto-assigned from your login session.
          </p>
          <div className="mt-2">
            <div className="w-full border border-border bg-surface-elevated/50 px-3 py-2.5 text-sm text-muted">
              {submitterName}
            </div>
          </div>
        </div>

        {/* Sponsor */}
        <div>
          <label
            htmlFor="sponsor"
            className="font-display block text-xs font-bold uppercase tracking-wide text-foreground"
          >
            Sponsor
            <span className="ml-1 text-btr">*</span>
          </label>
          <p className="mt-1 text-xs text-muted">
            Which decision maker sponsors this into the pipeline?
          </p>
          <div className="mt-2">
            <select
              id="sponsor"
              name="sponsor"
              required
              className={inputClass}
            >
              <option value="">Select sponsor…</option>
              {SPONSOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Fast-Track requests (&lt; 4 hours) can be flagged after submission.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-6 py-3 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Submitting…" : "Register Initiative"}
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
