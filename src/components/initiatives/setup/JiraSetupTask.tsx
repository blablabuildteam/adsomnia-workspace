"use client";

import { useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import type { JiraSetupData } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import { normalizeUrl } from "@/lib/validation-data";

type Props = {
  data: JiraSetupData;
  boardUrl: string;
  onBoardUrlChange: (value: string) => void;
  readOnly?: boolean;
  onComplete: (boardUrl: string) => void;
};

export function JiraSetupTask({
  data,
  boardUrl,
  onBoardUrlChange,
  readOnly,
  onComplete,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const savedUrl = data.boardUrl || data.projectUrl;

  const handleComplete = () => {
    const url = normalizeUrl(boardUrl);
    if (!url) {
      setError("A valid Jira board URL is required.");
      return;
    }
    setError(null);
    onComplete(url);
  };

  if (data.status === "completed") {
    return (
      <div className="flex items-center gap-3">
        <Check className="size-4 text-success" />
        <div>
          <p className="text-xs text-foreground">Jira board linked</p>
          {savedUrl && (
            <a
              href={savedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline"
            >
              Open board
              <ExternalLink className="size-2.5" />
            </a>
          )}
        </div>
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
      <p className="text-xs text-muted">
        Create the Jira project and board externally (Adsomnia, Bending The
        Rules, or Harlem Next), paste the board link, then mark the task
        complete.
      </p>

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

      <button
        type="button"
        onClick={handleComplete}
        disabled={!boardUrl.trim()}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
      >
        <Check className="size-3.5" />
        Confirm Linked
      </button>
    </div>
  );
}
