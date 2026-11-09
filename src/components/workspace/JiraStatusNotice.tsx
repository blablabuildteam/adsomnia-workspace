"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { JiraHealthIssue } from "@/lib/integrations/jira-health";
import type { JiraTokenReminder } from "@/lib/integrations/jira-token-reminder";

/** How long the banner stays open before it folds into the "!" button. */
const BANNER_MS = 8000;
const SHOW_DELAY_MS = 400;
const SEEN_KEY = "adsomnia-jira-notice-seen";
const ATLASSIAN_TOKENS_URL =
  "https://id.atlassian.com/manage-profile/security/api-tokens";

type Props = {
  issues: JiraHealthIssue[];
  /** Token rotation reminder; only passed for leadership. */
  reminder: JiraTokenReminder | null;
  /** Leadership sees what to do about it, not only that something is wrong. */
  canManage: boolean;
};

function formatExpiry(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    dateStyle: "long",
  });
}

function reminderTiming(reminder: JiraTokenReminder): string {
  if (reminder.expired) {
    const days = Math.abs(reminder.daysRemaining);
    return days === 1 ? "expired yesterday" : `expired ${days} days ago`;
  }
  if (reminder.daysRemaining === 0) return "expires today";
  if (reminder.daysRemaining === 1) return "expires tomorrow";
  return `expires in ${reminder.daysRemaining} days`;
}

function issueStatus(issue: JiraHealthIssue): string {
  if (issue.kind === "auth") return "API token rejected";
  if (issue.kind === "not_configured") return "Not configured";
  return "Not reachable";
}

/** Same problem set → same signature, so the banner shows once per session. */
function signatureOf(
  issues: JiraHealthIssue[],
  reminder: JiraTokenReminder | null,
): string {
  const parts = issues.map((issue) => `${issue.instance}:${issue.kind}`).sort();
  if (reminder) parts.push(`reminder:${reminder.expiresOn}`);
  return parts.join("|");
}

export function JiraStatusNotice({ issues, reminder, canManage }: Props) {
  const signature = signatureOf(issues, reminder);
  const [bannerOpen, setBannerOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Flash the banner the first time this problem set is seen in the session.
  useEffect(() => {
    if (!signature) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY) === signature) return;
      sessionStorage.setItem(SEEN_KEY, signature);
    } catch {
      /* storage blocked: still show it once for this page load */
    }
    // A short delay lets the page settle before the banner slides in.
    const show = window.setTimeout(() => setBannerOpen(true), SHOW_DELAY_MS);
    const hide = window.setTimeout(
      () => setBannerOpen(false),
      SHOW_DELAY_MS + BANNER_MS,
    );
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [signature]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPanelOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [panelOpen]);

  // Nothing wrong (or fixed since the last check): leave no trace.
  if (!signature) return null;

  const urgent = issues.length > 0 || Boolean(reminder?.expired);
  const tone = urgent
    ? "border-danger bg-danger text-background"
    : "border-warning bg-warning text-background";
  const title =
    issues.length > 0
      ? "Jira connection problem"
      : reminder?.expired
        ? "Jira API token expired"
        : "Jira API token rotation";
  const summary =
    issues.length > 0
      ? `${issues.map((issue) => issue.label).join(" and ")}: Jira status, progress and tasks may be missing.`
      : reminder
        ? `The Jira API token ${reminderTiming(reminder)}.`
        : "";

  const openPanel = () => {
    setBannerOpen(false);
    setPanelOpen(true);
  };

  return (
    <div
      ref={rootRef}
      className="fixed right-4 top-3 z-[46] flex flex-col items-end gap-2 print:hidden sm:right-6"
    >
      {panelOpen ? (
        <div className="flex items-start gap-2">
          <section
            role="dialog"
            aria-labelledby="jira-status-title"
            className="w-[min(360px,calc(100vw-5rem))] border border-border-strong bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.8)] animate-fade-in"
          >
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <span
                className={[
                  "flex size-5 items-center justify-center font-display text-xs font-bold",
                  tone,
                ].join(" ")}
                aria-hidden
              >
                !
              </span>
              <h2
                id="jira-status-title"
                className="font-display text-xs font-bold uppercase tracking-wide"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="ml-auto flex size-7 items-center justify-center border border-transparent text-muted transition-colors hover:border-border hover:text-foreground"
                aria-label="Close Jira status"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="space-y-3 px-4 py-3 text-xs leading-relaxed text-foreground">
              {issues.length > 0 ? (
                <>
                  <ul className="space-y-1.5">
                    {issues.map((issue) => (
                      <li
                        key={issue.instance}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="font-bold">{issue.label}</span>
                        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-danger">
                          {issueStatus(issue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted">
                    Projects stay listed in the workspace, but live Jira status,
                    progress, assignees and tasks from these sites may be
                    missing until the connection works again.
                  </p>
                  {canManage ? (
                    issues.some((issue) => issue.kind === "auth") ? (
                      <div className="space-y-2 border-t border-border pt-3">
                        <p>
                          The token owner creates a new API token (valid for one
                          year) and sends it with its expiry date to{" "}
                          <strong>blablabuild</strong>, who updates it in
                          Vercel.
                        </p>
                        <a
                          href={ATLASSIAN_TOKENS_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-foreground underline underline-offset-4 hover:text-muted"
                        >
                          Atlassian API tokens
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    ) : (
                      <p className="border-t border-border pt-3">
                        Jira did not answer. This usually clears up on its own;
                        contact <strong>blablabuild</strong> if it lasts.
                      </p>
                    )
                  ) : (
                    <p className="border-t border-border pt-3 text-muted">
                      No action needed from you. This notice disappears once
                      the connection is restored.
                    </p>
                  )}
                </>
              ) : null}

              {reminder ? (
                <div
                  className={
                    issues.length > 0 ? "border-t border-border pt-3" : ""
                  }
                >
                  <p>
                    The Jira API token{" "}
                    <strong>{reminderTiming(reminder)}</strong> (
                    {formatExpiry(reminder.expiresOn)}). Contact{" "}
                    <strong>blablabuild</strong> to recycle it and update the
                    server environment.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
          <IndicatorButton
            tone={tone}
            label={title}
            expanded
            onClick={() => setPanelOpen(false)}
          />
        </div>
      ) : bannerOpen ? (
        <button
          type="button"
          onClick={openPanel}
          className="w-[min(340px,calc(100vw-2rem))] border border-border-strong bg-surface px-3 pb-0 pt-2.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.65)] animate-fade-in transition-colors hover:border-foreground"
          aria-label={`${title}. Open details`}
        >
          <span className="flex items-center gap-2">
            <span
              className={[
                "flex size-5 shrink-0 items-center justify-center font-display text-xs font-bold",
                tone,
              ].join(" ")}
              aria-hidden
            >
              !
            </span>
            <span className="font-display truncate text-[10px] font-bold uppercase tracking-wide text-foreground">
              {title}
            </span>
          </span>
          <span className="mt-1.5 block text-[11px] leading-snug text-foreground/80">
            {summary}
          </span>
          <span
            className="mt-2.5 block h-0.5 w-full origin-left bg-foreground animate-chat-preview-timer"
            style={{ animationDuration: `${BANNER_MS}ms` }}
            aria-hidden
          />
        </button>
      ) : (
        <IndicatorButton tone={tone} label={title} onClick={openPanel} />
      )}
    </div>
  );
}

function IndicatorButton({
  tone,
  label,
  expanded = false,
  onClick,
}: {
  tone: string;
  label: string;
  expanded?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex size-9 shrink-0 items-center justify-center border font-display text-base font-bold transition-opacity hover:opacity-85",
        tone,
      ].join(" ")}
      aria-expanded={expanded}
      aria-label={expanded ? "Close Jira status" : `${label}. Open details`}
      title={label}
    >
      !
    </button>
  );
}
