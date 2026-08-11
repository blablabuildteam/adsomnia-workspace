"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, XCircle, Pause, AlertCircle, User, Calendar, MessageSquare } from "lucide-react";
import {
  approveToValidation,
  rejectInitiative,
  putOnHold,
  type ApprovalResult,
} from "@/app/(workspace)/initiatives/[id]/actions";
import { inputClass } from "@/lib/form-styles";

const initial: ApprovalResult = {};

type Action = "approve" | "reject" | "hold";

export type ApprovalDecision = {
  decision: "approved" | "rejected" | "on-hold";
  comment: string | null;
  approverName: string;
  createdAt: Date;
  toStage: string | null;
};

const DECISION_META: Record<
  ApprovalDecision["decision"],
  {
    label: string;
    description: string;
    badge: string;
    icon: typeof CheckCircle2;
  }
> = {
  approved: {
    label: "Approved",
    description: "Advanced to Validation",
    badge: "border-success bg-success/10 text-success",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    description: "Not advanced",
    badge: "border-btr bg-btr/10 text-btr",
    icon: XCircle,
  },
  "on-hold": {
    label: "On Hold",
    description: "Paused pending review",
    badge: "border-hn bg-hn/10 text-hn",
    icon: Pause,
  },
};

function DecisionSummary({ decision, embedded = false }: { decision: ApprovalDecision; embedded?: boolean }) {
  const meta = DECISION_META[decision.decision];
  const Icon = meta.icon;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5 ${
        embedded ? "border-t border-border bg-foreground/5" : "border border-border bg-foreground/5"
      }`}
    >
      <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
        Approval Decision
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
  decision?: ApprovalDecision | null;
  /** When true, renders without outer border (for embedding inside a parent container). */
  embedded?: boolean;
};

export function ApprovalPanel({ initiativeId, decision = null, embedded = false }: Props) {
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  const boundApprove = approveToValidation.bind(null, initiativeId);
  const boundReject = rejectInitiative.bind(null, initiativeId);
  const boundHold = putOnHold.bind(null, initiativeId);

  const [approveState, approveAction, approvePending] = useActionState(
    boundApprove,
    initial,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    boundReject,
    initial,
  );
  const [holdState, holdAction, holdPending] = useActionState(
    boundHold,
    initial,
  );

  const pending = approvePending || rejectPending || holdPending;
  const error =
    approveState.error || rejectState.error || holdState.error;

  const successState = approveState.success
    ? approveState
    : rejectState.success
      ? rejectState
      : holdState.success
        ? holdState
        : null;

  if (decision || successState) {
    const resolved: ApprovalDecision = decision ?? {
      decision: successState!.decision ?? "approved",
      comment: successState!.comment ?? null,
      approverName: successState!.approverName ?? "You",
      createdAt: new Date(),
      toStage:
        successState!.decision === "approved" ? "validation" : null,
    };
    return <DecisionSummary decision={resolved} embedded={embedded} />;
  }

  return (
    <div className={`approval-action-frame bg-foreground/5 p-5 text-center ${embedded ? "border-t border-border" : "border border-border"}`}>
      <span aria-hidden className="approval-action-border" />
      <h3 className="font-display text-sm font-bold uppercase tracking-wide">
        Approval Decision
      </h3>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">
        Admin-only: review the initiative details and advance to Validation,
        reject, or put on hold.
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
            Approve to Validation
          </button>
          <button
            type="button"
            onClick={() => setSelectedAction("reject")}
            className="inline-flex items-center gap-2 border border-btr bg-btr/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-btr transition-colors hover:bg-btr/20"
          >
            <XCircle className="size-3.5" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => setSelectedAction("hold")}
            className="inline-flex items-center gap-2 border border-hn bg-hn/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-hn transition-colors hover:bg-hn/20"
          >
            <Pause className="size-3.5" />
            Put on Hold
          </button>
        </div>
      )}

      {selectedAction && (
        <form
          action={
            selectedAction === "approve"
              ? approveAction
              : selectedAction === "reject"
                ? rejectAction
                : holdAction
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
              placeholder="Explain the reasoning behind this decision…"
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
                  : selectedAction === "reject"
                    ? "border-btr bg-btr text-background"
                    : "border-hn bg-hn text-background",
              ].join(" ")}
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">
                {pending
                  ? "Processing…"
                  : selectedAction === "approve"
                    ? "Confirm Approval"
                    : selectedAction === "reject"
                      ? "Confirm Rejection"
                      : "Confirm On Hold"}
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
