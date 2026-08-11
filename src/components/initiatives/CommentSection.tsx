"use client";

import { useActionState, useRef, useEffect, useMemo } from "react";
import { Send, MessageSquare, ArrowRight, GitBranch } from "lucide-react";
import {
  addComment,
  type CommentResult,
} from "@/app/(workspace)/initiatives/[id]/actions";
import { inputClass } from "@/lib/form-styles";
import type { CommentEntry, ActivityEntry } from "@/lib/queries";

const initial: CommentResult = {};

type TimelineItem =
  | {
      kind: "comment";
      id: string;
      body: string;
      userName: string;
      createdAt: Date;
    }
  | {
      kind: "event";
      id: string;
      action: string;
      details: Record<string, unknown> | null;
      userName: string;
      createdAt: Date;
    };

const PHASE_ACTIONS = new Set([
  "idea_submitted",
  "approved_to_validation",
  "stage_advanced",
  "idea_rejected",
  "idea_on_hold",
]);

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

function buildTimeline(
  comments: CommentEntry[],
  activity: ActivityEntry[],
): TimelineItem[] {
  const items: TimelineItem[] = [
    ...comments.map((c) => ({
      kind: "comment" as const,
      id: `comment-${c.id}`,
      body: c.body,
      userName: c.userName,
      createdAt: c.createdAt,
    })),
    ...activity
      .filter((a) => a.action !== "comment_added")
      .map((a) => ({
        kind: "event" as const,
        id: `event-${a.id}`,
        action: a.action,
        details: (a.details as Record<string, unknown> | null) ?? null,
        userName: a.userName,
        createdAt: a.createdAt,
      })),
  ];

  return items.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
}

function getPhaseEventMeta(action: string, details: Record<string, unknown> | null) {
  const fromStage =
    typeof details?.fromStage === "string" ? details.fromStage : null;
  const toStage =
    typeof details?.toStage === "string" ? details.toStage : null;
  const comment =
    typeof details?.comment === "string" ? details.comment : null;

  switch (action) {
    case "idea_submitted":
      return {
        label: "Initiative submitted",
        sublabel: "Entered Production Framework",
        tone: "text-foreground/80",
        fromStage: null,
        toStage: "Initiative",
        comment: null,
      };
    case "approved_to_validation":
    case "stage_advanced":
      return {
        label: "Advanced to next phase",
        sublabel: null,
        tone: "text-success",
        fromStage: fromStage ?? "Initiative",
        toStage: toStage ?? "Validation",
        comment,
      };
    case "idea_rejected":
      return {
        label: "Initiative rejected",
        sublabel: "No phase change",
        tone: "text-btr",
        fromStage: fromStage ?? "Initiative",
        toStage: null,
        comment,
      };
    case "idea_on_hold":
      return {
        label: "Initiative on hold",
        sublabel: "Paused pending review",
        tone: "text-hn",
        fromStage: fromStage ?? "Initiative",
        toStage: null,
        comment,
      };
    default:
      return {
        label: action.replace(/_/g, " "),
        sublabel: null,
        tone: "text-muted",
        fromStage: null,
        toStage: null,
        comment,
      };
  }
}

function PhaseEvent({
  action,
  details,
  userName,
  createdAt,
}: {
  action: string;
  details: Record<string, unknown> | null;
  userName: string;
  createdAt: Date;
}) {
  const meta = getPhaseEventMeta(action, details);

  return (
    <div className="flex gap-2.5 bg-surface-elevated/40 px-4 py-3">
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center border border-border-strong bg-surface-elevated"
      >
        <GitBranch className="size-2.5 text-foreground/80" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.12em] text-muted">
            Adsomnia Workspace
          </span>
          <span className="text-[9px] text-muted">{timeAgo(createdAt)}</span>
        </div>
        <p className={`mt-1 text-xs leading-snug ${meta.tone}`}>{meta.label}</p>
        {meta.fromStage && meta.toStage && (
          <p className="mt-1 flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            <span className={meta.tone}>{meta.fromStage}</span>
            <ArrowRight className="size-2.5 shrink-0 opacity-60" />
            <span className={meta.tone}>{meta.toStage}</span>
          </p>
        )}
        {!meta.fromStage && meta.toStage && (
          <p
            className={`mt-1 font-display text-[10px] font-bold uppercase tracking-wide ${meta.tone}`}
          >
            {meta.toStage}
          </p>
        )}
        {meta.sublabel && (
          <p className="mt-0.5 text-[10px] text-muted/80">{meta.sublabel}</p>
        )}
        {meta.comment && (
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
            {meta.comment}
          </p>
        )}
        <p className="mt-1 text-[9px] text-muted/70">
          {userName} · {formatDate(createdAt)}
        </p>
      </div>
    </div>
  );
}

type Props = {
  initiativeId: number;
  comments: CommentEntry[];
  activity: ActivityEntry[];
  currentUserName: string;
  canComment: boolean;
};

export function CommentSection({
  initiativeId,
  comments,
  activity,
  currentUserName,
  canComment,
}: Props) {
  const boundAction = addComment.bind(null, initiativeId);
  const [state, formAction, pending] = useActionState(boundAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  const timeline = useMemo(
    () => buildTimeline(comments, activity),
    [comments, activity],
  );

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <div className="border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare className="size-4 text-muted" />
        <h3 className="font-display text-xs font-bold uppercase tracking-wide">
          Discussion
        </h3>
        <span className="font-display text-xs text-muted">
          {comments.length}
        </span>
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        {timeline.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-muted">
            No discussion yet. Add a comment or wait for phase updates.
          </p>
        )}

        <div className="divide-y divide-border">
          {timeline.map((item) => {
            if (item.kind === "event" && PHASE_ACTIONS.has(item.action)) {
              return (
                <PhaseEvent
                  key={item.id}
                  action={item.action}
                  details={item.details}
                  userName={item.userName}
                  createdAt={item.createdAt}
                />
              );
            }

            if (item.kind === "comment") {
              return (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center bg-surface-elevated font-display text-[9px] font-bold uppercase text-muted">
                        {item.userName.charAt(0)}
                      </span>
                      <span className="font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
                        {item.userName}
                      </span>
                    </div>
                    <span className="text-[9px] text-muted">
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 pl-7 text-xs leading-relaxed text-foreground/90">
                    {item.body}
                  </p>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {canComment ? (
        <form
          ref={formRef}
          action={formAction}
          className="border-t border-border p-4"
        >
          {state.error && (
            <p className="mb-2 text-xs text-btr">{state.error}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center bg-surface-elevated font-display text-[9px] font-bold uppercase text-muted">
              {currentUserName.charAt(0)}
            </span>
            <div className="relative min-w-0 flex-1">
              <textarea
                name="body"
                required
                rows={2}
                className={`${inputClass} resize-none py-2 pr-10 text-xs`}
                placeholder="Add a comment…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                disabled={pending}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground disabled:opacity-50"
                aria-label="Send comment"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="border-t border-border px-4 py-3 text-xs text-muted">
          Sign in to add a comment.
        </p>
      )}
    </div>
  );
}
