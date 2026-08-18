"use client";

import { useActionState, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  MessageCircle,
  PauseCircle,
  Hourglass,
} from "lucide-react";
import {
  approveValidationToScoping,
  rejectValidation,
  requestValidationChanges,
  putValidationOnHold,
  type ValidationDecisionResult,
} from "@/app/(workspace)/workstreams/[id]/actions";
import { inputClass } from "@/lib/form-styles";

const initial: ValidationDecisionResult = {};

type Action = "approve" | "feedback" | "hold" | "reject";

export type ValidationDecision = {
  decision: "approved" | "rejected" | "on-hold" | "feedback";
  comment: string | null;
  approverName: string;
  createdAt: Date;
};

const DECISION_META: Record<
  ValidationDecision["decision"],
  { label: string; description: string; badge: string; icon: typeof CheckCircle2 }
> = {
  approved: {
    label: "Approved · Scoping",
    description: "Advanced to Scoping",
    badge: "border-success bg-success/10 text-success",
    icon: CheckCircle2,
  },
  feedback: {
    label: "Feedback",
    description: "Returned for revision",
    badge: "border-feedback bg-feedback/10 text-feedback",
    icon: MessageCircle,
  },
  "on-hold": {
    label: "On Hold",
    description: "Paused for now",
    badge: "border-hn bg-hn/10 text-hn",
    icon: PauseCircle,
  },
  rejected: {
    label: "Rejected",
    description: "Business case rejected",
    badge: "border-btr bg-btr/10 text-btr",
    icon: XCircle,
  },
};

function DecisionSummary({ decision }: { decision: ValidationDecision }) {
  const meta = DECISION_META[decision.decision];
  const Icon = meta.icon;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border bg-foreground/5 px-4 py-3 sm:px-5">
      <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
        Leadership Decision
      </span>
      <span
        className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide ${meta.badge}`}
      >
        <Icon className="size-3.5" />
        {meta.label}
      </span>
      {decision.comment && (
        <span className="group relative inline-flex cursor-help items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground">
          <MessageSquare className="size-3.5" />
          <span className="max-w-[240px] truncate">{decision.comment}</span>
          <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-72 border border-border bg-surface-elevated px-3 py-2 text-[11px] leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {decision.comment}
          </span>
        </span>
      )}
      <span className="ml-auto flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <User className="size-3.5" />
          {decision.approverName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5" />
          {decision.createdAt.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </span>
    </div>
  );
}

type Props = {
  initiativeId: number;
  /** An already-made decision to display instead of the action UI. */
  decision?: ValidationDecision | null;
  /** Whether the current user is allowed to make the decision. */
  canDecide?: boolean;
  /** Whether the business case is currently awaiting a decision. */
  awaitingDecision?: boolean;
};

export function ValidationApprovalPanel({
  initiativeId,
  decision = null,
  canDecide = false,
  awaitingDecision = false,
}: Props) {
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  const boundApprove = approveValidationToScoping.bind(null, initiativeId);
  const boundFeedback = requestValidationChanges.bind(null, initiativeId);
  const boundHold = putValidationOnHold.bind(null, initiativeId);
  const boundReject = rejectValidation.bind(null, initiativeId);

  const [approveState, approveAction, approvePending] = useActionState(boundApprove, initial);
  const [feedbackState, feedbackAction, feedbackPending] = useActionState(boundFeedback, initial);
  const [holdState, holdAction, holdPending] = useActionState(boundHold, initial);
  const [rejectState, rejectAction, rejectPending] = useActionState(boundReject, initial);

  const pending = approvePending || feedbackPending || holdPending || rejectPending;
  const error = approveState.error || feedbackState.error || holdState.error || rejectState.error;

  const successState = approveState.success
    ? approveState
    : feedbackState.success
      ? feedbackState
      : holdState.success
        ? holdState
        : rejectState.success
          ? rejectState
          : null;

  if (successState) {
    return (
      <DecisionSummary
        decision={{
          decision: successState.decision ?? "approved",
          comment: successState.comment ?? null,
          approverName: successState.approverName ?? "You",
          createdAt: new Date(),
        }}
      />
    );
  }

  if (decision && !awaitingDecision) {
    return <DecisionSummary decision={decision} />;
  }

  if (awaitingDecision && !canDecide) {
    return (
      <div className="approval-action-frame border-t border-border bg-foreground/5 p-5 text-center">
        <span aria-hidden className="approval-action-border" />
        <span className="inline-flex items-center gap-1.5 border border-foreground/30 bg-foreground/10 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
          <Hourglass className="size-3.5" />
          Under Review
        </span>
        <h3 className="mt-3 font-display text-sm font-bold uppercase tracking-wide">
          Awaiting Leadership Decision
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted">
          The business case has been submitted. Leadership will review and
          approve, reject, or send feedback.
        </p>
      </div>
    );
  }

  if (!awaitingDecision) return null;

  return (
    <div className="approval-action-frame border-t border-border bg-foreground/5 p-5 text-center">
      <span aria-hidden className="approval-action-border" />
      <h3 className="font-display text-sm font-bold uppercase tracking-wide">
        Business Case Review
      </h3>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">
        Admin-only: approve to advance to Scoping, reject, or send feedback so
        the creator can revise and resubmit.
      </p>

      {error && (
        <div className="mx-auto mt-3 flex max-w-md items-center justify-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2 text-sm text-btr">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {!selectedAction && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedAction("approve")}
            className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
          >
            <CheckCircle2 className="size-3.5" />
            Approve for Scoping
          </button>
          <button
            type="button"
            onClick={() => setSelectedAction("feedback")}
            className="inline-flex items-center gap-2 border border-feedback bg-feedback/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-feedback transition-colors hover:bg-feedback/20"
          >
            <MessageCircle className="size-3.5" />
            Feedback
          </button>
          <button
            type="button"
            onClick={() => setSelectedAction("hold")}
            className="inline-flex items-center gap-2 border border-hn bg-hn/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-hn transition-colors hover:bg-hn/20"
          >
            <PauseCircle className="size-3.5" />
            On Hold
          </button>
          <button
            type="button"
            onClick={() => setSelectedAction("reject")}
            className="inline-flex items-center gap-2 border border-btr bg-btr/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-btr transition-colors hover:bg-btr/20"
          >
            <XCircle className="size-3.5" />
            Reject
          </button>
        </div>
      )}

      {selectedAction && (
        <form
          action={
            selectedAction === "approve"
              ? approveAction
              : selectedAction === "feedback"
                ? feedbackAction
                : selectedAction === "hold"
                  ? holdAction
                  : rejectAction
          }
          className="mx-auto mt-4 max-w-md space-y-3 text-left"
        >
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Remark<span className="ml-1 text-btr">*</span>
            </span>
            <textarea
              name="comment"
              required
              rows={2}
              className={`${inputClass} mt-1`}
              placeholder={
                selectedAction === "feedback"
                  ? "Explain what needs to change before resubmission…"
                  : "Explain the reasoning behind this decision…"
              }
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className={[
                "group relative inline-flex items-center gap-2 overflow-hidden border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
                selectedAction === "approve"
                  ? "border-success bg-success text-background"
                  : selectedAction === "feedback"
                    ? "border-feedback bg-feedback text-background"
                    : selectedAction === "hold"
                      ? "border-hn bg-hn text-background"
                      : "border-btr bg-btr text-background",
              ].join(" ")}
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">
                {pending
                  ? "Processing…"
                  : selectedAction === "approve"
                    ? "Confirm Approval"
                    : selectedAction === "feedback"
                      ? "Send Feedback"
                      : selectedAction === "hold"
                        ? "Confirm On Hold"
                        : "Confirm Rejection"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedAction(null)}
              disabled={pending}
              className="border border-border px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
