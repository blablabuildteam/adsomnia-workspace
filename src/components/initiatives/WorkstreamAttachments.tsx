"use client";

import { useState, useTransition, useSyncExternalStore } from "react";
import { Paperclip } from "lucide-react";
import {
  addWorkstreamAttachment,
  addWorkstreamFile,
  removeWorkstreamAttachment,
} from "@/app/(workspace)/workstreams/[id]/attachment-actions";
import {
  addShareAttachment,
  addShareFile,
} from "@/app/share/[token]/actions";
import { AttachmentZone } from "@/components/initiatives/AttachmentZone";
import { inputClass } from "@/lib/form-styles";
import {
  SHARE_GUEST_NAME_MAX,
  SHARE_GUEST_NAME_MIN,
  SHARE_GUEST_NAME_STORAGE_KEY,
} from "@/lib/share-guest";
import type { Attachment } from "@/lib/validation-data";

type Props = {
  initiativeId: number;
  attachments: Attachment[];
  shareToken?: string;
  currentUserId?: string;
  canRemove?: boolean;
};

function subscribeGuestName(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getGuestNameSnapshot(): string {
  try {
    return localStorage.getItem(SHARE_GUEST_NAME_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function getGuestNameServerSnapshot(): string {
  return "";
}

export function WorkstreamAttachments({
  initiativeId,
  attachments,
  shareToken,
  currentUserId,
  canRemove = false,
}: Props) {
  const isGuestMode = Boolean(shareToken) && !currentUserId;
  const [items, setItems] = useState(attachments);
  const [trackedAttachments, setTrackedAttachments] = useState(attachments);
  if (trackedAttachments !== attachments) {
    setTrackedAttachments(attachments);
    setItems(attachments);
  }
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const storedGuestName = useSyncExternalStore(
    subscribeGuestName,
    getGuestNameSnapshot,
    getGuestNameServerSnapshot,
  );
  const [guestName, setGuestName] = useState(storedGuestName);
  const [guestNameDraft, setGuestNameDraft] = useState(storedGuestName);
  const [guestNameReady, setGuestNameReady] = useState(
    !isGuestMode || storedGuestName.length >= SHARE_GUEST_NAME_MIN,
  );
  if (!isGuestMode && !guestNameReady) {
    setGuestNameReady(true);
  }
  if (
    isGuestMode &&
    storedGuestName.length >= SHARE_GUEST_NAME_MIN &&
    guestName !== storedGuestName &&
    !guestNameReady
  ) {
    setGuestName(storedGuestName);
    setGuestNameDraft(storedGuestName);
    setGuestNameReady(true);
  }

  function saveGuestName() {
    const trimmed = guestNameDraft.trim();
    if (
      trimmed.length < SHARE_GUEST_NAME_MIN ||
      trimmed.length > SHARE_GUEST_NAME_MAX
    ) {
      return;
    }
    try {
      localStorage.setItem(SHARE_GUEST_NAME_STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
    setGuestName(trimmed);
    setGuestNameReady(true);
  }

  async function persistLink(item: Attachment) {
    if (!item.url) return { error: "Enter a valid link." };
    if (shareToken) {
      return addShareAttachment(shareToken, {
        guestName,
        title: item.title,
        url: item.url,
        kind: item.kind,
        pageTitle: item.pageTitle,
        fileName: item.fileName,
        fileSize: item.fileSize,
        mimeType: item.mimeType,
      });
    }
    return addWorkstreamAttachment(initiativeId, {
      title: item.title,
      url: item.url,
      kind: item.kind,
      pageTitle: item.pageTitle,
      fileName: item.fileName,
      fileSize: item.fileSize,
      mimeType: item.mimeType,
    });
  }

  async function persistFile(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    if (shareToken) {
      formData.set("guestName", guestName);
      return addShareFile(shareToken, formData);
    }
    return addWorkstreamFile(initiativeId, formData);
  }

  function handleChange(next: Attachment[]) {
    const existing = new Set(items.map((item) => item.id));
    const added = next.filter((item) => !existing.has(item.id));
    const removed = canRemove
      ? items.filter((item) => !next.some((other) => other.id === item.id))
      : [];

    setItems(canRemove ? next : [...items, ...added]);
    setError(null);

    startTransition(async () => {
      for (const item of added) {
        if (item.kind === "file" && !item.url) continue;
        const result = await persistLink(item);
        if (result.error) {
          setError(result.error);
          setItems(attachments);
          return;
        }
        if (result.attachment) {
          setItems((current) =>
            current.map((row) => (row.id === item.id ? result.attachment! : row)),
          );
        }
      }
      for (const item of removed) {
        const result = await removeWorkstreamAttachment(initiativeId, item.id);
        if (result.error) {
          setError(result.error);
          setItems(attachments);
          return;
        }
      }
    });
  }

  async function handleFilesAdded(files: File[]) {
    setError(null);
    startTransition(async () => {
      for (const file of files) {
        const result = await persistFile(file);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.attachment) {
          setItems((current) => [result.attachment!, ...current]);
        }
      }
    });
  }

  return (
    <section className="border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <Paperclip className="size-3.5 text-muted" />
          <h3 className="font-display text-xs font-bold uppercase tracking-wide">
            Attachments
          </h3>
          <span className="font-display text-[10px] font-bold tabular-nums text-muted">
            {items.length}
          </span>
        </div>
        {pending && (
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Saving…
          </span>
        )}
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        {isGuestMode && !guestNameReady ? (
          <div>
            <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Your name
            </p>
            <p className="mb-3 text-xs text-muted">
              Add your name once so the team can see who dropped each file.
            </p>
            <input
              type="text"
              value={guestNameDraft}
              maxLength={SHARE_GUEST_NAME_MAX}
              autoComplete="name"
              className={`${inputClass} text-xs`}
              placeholder="First and last name"
              onChange={(event) => setGuestNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveGuestName();
                }
              }}
            />
            <button
              type="button"
              onClick={saveGuestName}
              disabled={
                guestNameDraft.trim().length < SHARE_GUEST_NAME_MIN ||
                guestNameDraft.trim().length > SHARE_GUEST_NAME_MAX
              }
              className="mt-3 border border-foreground bg-foreground px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        ) : (
          <>
            {isGuestMode && (
              <p className="text-xs text-muted">
                Adding as{" "}
                <span className="font-medium text-foreground">{guestName}</span>
                .{" "}
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => setGuestNameReady(false)}
                >
                  Change name
                </button>
              </p>
            )}
            <AttachmentZone
              attachments={items}
              onChange={handleChange}
              onFilesAdded={handleFilesAdded}
              canRemove={canRemove}
            />
            <p className="text-[11px] text-muted">
              Drop files, add a URL, or pick from Google Drive. Files can be up
              to 4 MB.
            </p>
          </>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </section>
  );
}
