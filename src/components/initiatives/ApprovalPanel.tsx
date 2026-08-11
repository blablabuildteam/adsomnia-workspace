"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, XCircle, Pause, AlertCircle } from "lucide-react";
import {
  approveToValidation,
  rejectInitiative,
  putOnHold,
  type ApprovalResult,
} from "@/app/(workspace)/initiatives/[id]/actions";

const initial: ApprovalResult = {};

type Action = "approve" | "reject" | "hold";

export function ApprovalPanel({ initiativeId }: { initiativeId: number }) {
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

  if (
    approveState.success ||
    rejectState.success ||
    holdState.success
  ) {
    return null;
  }

  return (
    <div className="border border-foreground/30 bg-foreground/5 p-5">
      <h3 className="font-display text-sm font-bold uppercase tracking-wide">
        Approval Decision
      </h3>
      <p className="mt-1 text-xs text-muted">
        As an approver, you can advance this initiative to Validation, reject it,
        or put it on hold.
      </p>

      {error && (
        <div className="mt-3 flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2 text-sm text-btr">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {!selectedAction && (
        <div className="mt-4 flex flex-wrap gap-2">
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
          className="mt-4 space-y-3"
        >
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Comment (optional)
            </span>
            <textarea
              name="comment"
              rows={2}
              className="mt-1 w-full border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none"
              placeholder="Add a reason or note…"
            />
          </label>
          <div className="flex items-center gap-2">
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
