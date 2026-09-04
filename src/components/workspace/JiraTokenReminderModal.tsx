"use client";

import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Modal, ModalButton } from "@/components/ui/Modal";
import type { JiraTokenReminder } from "@/lib/integrations/jira-token-reminder";

type Props = {
  reminder: JiraTokenReminder;
};

function storageKey(expiresOn: string): string {
  return `adsomnia-jira-token-reminder:${expiresOn}`;
}

function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatExpiry(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    dateStyle: "long",
  });
}

function timingCopy(reminder: JiraTokenReminder): string {
  if (reminder.expired) {
    const days = Math.abs(reminder.daysRemaining);
    if (days === 1) return "expired yesterday";
    return `expired ${days} days ago`;
  }
  if (reminder.daysRemaining === 0) return "expires today";
  if (reminder.daysRemaining === 1) return "expires tomorrow";
  return `expires in ${reminder.daysRemaining} days`;
}

export function JiraTokenReminderModal({ reminder }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey(reminder.expiresOn)) === todayIso()) {
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [reminder.expiresOn]);

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey(reminder.expiresOn), todayIso());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const expired = reminder.expired;
  const dateLabel = formatExpiry(reminder.expiresOn);

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={expired ? "Jira API Token Expired" : "Jira API Token Rotation"}
      actions={
        <ModalButton variant="primary" onClick={dismiss}>
          Got it
        </ModalButton>
      }
    >
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center border border-bbb/30 bg-bbb/10">
          <KeyRound className="size-5 text-bbb" />
        </div>
        <div className="space-y-3 text-sm text-foreground">
          {expired ? (
            <p>
              The Jira API token used by Adsomnia Workspace{" "}
              <strong>{timingCopy(reminder)}</strong> ({dateLabel}). Board
              creation and Production overview will fail until a new token is
              in place.
            </p>
          ) : (
            <p>
              The Jira API token used by Adsomnia Workspace{" "}
              <strong>{timingCopy(reminder)}</strong> ({dateLabel}). Atlassian
              tokens last one year and must be recycled before they expire —
              otherwise board creation and Production overview will stop
              working.
            </p>
          )}
          <p className="text-muted">
            Contact <strong className="text-foreground">blablabuild</strong>{" "}
            {expired ? "immediately " : ""}
            to recycle the token and update the server environment.
          </p>
        </div>
      </div>
    </Modal>
  );
}
