"use client";

import {
  useActionState,
  useEffect,
  useOptimistic,
  useRef,
  useState,
} from "react";
import { MessageCircle, Send, X } from "lucide-react";
import {
  addComment,
  type CommentResult,
} from "@/app/(workspace)/workstreams/[id]/actions";
import { inputClass } from "@/lib/form-styles";
import type { CommentEntry } from "@/lib/queries";

const initial: CommentResult = {};
const MAX_BODY = 2000;
const LATEST_PREVIEW_MS = 5000;

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatDate(value: Date | string): string {
  return asDate(value).toLocaleDateString("en-US", { dateStyle: "medium" });
}

function timeAgo(value: Date | string): string {
  const date = asDate(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function countLabel(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

type Props = {
  initiativeId: number;
  comments: CommentEntry[];
  currentUserName: string;
  currentUserId?: string;
  canComment: boolean;
  /** Lift the dock so it clears the current-phase jump bar. */
  dockAbovePhaseBar?: boolean;
};

export function WorkstreamChat({
  initiativeId,
  comments,
  currentUserName,
  currentUserId,
  canComment,
  dockAbovePhaseBar = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const boundAction = addComment.bind(null, initiativeId);
  const [state, formAction, pending] = useActionState(boundAction, initial);
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (current, next: CommentEntry) => [next, ...current],
  );
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showLatestPreview, setShowLatestPreview] = useState(
    () => comments.length > 0,
  );

  const latest = optimisticComments[0] ?? null;
  const latestId = latest?.id ?? null;
  const count = optimisticComments.length;
  const thread = [...optimisticComments].reverse();

  useEffect(() => {
    if (latestId == null) {
      setShowLatestPreview(false);
      return;
    }
    setShowLatestPreview(true);
    const timer = window.setTimeout(() => {
      setShowLatestPreview(false);
    }, LATEST_PREVIEW_MS);
    return () => window.clearTimeout(timer);
  }, [latestId]);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
    textareaRef.current?.focus();
  }, [open, optimisticComments.length]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function submitWithOptimistic(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (body) {
      addOptimistic({
        id: -Date.now(),
        body,
        createdAt: new Date(),
        userId: currentUserId ?? "",
        userName: currentUserName,
      });
    }
    return formAction(formData);
  }

  return (
    <div
      className={[
        "fixed z-[45] flex flex-col items-end gap-3 print:hidden",
        dockAbovePhaseBar ? "bottom-[5.75rem]" : "bottom-6",
        "right-4 sm:right-6",
      ].join(" ")}
    >
      {open && (
        <section
          id="workstream-chat-panel"
          className="flex h-[min(520px,calc(100dvh-8rem))] w-[min(380px,calc(100vw-2rem))] flex-col border border-border-strong bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.8)] animate-fade-in"
          role="dialog"
          aria-labelledby="workstream-chat-title"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <MessageCircle className="size-4 text-muted" />
            <h2
              id="workstream-chat-title"
              className="font-display text-xs font-bold uppercase tracking-wide"
            >
              Chat
            </h2>
            <span className="font-display tabular-nums text-xs text-muted">
              {count}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-auto flex size-8 items-center justify-center border border-transparent text-muted transition-colors hover:border-border hover:text-foreground"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
            {thread.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">
                No remarks yet. Start the thread for this workstream.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {thread.map((item) => {
                  const mine =
                    Boolean(currentUserId) && item.userId === currentUserId;
                  return (
                    <div key={item.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex size-6 shrink-0 items-center justify-center border border-border bg-surface-elevated font-display text-[9px] font-bold uppercase text-muted">
                            {initials(item.userName)}
                          </span>
                          <span className="font-display truncate text-[10px] font-bold uppercase tracking-wide text-foreground">
                            {mine ? "You" : item.userName}
                          </span>
                        </div>
                        <span className="shrink-0 text-[9px] text-muted">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 pl-8 text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">
                        {item.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {canComment ? (
            <form
              ref={formRef}
              action={submitWithOptimistic}
              className="border-t border-border p-3"
            >
              {state.error && (
                <p className="mb-2 text-xs text-btr">{state.error}</p>
              )}
              <div className="flex items-end gap-2">
                <span className="mb-2 flex size-6 shrink-0 items-center justify-center border border-border bg-surface-elevated font-display text-[9px] font-bold uppercase text-muted">
                  {initials(currentUserName)}
                </span>
                <div className="relative min-w-0 flex-1">
                  <textarea
                    ref={textareaRef}
                    name="body"
                    required
                    rows={2}
                    maxLength={MAX_BODY}
                    className={`${inputClass} resize-none py-2 pr-10 text-xs`}
                    placeholder="Write a remark…"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        formRef.current?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="absolute right-2 top-2 text-muted transition-colors hover:text-foreground disabled:opacity-50"
                    aria-label="Send remark"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <p className="border-t border-border px-4 py-3 text-xs text-muted">
              Sign in to add a remark.
            </p>
          )}
        </section>
      )}

      <div className="flex flex-col items-end gap-3">
        {latest && showLatestPreview ? (
          <button
            key={latestId}
            type="button"
            onClick={() => setOpen(true)}
            className="w-[min(280px,calc(100vw-2rem))] border border-border-strong bg-surface px-3 pb-0 pt-2.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.65)] animate-fade-in transition-colors hover:border-foreground"
            aria-label="Latest remark, opens chat"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="font-display truncate text-[10px] font-bold uppercase tracking-wide text-foreground">
                {latest.userName}
              </span>
              <span className="shrink-0 font-display text-[10px] font-bold tabular-nums text-muted">
                5s
              </span>
            </span>
            <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-foreground/80">
              {latest.body}
            </span>
            <span
              className="mt-2 block h-0.5 w-full origin-left bg-foreground animate-chat-preview-timer"
              aria-hidden
            />
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="relative flex size-14 items-center justify-center border border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
          aria-expanded={open}
          aria-controls="workstream-chat-panel"
          aria-label={
            open
              ? "Close chat"
              : count > 0
                ? `Open chat, ${count} ${count === 1 ? "remark" : "remarks"}`
                : "Open chat"
          }
        >
          {open ? (
            <X className="size-5" />
          ) : (
            <MessageCircle className="size-5" />
          )}
          {!open && count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center border border-background bg-foreground px-1 font-display text-[10px] font-bold tabular-nums text-background">
              {countLabel(count)}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
