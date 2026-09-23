"use client";

import { useRef, useState, useTransition, useSyncExternalStore } from "react";
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
import { AttachmentChip, AttachmentZone } from "@/components/initiatives/AttachmentZone";
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
  /** Phase-funnel files shown read-only above workstream chips. */
  extraAttachments?: Attachment[];
  /** Inline sits inside the details header; card is the standalone box. */
  variant?: "card" | "inline";
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
  extraAttachments = [],
  variant = "card",
}: Props) {
  const isGuestMode = Boolean(shareToken) && !currentUserId;
  const [items, setItems] = useState(attachments);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const persistingUrls = useRef(new Set<string>());
  const [trackedAttachments, setTrackedAttachments] = useState(attachments);
  if (trackedAttachments !== attachments) {
    setTrackedAttachments(attachments);
    itemsRef.current = attachments;
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
    const current = itemsRef.current;
    const existingIds = new Set(current.map((item) => item.id));
    const existingUrls = new Set(
      current
        .map((item) => item.url)
        .filter((url): url is string => Boolean(url)),
    );
    const added = next.filter((item) => {
      if (existingIds.has(item.id)) return false;
      if (!item.id.startsWith("att-")) return false;
      if (item.kind === "file" && !item.url) return false;
      if (item.url && (existingUrls.has(item.url) || persistingUrls.current.has(item.url))) {
        return false;
      }
      return true;
    });
    const removed = canRemove
      ? current.filter((item) => {
          if (next.some((other) => other.id === item.id)) return false;
          if (item.url && next.some((other) => other.url === item.url)) {
            return false;
          }
          return true;
        })
      : [];

    const optimistic = canRemove && removed.length > 0 ? next : [...current, ...added];
    itemsRef.current = optimistic;
    setItems(optimistic);
    setError(null);

    startTransition(async () => {
      for (const item of added) {
        if (item.url) persistingUrls.current.add(item.url);
        const result = await persistLink(item);
        if (item.url) persistingUrls.current.delete(item.url);
        if (result.error) {
          setError(result.error);
          itemsRef.current = attachments;
          setItems(attachments);
          return;
        }
        if (result.attachment) {
          setItems((rows) => {
            const mapped = rows.map((row) =>
              row.id === item.id ? result.attachment! : row,
            );
            itemsRef.current = mapped;
            return mapped;
          });
        }
      }
      for (const item of removed) {
        const result = await removeWorkstreamAttachment(initiativeId, item.id);
        if (result.error) {
          setError(result.error);
          itemsRef.current = attachments;
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
          setItems((current) => {
            const next = [result.attachment!, ...current];
            itemsRef.current = next;
            return next;
          });
        }
      }
    });
  }

  const seen = new Set<string>();
  const displayItems: { attachment: Attachment; removable: boolean }[] = [];
  for (const item of extraAttachments) {
    const key = item.url?.trim() || `id:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    displayItems.push({ attachment: item, removable: false });
  }
  for (const item of items) {
    const key = item.url?.trim() || `id:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    displayItems.push({ attachment: item, removable: canRemove });
  }

  const addBody = (
    <>
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
          {displayItems.length > 0 && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {displayItems.map(({ attachment, removable }) => (
                <AttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  readOnly={!removable}
                  onRemove={
                    removable
                      ? () =>
                          handleChange(
                            items.filter((item) => item.id !== attachment.id),
                          )
                      : undefined
                  }
                />
              ))}
            </div>
          )}
          <AttachmentZone
            attachments={items}
            onChange={handleChange}
            onFilesAdded={handleFilesAdded}
            resolveLinkTitle={false}
            showList={false}
            canRemove={canRemove}
          />
          <p className="text-[11px] text-muted">
            Drop files or add a URL. Files can be up to 4 MB.
          </p>
        </>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </>
  );

  if (variant === "inline") {
    return (
      <div className="border-t border-foreground/10 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.25em] text-foreground/30">
            Attachments
            {displayItems.length > 0 ? ` · ${displayItems.length}` : ""}
          </span>
          {pending && (
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Saving…
            </span>
          )}
        </div>
        <div className="mt-2.5 space-y-3">{addBody}</div>
      </div>
    );
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
            {displayItems.length}
          </span>
        </div>
        {pending && (
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Saving…
          </span>
        )}
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">{addBody}</div>
    </section>
  );
}
