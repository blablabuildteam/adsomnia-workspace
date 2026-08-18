"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
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
  titleFromUrl,
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

/* ─── Google Picker API loader ─────────────────────────── */

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const PICKER_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

let gapiLoaded = false;
let gisLoaded = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureGapi(): Promise<void> {
  if (gapiLoaded) return;
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((resolve) => {
    window.gapi.load("picker", { callback: resolve });
  });
  gapiLoaded = true;
}

async function ensureGis(): Promise<void> {
  if (gisLoaded) return;
  await loadScript("https://accounts.google.com/gsi/client");
  gisLoaded = true;
}

type DrivePickedFile = {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
};

function mimeToKind(mimeType: string): AttachmentKind {
  if (mimeType === "application/vnd.google-apps.document") return "google-doc";
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "google-sheet";
  if (mimeType === "application/vnd.google-apps.presentation") return "google-slides";
  if (mimeType === "application/vnd.google-apps.form") return "google-form";
  return "google-drive";
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
  const isLink = attachment.url && attachment.kind !== "file";

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
        <p className="truncate text-xs font-medium text-foreground">
          {attachment.title}
        </p>
        <p className="flex items-center gap-1.5 text-[10px] text-muted/70">
          <span
            className="inline-block shrink-0 border px-1 py-px font-display text-[8px] font-bold uppercase tracking-wider"
            style={{ borderColor: `${color}50`, color }}
          >
            {label}
          </span>
          {attachment.pageTitle && (
            <span className="truncate">{attachment.pageTitle}</span>
          )}
          {attachment.fileSize != null && (
            <span className="shrink-0 tabular-nums">
              {formatFileSize(attachment.fileSize)}
            </span>
          )}
        </p>
      </div>
      {isLink && (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted/40 transition-colors hover:text-foreground"
          title="Open link"
        >
          <ExternalLink className="size-3" />
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
  readOnly?: boolean;
};

export function AttachmentZone({ attachments, onChange, readOnly }: Props) {
  const [dragging, setDragging] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  const dragCounter = useRef(0);
  const tokenClientRef = useRef<google.accounts.oauth2.TokenClient | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const hasPickerConfig = Boolean(GOOGLE_API_KEY && GOOGLE_CLIENT_ID);

  /* ── Init GIS token client once ──────────────────────── */

  const initTokenClient = useCallback(async () => {
    if (tokenClientRef.current || !hasPickerConfig) return;
    await ensureGis();
    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: PICKER_SCOPE,
      callback: () => {/* handled inline in openPicker */},
    });
  }, [hasPickerConfig]);

  useEffect(() => {
    if (hasPickerConfig) initTokenClient();
  }, [hasPickerConfig, initTokenClient]);

  /* ── Helpers ─────────────────────────────────────────── */

  function addFiles(files: FileList | File[]) {
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
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
    const title = kind === "link" ? hostFromUrl(url) : titleFromUrl(url);
    const id = attachUid();
    const next: Attachment = { id, kind, title, url };

    onChange([...attachments, next]);
    setLinkInput("");
    setShowLinkInput(false);
    setLinkError(null);

    if (kind === "link") {
      void fetchPageTitle(url).then((pageTitle) => {
        if (!pageTitle) return;
        onChange(
          attachmentsRef.current.map((item) =>
            item.id === id ? { ...item, pageTitle } : item,
          ),
        );
      });
    }
  }

  function addDriveFiles(files: DrivePickedFile[]) {
    const newAttachments: Attachment[] = files.map((f) => ({
      id: attachUid(),
      kind: mimeToKind(f.mimeType),
      title: f.name,
      url: f.url,
      fileName: f.name,
      fileSize: f.sizeBytes,
      mimeType: f.mimeType,
    }));
    onChange([...attachments, ...newAttachments]);
  }

  function removeAttachment(id: string) {
    onChange(attachments.filter((a) => a.id !== id));
  }

  /* ── Google Drive Picker ─────────────────────────────── */

  async function openPicker() {
    if (!hasPickerConfig) {
      setPickerError("Google Drive Picker requires NEXT_PUBLIC_GOOGLE_CLIENT_ID to be configured.");
      return;
    }

    setPickerLoading(true);
    setPickerError(null);

    try {
      await Promise.all([ensureGapi(), ensureGis()]);

      if (!tokenClientRef.current) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: PICKER_SCOPE,
          callback: () => {},
        });
      }

      const getToken = (): Promise<string> =>
        new Promise((resolve, reject) => {
          if (accessTokenRef.current) {
            resolve(accessTokenRef.current);
            return;
          }
          tokenClientRef.current!.callback = (response) => {
            if (response.error) {
              reject(new Error(response.error));
              return;
            }
            accessTokenRef.current = response.access_token;
            resolve(response.access_token);
          };
          tokenClientRef.current!.requestAccessToken({ prompt: "" });
        });

      const token = await getToken();

      const docsView = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const picker = new window.google.picker.PickerBuilder()
        .addView(docsView)
        .addView(new window.google.picker.DocsView(window.google.picker.ViewId.RECENTLY_PICKED))
        .setOAuthToken(token)
        .setDeveloperKey(GOOGLE_API_KEY)
        .setCallback((data: google.picker.ResponseObject) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const files: DrivePickedFile[] = data.docs.map((doc) => ({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              url: doc.url,
              sizeBytes: doc.sizeBytes,
            }));
            addDriveFiles(files);
          }
        })
        .setTitle("Select files from Google Drive")
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .build();

      picker.setVisible(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to open picker";
      if (msg.includes("popup_closed") || msg.includes("access_denied")) {
        // user cancelled — not an error
      } else {
        setPickerError(msg);
      }
    } finally {
      setPickerLoading(false);
    }
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

        {/* Three action buttons */}
        <div className="grid grid-cols-3 divide-x divide-border">
          {/* Upload */}
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

          {/* Google Drive */}
          <button
            type="button"
            onClick={openPicker}
            disabled={pickerLoading}
            className="group flex flex-col items-center gap-2 px-3 py-4 transition-colors hover:bg-foreground/[0.03] disabled:opacity-50"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logos/google-drive.png"
              alt=""
              className="size-5 object-contain transition-opacity group-hover:opacity-80"
            />
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors group-hover:text-foreground">
              {pickerLoading ? "Loading…" : "Google Drive"}
            </span>
          </button>

          {/* URL */}
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

      {/* Picker error */}
      {pickerError && (
        <p className="text-[11px] text-btr">
          {pickerError}
        </p>
      )}

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
              onRemove={() => removeAttachment(a.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { AttachmentChip };
