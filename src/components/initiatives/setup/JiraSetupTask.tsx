"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Pencil, SquareKanban } from "lucide-react";
import type { JiraSetupData } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import { normalizeUrl } from "@/lib/validation-data";

type Props = {
  data: JiraSetupData;
  suggestedName?: string;
  boardUrl: string;
  onBoardUrlChange: (value: string) => void;
  readOnly?: boolean;
  onComplete: (boardUrl: string, projectName: string) => void;
};

export function JiraSetupTask({
  data,
  suggestedName,
  boardUrl,
  onBoardUrlChange,
  readOnly,
  onComplete,
}: Props) {
  const suggestion = suggestedName || data.suggestedName || "";
  const savedUrl = data.boardUrl || data.projectUrl || "";
  const savedName = data.projectName || suggestion;
  const [boardName, setBoardName] = useState(data.projectName || suggestion);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(boardName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const url = normalizeUrl(boardUrl);
    if (!url) {
      setError("A valid Jira board URL is required.");
      return;
    }
    setError(null);
    onComplete(url, boardName.trim() || suggestion);
    setEditing(false);
  };

  if (data.status === "completed" && !editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SquareKanban className="size-4 shrink-0 text-success" />
          <div>
            <p className="text-xs text-foreground">{savedName || "Jira board"}</p>
            {savedUrl && (
              <a
                href={savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline"
              >
                Open in Jira
                <ExternalLink className="size-2.5" />
              </a>
            )}
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setBoardName(savedName);
              onBoardUrlChange(savedUrl);
              setError(null);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
          >
            <Pencil className="size-3" />
            Edit
          </button>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">Awaiting Jira board setup.</div>
    );
  }

  return (
    <div className="space-y-4">
      {!editing && (
        <p className="text-xs text-muted">
          Create the Jira project and board externally (Adsomnia, Bending The
          Rules, or Harlem Next). Use the suggested name below or choose your
          own, then paste the board link.
        </p>
      )}

      <div>
        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Suggested Board Name
          </span>
          <div className="mt-1 flex items-stretch gap-2">
            <input
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className={`${inputClass} flex-1`}
              placeholder={suggestion}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 border border-border px-3 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground"
            >
              {copied ? (
                <Check className="size-3.5 text-success" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        </label>
      </div>

      <label className="block">
        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Jira board URL<span className="ml-1 text-btr">*</span>
        </span>
        <input
          type="url"
          value={boardUrl}
          onChange={(e) => {
            onBoardUrlChange(e.target.value);
            setError(null);
          }}
          className={`${inputClass} mt-1`}
          placeholder="https://….atlassian.net/jira/software/projects/…"
          required
        />
      </label>

      {error && <p className="text-xs text-btr">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!boardUrl.trim()}
          className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
        >
          <Check className="size-3.5" />
          {editing ? "Save Jira Link" : "Confirm Created"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setBoardName(savedName);
              onBoardUrlChange(savedUrl);
              setError(null);
              setEditing(false);
            }}
            className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
