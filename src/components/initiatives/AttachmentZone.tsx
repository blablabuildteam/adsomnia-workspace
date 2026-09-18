"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  FileText,
  Sheet,
  Presentation,
  FileSpreadsheet,
  HardDrive,
  Link2,
  Paperclip,
  Trash2,
  ExternalLink,
  X,
  type LucideIcon,
} from "lucide-react";
import { fetchPageTitle } from "@/lib/link-preview";
import type { Attachment, AttachmentKind } from "@/lib/validation-data";
import {
  attachmentKindLabel,
  detectAttachmentKind,
  hostFromUrl,
  normalizeUrl,
} from "@/lib/validation-data";

/* ─── ID helper ────────────────────────────────────────── */

let _attachId = 0;
function attachUid(): string {
  return `att-${Date.now()}-${++_attachId}`;
}

/* ─── Kind → icon / color maps ─────────────────────────── */

const KIND_ICON: Record<AttachmentKind, LucideIcon> = {
  "google-doc": FileText,
  "google-sheet": FileSpreadsheet,
  "google-slides": Presentation,
  "google-form": Sheet,
  "google-drive": HardDrive,
  link: Link2,
  file: Paperclip,
};

const KIND_COLOR: Record<AttachmentKind, string> = {
  "google-doc": "#4285F4",
  "google-sheet": "#0F9D58",
  "google-slides": "#F4B400",
  "google-form": "#7627BB",
  "google-drive": "#1FA463",
  link: "#7E90A3",
  file: "#CEFF00",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── Attachment Chip ──────────────────────────────────── */

function AttachmentChip({
  attachment,
  onRemove,
  readOnly,
}: {
  attachment: Attachment;
  onRemove?: () => void;
  readOnly?: boolean;
}) {
  const Icon = KIND_ICON[attachment.kind];
  const color = KIND_COLOR[attachment.kind];
  const label = attachmentKindLabel(attachment.kind);
  const canOpen = Boolean(attachment.url);
  const openTarget = attachment.kind === "file" ? undefined : "_blank";
  const openRel = attachment.kind === "file" ? undefined : "noopener noreferrer";
  const host =
    attachment.kind !== "file" && attachment.url
      ? hostFromUrl(attachment.url)
      : null;
  const subtitle =
    attachment.pageTitle &&
    attachment.pageTitle !== attachment.title &&
    attachment.pageTitle !== host
      ? attachment.pageTitle
      : host && host !== attachment.title
        ? host
        : null;

  return (
    <div
      className="group flex items-center gap-2 border px-2.5 py-1.5 transition-colors"
      style={{ borderColor: `${color}40` }}
    >
      <div
        className="flex size-5 shrink-0 items-center justify-center"
        style={{ color }}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        {canOpen ? (
          <a
            href={attachment.url}
            target={openTarget}
            rel={openRel}
            download={
              attachment.kind === "file" ? attachment.fileName : undefined
            }
            className="block min-w-0 truncate text-xs font-medium text-foreground underline-offset-2 hover:underline"
            title={attachment.title}
          >
            {attachment.title}
          </a>
        ) : (
          <p className="truncate text-xs font-medium text-foreground">
            {attachment.title}
          </p>
        )}
        <p className="flex items-center gap-1.5 text-[10px] text-muted/70">
          <span
            className="inline-block shrink-0 border px-1 py-px font-display text-[8px] font-bold uppercase tracking-wider"
            style={{ borderColor: `${color}50`, color }}
          >
            {label}
          </span>
          {subtitle && <span className="truncate">{subtitle}</span>}
          {attachment.fileSize != null && (
            <span className="shrink-0 tabular-nums">
              {formatFileSize(attachment.fileSize)}
            </span>
          )}
          {attachment.addedBy && (
            <span className="truncate">{attachment.addedBy}</span>
          )}
        </p>
      </div>
      {canOpen && (
        <a
          href={attachment.url}
          target={openTarget}
          rel={openRel}
          download={
            attachment.kind === "file" ? attachment.fileName : undefined
          }
          className="flex size-7 shrink-0 items-center justify-center border border-border text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background"
          title={attachment.kind === "file" ? "Download" : "Open link"}
          aria-label={
            attachment.kind === "file"
              ? `Download ${attachment.title}`
              : `Open ${attachment.title}`
          }
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
      {!readOnly && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Remove ${attachment.title}`}
        >
          <Trash2 className="size-3 text-muted/50 hover:text-btr" />
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */

type Props = {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  /** When set, dropped/chosen files are uploaded instead of stored as metadata-only. */
  onFilesAdded?: (files: File[]) => Promise<void> | void;
  readOnly?: boolean;
  canRemove?: boolean;
};

export function AttachmentZone({
  attachments,
  onChange,
  onFilesAdded,
  readOnly,
  canRemove = true,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const dragCounter = useRef(0);

  /* ── Helpers ─────────────────────────────────────────── */

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (onFilesAdded) {
      void onFilesAdded(list);
      return;
    }
    const newAttachments: Attachment[] = list.map((file) => ({
      id: attachUid(),
      kind: "file" as const,
      title: file.name,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    }));
    onChange([...attachments, ...newAttachments]);
  }

  function addLink(raw: string) {
    const url = normalizeUrl(raw);
    if (!url) {
      setLinkError("Enter a valid link, e.g. google.nl");
      return;
    }

    const kind = detectAttachmentKind(url);
    const fallbackTitle =
      kind === "link" ? hostFromUrl(url) : attachmentKindLabel(kind);
    const id = attachUid();
    const next: Attachment = { id, kind, title: fallbackTitle, url };

    onChange([...attachments, next]);
    setLinkInput("");
    setShowLinkInput(false);
    setLinkError(null);

    void fetchPageTitle(url).then((pageTitle) => {
      if (!pageTitle) return;
      onChange(
        attachmentsRef.current.map((item) =>
          item.id === id ? { ...item, title: pageTitle, pageTitle } : item,
        ),
      );
    });
  }

  function removeAttachment(id: string) {
    onChange(attachments.filter((a) => a.id !== id));
  }

  /* ── Drag & Drop ─────────────────────────────────────── */

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setDragging(false);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragging(false);

    const text = e.dataTransfer.getData("text/plain")?.trim();
    if (text && normalizeUrl(text)) {
      addLink(text);
      return;
    }
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  /* ── Read-only ───────────────────────────────────────── */

  if (readOnly) {
    if (attachments.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {attachments.map((a) => (
          <AttachmentChip key={a.id} attachment={a} readOnly />
        ))}
      </div>
    );
  }

  /* ── Edit mode ───────────────────────────────────────── */

  return (
    <div className="space-y-2">
      {/* Drop overlay + action buttons */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={[
          "relative border border-dashed transition-colors",
          dragging
            ? "border-bbb bg-bbb/[0.06]"
            : "border-border",
        ].join(" ")}
      >
        {/* Drag overlay */}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60">
            <p className="font-display text-xs font-bold uppercase tracking-wide text-bbb">
              Drop to attach
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 divide-x divide-border">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center gap-2 px-3 py-4 transition-colors hover:bg-foreground/[0.03]"
          >
            <Paperclip className="size-4 text-muted/50 transition-colors group-hover:text-bbb" />
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors group-hover:text-foreground">
              Upload
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowLinkInput((v) => !v)}
            className="group flex flex-col items-center gap-2 px-3 py-4 transition-colors hover:bg-foreground/[0.03]"
          >
            <Link2 className="size-4 text-muted/50 transition-colors group-hover:text-hn" />
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors group-hover:text-foreground">
              URL
            </span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* URL input */}
      {showLinkInput && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="url"
            value={linkInput}
            onChange={(e) => {
              setLinkInput(e.target.value);
              if (linkError) setLinkError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addLink(linkInput); }
              if (e.key === "Escape") {
                setLinkInput("");
                setLinkError(null);
                setShowLinkInput(false);
              }
            }}
            placeholder="google.nl or https://…"
            className="min-w-0 flex-1 border border-border bg-surface-input px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => addLink(linkInput)}
            disabled={!linkInput.trim()}
            className="border border-border px-2 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-30"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkInput("");
              setLinkError(null);
              setShowLinkInput(false);
            }}
            className="text-muted/50 transition-colors hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
      {linkError && (
        <p className="text-[11px] text-btr">{linkError}</p>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((a) => (
            <AttachmentChip
              key={a.id}
              attachment={a}
              onRemove={canRemove ? () => removeAttachment(a.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { AttachmentChip };
