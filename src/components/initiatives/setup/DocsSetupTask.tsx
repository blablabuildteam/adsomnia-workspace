"use client";

import { useState } from "react";
import { Check, FileText, Plus, X, ExternalLink } from "lucide-react";
import type { Attachment } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import {
  detectAttachmentKind,
  attachmentKindLabel,
  normalizeUrl,
  titleFromUrl,
} from "@/lib/validation-data";

type Props = {
  linkedDocs: Attachment[];
  driveUrl?: string;
  readOnly?: boolean;
  onComplete: (docs: Attachment[]) => void;
};

export function DocsSetupTask({ linkedDocs, driveUrl, readOnly, onComplete }: Props) {
  const [docs, setDocs] = useState<Attachment[]>(linkedDocs);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const addDoc = () => {
    const url = normalizeUrl(newUrl);
    if (!url) return;
    const kind = detectAttachmentKind(url);
    const title = newTitle.trim() || titleFromUrl(url);
    setDocs((prev) => [
      ...prev,
      { id: crypto.randomUUID(), kind, title, url },
    ]);
    setNewUrl("");
    setNewTitle("");
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  if (readOnly) {
    return (
      <div className="space-y-2">
        {docs.length === 0 && (
          <p className="text-xs text-muted">No documentation linked yet.</p>
        )}
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center gap-2 text-xs">
            <FileText className="size-3.5 text-muted" />
            {doc.url ? (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#38BDF8] hover:underline"
              >
                {doc.title}
              </a>
            ) : (
              <span>{doc.title}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Add the project documentation to the Google Drive (business case,
        requirements, scoping proposal). Documents from scoping are pre-loaded.
      </p>

      {driveUrl && (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-[#38BDF8]/30 bg-[#38BDF8]/10 px-3 py-2 text-xs text-[#38BDF8] hover:bg-[#38BDF8]/20"
        >
          <ExternalLink className="size-3.5" />
          Open Project Drive
        </a>
      )}

      {docs.length > 0 && (
        <div className="space-y-1.5">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center gap-2 text-xs">
                <FileText className="size-3.5 text-muted" />
                <span>{doc.title}</span>
                <span className="text-[9px] uppercase text-muted/50">
                  {attachmentKindLabel(doc.kind)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeDoc(doc.id)}
                className="text-muted hover:text-btr"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          className={inputClass}
          placeholder="Paste document URL…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDoc();
            }
          }}
        />
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className={`${inputClass} sm:w-48`}
          placeholder="Title (optional)"
        />
        <button
          type="button"
          onClick={addDoc}
          disabled={!newUrl.trim()}
          className="flex items-center gap-1.5 border border-border px-3 py-2.5 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          Add
        </button>
      </div>

      <button
        type="button"
        onClick={() => onComplete(docs)}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
      >
        <Check className="size-3.5" />
        Confirm Documentation
      </button>
    </div>
  );
}
