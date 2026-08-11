"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, XCircle, Pause, AlertCircle } from "lucide-react";
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

function DecisionSummary({ decision }: { decision: ApprovalDecision }) {
  const meta = DECISION_META[decision.decision];
  const Icon = meta.icon;

  return (
    <div className="border border-border bg-surface">
      <h3 className="border-b border-border px-4 py-3 font-display text-xs font-bold uppercase tracking-wide">
        Approval Decision
      </h3>
      <div className="divide-y divide-border">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="shrink-0 text-xs text-muted">Decision</span>
          <span
            className={`inline-flex items-center gap-2 border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide ${meta.badge}`}
          >
            <Icon className="size-3.5" />
            {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="shrink-0 text-xs text-muted">Outcome</span>
          <span className="text-right text-xs text-foreground">
            {meta.description}
          </span>
        </div>
        {decision.comment && (
          <div className="px-4 py-3">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Remark
            </span>
            <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
              {decision.comment}
            </p>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="shrink-0 text-xs text-muted">Reviewed by</span>
          <span className="text-right text-xs text-foreground">
            {decision.approverName}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="shrink-0 text-xs text-muted">Date</span>
          <span className="text-right text-xs text-foreground">
            {decision.createdAt.toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  initiativeId: number;
  decision?: ApprovalDecision | null;
};

export function ApprovalPanel({ initiativeId, decision = null }: Props) {
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
    return <DecisionSummary decision={resolved} />;
  }

  return (
    <div className="approval-action-frame border border-border bg-foreground/5 p-5 text-center">
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
          <div className="flex items-center justify-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className={[
                "inline-flex items-center gap-2 border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide transition-opacity disabled:opacity-50",
                selectedAction === "approve"
                  ? "border-success bg-success text-background"
                  : selectedAction === "reject"
                    ? "border-btr bg-btr text-background"
                    : "border-hn bg-hn text-background",
              ].join(" ")}
            >
              {pending
                ? "Processing…"
                : selectedAction === "approve"
                  ? "Confirm Approval"
                  : selectedAction === "reject"
                    ? "Confirm Rejection"
                    : "Confirm On Hold"}
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
