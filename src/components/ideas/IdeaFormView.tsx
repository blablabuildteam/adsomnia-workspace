"use client";

import { useActionState, useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertCircle,
  Zap,
  AlertTriangle,
  Loader2,
  Sparkles,
  FlaskConical,
} from "lucide-react";
import { STAGES } from "@/data/workflow";
import { PipelineStrip } from "@/components/pipeline/PipelineStrip";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import {
  submitIdea,
  type SubmitIdeaResult,
} from "@/app/(workspace)/ideas/new/actions";
import {
  analyzeIdeaSubmission,
  type AnalyzeIdeaResult,
} from "@/app/(workspace)/ideas/new/analyze";
import { Select } from "@/components/ui/Select";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { inputClass, readOnlyFieldClass } from "@/lib/form-styles";

const IDEA_STAGE = STAGES.find((s) => s.id === "idea")!;

const SPONSOR_OPTIONS = ["Sietse", "Jasper", "Oleg", "Coen"];

const IS_DEV = process.env.NODE_ENV === "development";

const FORM_FIELDS = [
  {
    name: "title",
    label: "Title & Short Description",
    hint: "State the core initiative in 1–2 plain sentences (what are we building or changing?).",
    type: "text" as const,
    placeholder:
      "e.g. Automate retargeting pixel deployment across affiliate landing pages.",
  },
  {
    name: "problemStatement",
    label: "Problem Statement",
    hint: "Name the concrete problem this solves — the pain, gap, or risk if we do nothing.",
    type: "textarea" as const,
    placeholder:
      "e.g. Manual pixel placement causes delays and inconsistent tracking across partner sites.",
  },
  {
    name: "opportunitySolution",
    label: "Opportunity / Solution",
    hint: "Describe the opportunity or proposed solution direction in plain terms (what should we build or change?).",
    type: "textarea" as const,
    placeholder:
      "e.g. A self-serve pixel deployment tool that partners can configure without Affil Ops support.",
  },
  {
    name: "expectedImpact",
    label: "Expected Impact / Value (Hypothesis)",
    hint: "Describe the intended outcome and how you would recognise success (revenue, efficiency, data quality, churn, etc.).",
    type: "textarea" as const,
    placeholder:
      "e.g. ~40% less setup time for pixels; fewer tracking gaps in retargeting data.",
  },
  {
    name: "targetAudience",
    label: "Target Audience / Stakeholder",
    hint: "Who is this for, and who is affected (internal team, end user, business unit)?",
    type: "text" as const,
    placeholder: "e.g. Affiliate Ops & Media Buying",
  },
];

const NEXT_STEPS = [
  {
    title: "Ticket created",
    text: "Registered in the Adsomnia Workspace System at Initiative stage.",
  },
  {
    title: "Approval review",
    text: "Leadership will review the submission and decide on advancement.",
  },
  {
    title: "Validation",
    text: "Approved initiatives advance to Stage 2 and become a business case.",
  },
];

const initial: SubmitIdeaResult = {};

function fieldNumber(index: number): string {
  return String(index + 1).padStart(2, "0");
}

/** Form frame with a 1px border that traces green clockwise from the top-left as fields are completed. */
function FormProgressFrame({
  progress,
  children,
}: {
  progress: number;
  children: React.ReactNode;
}) {
  const complete = progress >= 1;

  // Perimeter trace: top → right → bottom → left, each edge is a quarter of the journey.
  const edgeFill = (start: number, end: number) => {
    if (progress <= start) return 0;
    if (progress >= end) return 1;
    return (progress - start) / (end - start);
  };

  const top = edgeFill(0, 0.25);
  const right = edgeFill(0.25, 0.5);
  const bottom = edgeFill(0.5, 0.75);
  const left = edgeFill(0.75, 1);

  // Partially-filled edges get a fading tip; full edges stay solid through the corners.
  const segmentBackground = (direction: string, fill: number) =>
    fill > 0 && fill < 1
      ? `linear-gradient(to ${direction}, var(--success) 0%, var(--success) calc(100% - 56px), transparent 100%)`
      : "var(--success)";

  const segmentClass =
    "progress-segment pointer-events-none absolute transition-all duration-700 ease-out";

  return (
    <div className="relative border border-border bg-surface">
      <CornerTicks complete={complete} />

      {/* top edge: left → right */}
      <span
        aria-hidden
        className={`${segmentClass} -top-px left-0 h-px`}
        style={{ width: `${top * 100}%`, background: segmentBackground("right", top) }}
      />
      {/* right edge: top → bottom */}
      <span
        aria-hidden
        className={`${segmentClass} -right-px top-0 w-px`}
        style={{ height: `${right * 100}%`, background: segmentBackground("bottom", right) }}
      />
      {/* bottom edge: right → left */}
      <span
        aria-hidden
        className={`${segmentClass} -bottom-px right-0 h-px`}
        style={{ width: `${bottom * 100}%`, background: segmentBackground("left", bottom) }}
      />
      {/* left edge: bottom → top */}
      <span
        aria-hidden
        className={`${segmentClass} -left-px bottom-0 w-px`}
        style={{ height: `${left * 100}%`, background: segmentBackground("top", left) }}
      />

      {children}
    </div>
  );
}

function FieldRow({
  number,
  complete = false,
  children,
}: {
  number: string;
  complete?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex gap-4 p-5 sm:gap-5 sm:p-6">
      <span
        aria-hidden
        className={[
          "font-display w-9 shrink-0 select-none pt-0.5 text-2xl font-extrabold leading-none transition-colors duration-200",
          complete
            ? "text-success [text-shadow:0_0_10px_rgba(34,197,94,0.4)]"
            : "text-white/15 group-focus-within:text-white/50",
        ].join(" ")}
      >
        {number}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

type FormValues = {
  title: string;
  problemStatement: string;
  opportunitySolution: string;
  expectedImpact: string;
  targetAudience: string;
  sponsor: string;
};

const DEV_PREFILL: FormValues = {
  title: "Automate retargeting pixel deployment across affiliate landing pages",
  problemStatement:
    "Manual pixel placement causes delays and inconsistent tracking across partner sites.",
  opportunitySolution:
    "A self-serve pixel deployment tool that partners can configure without Affil Ops support.",
  expectedImpact:
    "~40% less setup time for pixels; fewer tracking gaps in retargeting data.",
  targetAudience: "Affiliate Ops & Media Buying",
  sponsor: "Sietse",
};

function isFieldComplete(value: string): boolean {
  return value.trim().length > 0;
}

const FORM_PROGRESS_TOTAL = 7;

function getFormProgress(values: FormValues): number {
  const completed = [
    true, // submitter (auto-filled)
    isFieldComplete(values.title),
    isFieldComplete(values.problemStatement),
    isFieldComplete(values.opportunitySolution),
    isFieldComplete(values.expectedImpact),
    isFieldComplete(values.targetAudience),
    isFieldComplete(values.sponsor),
  ].filter(Boolean).length;

  return completed / FORM_PROGRESS_TOTAL;
}

export function IdeaFormView({ submitterName }: { submitterName: string }) {
  const [state, formAction, pending] = useActionState(submitIdea, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeIdeaResult | null>(
    null,
  );
  const [showFastTrackModal, setShowFastTrackModal] = useState(false);
  const [showSimilarityModal, setShowSimilarityModal] = useState(false);
  const [bypassAnalysis, setBypassAnalysis] = useState(false);
  const [values, setValues] = useState<FormValues>({
    title: "",
    problemStatement: "",
    opportunitySolution: "",
    expectedImpact: "",
    targetAudience: "",
    sponsor: "",
  });

  const updateField = (name: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const formProgress = getFormProgress(values);

  const handlePreSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (bypassAnalysis) {
      setBypassAnalysis(false);
      return;
    }

    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = (formData.get("title") as string)?.trim();
    const problemStatement = (formData.get("problemStatement") as string)?.trim();
    const opportunitySolution = (
      formData.get("opportunitySolution") as string
    )?.trim();
    const expectedImpact = (formData.get("expectedImpact") as string)?.trim();
    const targetAudience = (formData.get("targetAudience") as string)?.trim();
    const sponsor = (formData.get("sponsor") as string)?.trim();

    if (
      !title ||
      !problemStatement ||
      !opportunitySolution ||
      !expectedImpact ||
      !targetAudience ||
      !sponsor
    ) {
      form.reportValidity();
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeIdeaSubmission({
        title,
        problemStatement,
        opportunitySolution,
        expectedImpact,
        targetAudience,
      });

      setAnalysisResult(result);

      if (!result.success || !result.analysis) {
        proceedWithSubmission();
        return;
      }

      const { fastTrack, similarity } = result.analysis;

      if (fastTrack.isFastTrack) {
        setShowFastTrackModal(true);
        setAnalyzing(false);
        return;
      }

      if (similarity.hasSimilarInitiatives) {
        setShowSimilarityModal(true);
        setAnalyzing(false);
        return;
      }

      proceedWithSubmission();
    } catch {
      proceedWithSubmission();
    }
  };

  const proceedWithSubmission = () => {
    setAnalyzing(false);
    setBypassAnalysis(true);
    setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  };

  const handleFastTrackProceed = () => {
    setShowFastTrackModal(false);

    if (analysisResult?.analysis?.similarity.hasSimilarInitiatives) {
      setShowSimilarityModal(true);
    } else {
      proceedWithSubmission();
    }
  };

  const handleSimilarityProceed = () => {
    setShowSimilarityModal(false);
    proceedWithSubmission();
  };

  const isSubmitting = pending || analyzing;

  return (
    <div className="relative w-full flex-1">
      <div className="relative mx-auto w-full max-w-[800px] px-4 pb-40 pt-4 sm:px-6 sm:pt-6 lg:pb-48">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="mb-10">
          <PipelineStrip currentStageId="idea" />
        </div>

      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
          Stage 1 · {IDEA_STAGE.name}
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
          Submit an Initiative
        </h1>
        <p className="mt-3 w-full text-sm leading-relaxed text-muted">
          Capture the minimal intake for a new initiative. On submit, a ticket is
          created in the <WorkspaceChip /> and enters the Production Framework
          at Initiative stage.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="font-display inline-flex items-center gap-2 border border-border bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <span className="size-1.5 animate-pulse bg-foreground" aria-hidden />
            New Initiative
          </span>
          {IS_DEV && (
            <button
              type="button"
              onClick={() => setValues(DEV_PREFILL)}
              title="Prefill form (dev only)"
              aria-label="Prefill form for testing"
              className="inline-flex size-8 items-center justify-center border border-border text-muted transition-colors hover:border-bbb/50 hover:text-bbb"
            >
              <FlaskConical className="size-3.5" />
            </button>
          )}
        </div>
      </header>

      <form
        ref={formRef}
        action={formAction}
        onSubmit={handlePreSubmit}
        className="space-y-6"
      >
        {state.error && (
          <div className="flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2.5 text-sm text-btr">
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </div>
        )}

        <FormProgressFrame progress={formProgress}>
          <div className="divide-y divide-border">
            {/* Submitter (auto-filled from session) */}
            <FieldRow number={fieldNumber(0)} complete>
              <label className="font-display block text-xs font-bold uppercase tracking-wide text-foreground">
                Submitter
              </label>
              <p className="mt-1 text-xs text-muted">
                Auto-assigned from your login session.
              </p>
              <div className="mt-3">
                <div className={readOnlyFieldClass}>{submitterName}</div>
              </div>
            </FieldRow>

            {FORM_FIELDS.map((field, index) => (
              <FieldRow
                key={field.name}
                number={fieldNumber(index + 1)}
                complete={isFieldComplete(values[field.name as keyof FormValues])}
              >
                <label
                  htmlFor={field.name}
                  className="font-display block text-xs font-bold uppercase tracking-wide text-foreground"
                >
                  {field.label}
                  <span className="ml-1 text-btr">*</span>
                </label>
                <p className="mt-1 text-xs text-muted">{field.hint}</p>
                <div className="mt-3">
                  {field.type === "textarea" ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      required
                      rows={3}
                      className={inputClass}
                      placeholder={field.placeholder}
                      value={values[field.name as keyof FormValues]}
                      onChange={(e) =>
                        updateField(field.name as keyof FormValues, e.target.value)
                      }
                    />
                  ) : (
                    <input
                      id={field.name}
                      name={field.name}
                      type="text"
                      required
                      className={inputClass}
                      placeholder={field.placeholder}
                      value={values[field.name as keyof FormValues]}
                      onChange={(e) =>
                        updateField(field.name as keyof FormValues, e.target.value)
                      }
                    />
                  )}
                </div>
              </FieldRow>
            ))}

            {/* Sponsor */}
            <FieldRow
              number={fieldNumber(FORM_FIELDS.length + 1)}
              complete={isFieldComplete(values.sponsor)}
            >
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
              <div className="mt-3">
                <Select
                  id="sponsor"
                  name="sponsor"
                  required
                  placeholder="Select sponsor…"
                  options={SPONSOR_OPTIONS}
                  value={values.sponsor}
                  onChange={(value) => updateField("sponsor", value)}
                />
              </div>
            </FieldRow>
          </div>
        </FormProgressFrame>

        {/* What happens next — structured step flow */}
        <div className="border border-border bg-surface-elevated">
          <p className="font-display border-b border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
            What happens next
          </p>
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {NEXT_STEPS.map((step, i) => (
              <div key={step.title} className="p-4">
                <p className="font-display text-lg font-extrabold leading-none text-white/20">
                  {fieldNumber(i)}
                </p>
                <p className="font-display mt-2 text-xs font-bold uppercase tracking-wide text-foreground">
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs text-muted">
            <Sparkles className="size-3.5 shrink-0 opacity-70" aria-hidden />
            Each submission is checked for Fast-Track fit and overlap with
            existing initiatives.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex items-center justify-center gap-2 border border-foreground bg-foreground px-6 py-3 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Analyzing…
              </>
            ) : pending ? (
              "Submitting…"
            ) : (
              <>
                Register Initiative
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>
      </form>

      <Modal
        open={showFastTrackModal}
        onClose={() => setShowFastTrackModal(false)}
        title="Fast-Track Suggestion"
        actions={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setShowFastTrackModal(false)}
            >
              Cancel
            </ModalButton>
            <ModalButton variant="primary" onClick={handleFastTrackProceed}>
              Submit as Regular Initiative
            </ModalButton>
          </>
        }
      >
        <div className="flex gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center border border-bbb/30 bg-bbb/10">
            <Zap className="size-5 text-bbb" />
          </div>
          <div>
            <p className="text-sm text-foreground">
              This looks like it could be a <strong>Fast-Track request</strong> — a
              quick task that can be completed in about 4 hours or less.
            </p>
            {analysisResult?.analysis?.fastTrack.reasoning && (
              <p className="mt-2 text-xs text-muted">
                {analysisResult.analysis.fastTrack.reasoning}
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Fast-Track requests skip the standard approval flow and go directly
              into production. Would you like to continue with a regular initiative
              submission?
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={showSimilarityModal}
        onClose={() => setShowSimilarityModal(false)}
        title="Similar Initiatives Found"
        actions={
          <>
            <ModalButton
              variant="secondary"
              onClick={() => setShowSimilarityModal(false)}
            >
              Cancel
            </ModalButton>
            <ModalButton variant="primary" onClick={handleSimilarityProceed}>
              Submit Anyway
            </ModalButton>
          </>
        }
      >
        <div className="flex gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center border border-hn/30 bg-hn/10">
            <AlertTriangle className="size-5 text-hn" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">
              We found existing initiatives that may overlap with your submission.
              Please review before proceeding.
            </p>

            {analysisResult?.analysis?.similarity.matches &&
              analysisResult.analysis.similarity.matches.length > 0 && (
                <div className="mt-4 space-y-3">
                  {analysisResult.analysis.similarity.matches.map((match) => (
                    <div
                      key={match.id}
                      className="border border-border bg-surface p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/workstreams/${match.id}`}
                            className="font-display text-xs font-bold uppercase tracking-wide text-foreground hover:underline"
                            target="_blank"
                          >
                            {match.ticketId}
                          </Link>
                          <p className="mt-1 truncate text-sm text-muted">
                            {match.title}
                          </p>
                        </div>
                        <span className="shrink-0 border border-hn/30 bg-hn/10 px-2 py-0.5 text-[10px] font-bold text-hn">
                          {Math.round(match.similarityScore * 100)}% match
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted">{match.reason}</p>
                    </div>
                  ))}
                </div>
              )}

            <p className="mt-4 text-xs text-muted">
              If this is intentionally a new initiative, you can proceed with
              submission.
            </p>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
