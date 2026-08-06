"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { STAGES } from "@/data/workflow";
import { WorkspaceChip } from "@/components/WorkspaceChip";

const IDEA_STAGE = STAGES.find((s) => s.id === "idea")!;

const FORM_FIELDS = [
  {
    id: "title",
    label: "Title & Short Description",
    hint: "State the core idea in 1–2 plain sentences (what are we building or changing?).",
    type: "text" as const,
    required: true,
  },
  {
    id: "problem",
    label: "Problem Statement or Opportunity",
    hint: "Name the concrete problem this solves, or the opportunity Adsomnia is leaving on the table if we do nothing.",
    type: "textarea" as const,
    required: true,
  },
  {
    id: "impact",
    label: "Expected Impact / Value (Hypothesis)",
    hint: "Describe the intended outcome and how you would recognise success (revenue, efficiency, data quality, churn, etc.).",
    type: "textarea" as const,
    required: true,
  },
  {
    id: "audience",
    label: "Target Audience / Stakeholder",
    hint: "Who is this for, and who is affected (internal team, end user, business unit)?",
    type: "text" as const,
    required: true,
  },
  {
    id: "submitter",
    label: "Submitter",
    hint: "Who is proposing this initiative? Full name (and role if helpful).",
    type: "text" as const,
    required: true,
  },
  {
    id: "sponsor",
    label: "Sponsor",
    hint: "Which decision maker (Sietse / Jasper / Oleg) sponsors this into the pipeline?",
    type: "select" as const,
    options: ["Sietse", "Jasper", "Oleg", "Coen"],
    required: true,
  },
];

export function IdeaFormView() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full border border-border bg-surface p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-success" />
          <h2 className="font-display mt-4 text-2xl font-extrabold uppercase tracking-tight">
            Initiative Registered
          </h2>
          <p className="mt-3 text-sm text-muted">
            Your idea has been captured as ticket{" "}
            <span className="font-display font-bold text-foreground">WS-1102</span>{" "}
            in the <WorkspaceChip />. It will enter{" "}
            <span className="font-medium text-foreground">Stage 1: Idea</span>{" "}
            and await Validation enrichment.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/initiatives/WS-1042"
              className="inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background"
            >
              View Sample Initiative
              <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-foreground hover:border-border-strong"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Stage context */}
      <div className="mb-8 border border-border bg-surface-elevated p-4">
        <div className="flex gap-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" />
          <div className="text-xs leading-relaxed text-muted">
            <p className="font-display font-bold uppercase tracking-wide text-foreground">
              What happens next
            </p>
            <p className="mt-1">
              {IDEA_STAGE.outputs[0].replace(
                "Adsomnia Workspace System",
                "",
              ).trim() || IDEA_STAGE.outputs[0]}
            </p>
            <p className="mt-2">
              Owner: <span className="text-foreground">{IDEA_STAGE.owner}</span>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {FORM_FIELDS.map((field) => (
          <div key={field.id}>
            <label
              htmlFor={field.id}
              className="font-display block text-xs font-bold uppercase tracking-wide text-foreground"
            >
              {field.label}
              {field.required && (
                <span className="ml-1 text-btr">*</span>
              )}
            </label>
            <p className="mt-1 text-xs text-muted">{field.hint}</p>
            <div className="mt-2">
              {field.type === "textarea" ? (
                <textarea
                  id={field.id}
                  name={field.id}
                  required={field.required}
                  rows={3}
                  value={formData[field.id] ?? ""}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, [field.id]: e.target.value }))
                  }
                  className="w-full resize-y border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
                  placeholder={`Enter ${field.label.toLowerCase()}…`}
                />
              ) : field.type === "select" ? (
                <select
                  id={field.id}
                  name={field.id}
                  required={field.required}
                  value={formData[field.id] ?? ""}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, [field.id]: e.target.value }))
                  }
                  className="w-full border border-border bg-surface px-3 py-2.5 text-sm text-foreground focus:border-border-strong focus:outline-none"
                >
                  <option value="">Select sponsor…</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={field.id}
                  name={field.id}
                  type="text"
                  required={field.required}
                  value={formData[field.id] ?? ""}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, [field.id]: e.target.value }))
                  }
                  className="w-full border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
                  placeholder={`Enter ${field.label.toLowerCase()}…`}
                />
              )}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            Fast-Track requests (&lt; 4 hours) can be flagged after submission.
          </p>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-6 py-3 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
          >
            Register Initiative
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
