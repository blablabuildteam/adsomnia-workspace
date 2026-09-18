"use client";

import { useActionState, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  MessageCircle,
  Hourglass,
  Rocket,
  Ban,
  PauseCircle,
} from "lucide-react";
import {
  approveGoNoGoToSetup,
  rejectGoNoGo,
  requestGoNoGoChanges,
  putGoNoGoOnHold,
  type GoNoGoDecisionResult,
} from "@/app/(workspace)/workstreams/[id]/actions";
import { inputClass } from "@/lib/form-styles";

const initial: GoNoGoDecisionResult = {};

type Action = "go" | "no-go" | "feedback" | "hold";

export type GoNoGoDecision = {
  decision: "approved" | "rejected" | "on-hold" | "feedback";
  comment: string | null;
  approverName: string;
  createdAt: Date;
};

const DECISION_META: Record<
  GoNoGoDecision["decision"],
  { label: string; badge: string; icon: typeof CheckCircle2 }
> = {
  approved: {
    label: "GO — Project Setup",
    badge: "border-success bg-success/10 text-success",
    icon: Rocket,
  },
  rejected: {
    label: "NO-GO — Closed",
    badge: "border-danger bg-danger/10 text-danger",
    icon: Ban,
  },
  feedback: {
    label: "Feedback",
    badge: "border-feedback bg-feedback/10 text-feedback",
    icon: MessageCircle,
  },
  "on-hold": {
    label: "On Hold",
    badge: "border-hn bg-hn/10 text-hn",
    icon: PauseCircle,
  },
};

function DecisionSummary({ decision }: { decision: GoNoGoDecision }) {
  const meta = DECISION_META[decision.decision];
  const Icon = meta.icon;

  return (
    <div className="border-t border-border bg-foreground/5 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Go / No-Go Decision
        </span>
        <span
          className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide ${meta.badge}`}
        >
          <Icon className="size-3.5" />
          {meta.label}
        </span>
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
      {decision.comment && (
        <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
          <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-muted" />
          <span>{decision.comment}</span>
        </p>
      )}
    </div>
  );
}

type Props = {
  initiativeId: number;
  decision?: GoNoGoDecision | null;
  canDecide?: boolean;
  awaitingDecision?: boolean;
};

export function GoNoGoApprovalPanel({
  initiativeId,
  decision = null,
  canDecide = false,
  awaitingDecision = false,
}: Props) {
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);

  const boundGo = approveGoNoGoToSetup.bind(null, initiativeId);
  const boundNoGo = rejectGoNoGo.bind(null, initiativeId);
  const boundFeedback = requestGoNoGoChanges.bind(null, initiativeId);
  const boundHold = putGoNoGoOnHold.bind(null, initiativeId);

  const [goState, goAction, goPending] = useActionState(boundGo, initial);
  const [noGoState, noGoAction, noGoPending] = useActionState(boundNoGo, initial);
  const [feedbackState, feedbackAction, feedbackPending] = useActionState(
    boundFeedback,
    initial,
  );
  const [holdState, holdAction, holdPending] = useActionState(boundHold, initial);

  const pending = goPending || noGoPending || feedbackPending || holdPending;
  const error =
    goState.error || noGoState.error || feedbackState.error || holdState.error;

  const successState = goState.success
    ? goState
    : noGoState.success
      ? noGoState
      : feedbackState.success
        ? feedbackState
        : holdState.success
          ? holdState
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
          Awaiting Go / No-Go Decision
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-muted">
          The scoping proposal has been submitted for leadership review. A Go,
          No-Go, Feedback, or On Hold decision will be made.
        </p>
      </div>
    );
  }

  if (!awaitingDecision) return null;

  return (
    <div className="approval-action-frame border-t border-border bg-foreground/5 p-5 text-center">
      <span aria-hidden className="approval-action-border" />
      <h3 className="font-display text-sm font-bold uppercase tracking-wide">
        Go / No-Go Decision
      </h3>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">
        Review the scoping proposal, business case, and all prior stages. Decide
        whether to greenlight into Project Setup, pause, reject, or send
        feedback for revision.
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
            onClick={() => setSelectedAction("go")}
            className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
          >
            <Rocket className="size-3.5" />
            GO — Approve
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
            onClick={() => setSelectedAction("no-go")}
            className="inline-flex items-center gap-2 border border-danger bg-danger/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-danger transition-colors hover:bg-danger/20"
          >
            <Ban className="size-3.5" />
            NO-GO — Reject
          </button>
        </div>
      )}

      {selectedAction && (
        <form
          action={
            selectedAction === "go"
              ? goAction
              : selectedAction === "no-go"
                ? noGoAction
                : selectedAction === "hold"
                  ? holdAction
                  : feedbackAction
          }
          className="mx-auto mt-4 max-w-md space-y-3 text-left"
        >
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Remark
            </span>
            <textarea
              name="comment"
              rows={2}
              className={`${inputClass} mt-1`}
              placeholder={
                selectedAction === "feedback"
                  ? "Explain what needs revision before the scope can be approved…"
                  : selectedAction === "go"
                    ? "Confirm the rationale for approving this project…"
                    : selectedAction === "hold"
                      ? "Explain why this is paused…"
                      : "Explain the reasoning for rejecting this initiative…"
              }
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className={[
                "group relative inline-flex items-center gap-2 overflow-hidden border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-50",
                selectedAction === "go"
                  ? "border-success bg-success text-background"
                  : selectedAction === "no-go"
                    ? "border-danger bg-danger text-background"
                    : selectedAction === "hold"
                      ? "border-hn bg-hn text-background"
                      : "border-feedback bg-feedback text-background",
              ].join(" ")}
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <span className="relative">
                {pending
                  ? "Processing…"
                  : selectedAction === "go"
                    ? "Confirm GO"
                    : selectedAction === "no-go"
                      ? "Confirm NO-GO"
                      : selectedAction === "hold"
                        ? "Confirm On Hold"
                        : "Send Feedback"}
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
