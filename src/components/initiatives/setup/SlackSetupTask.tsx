"use client";

import { useState } from "react";
import { Hash, Copy, Check } from "lucide-react";
import type { SlackSetupData } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";

type Props = {
  data: SlackSetupData;
  channelName: string;
  onChannelNameChange: (value: string) => void;
  readOnly?: boolean;
  onComplete: (channelName: string) => void;
};

export function SlackSetupTask({
  data,
  channelName,
  onChannelNameChange,
  readOnly,
  onComplete,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopySuggestion = async () => {
    await navigator.clipboard.writeText(data.suggestedName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = () => {
    const name = channelName.trim().replace(/^#/, "");
    if (!name) {
      setError("Channel name is required.");
      return;
    }
    setError(null);
    onComplete(name);
  };

  if (data.status === "completed") {
    return (
      <div className="flex items-center gap-3">
        <Hash className="size-4 text-success" />
        <div>
          <p className="text-xs text-foreground">
            #{data.channelName || data.suggestedName}
          </p>
          <p className="mt-0.5 text-[10px] text-muted">
            Channel confirmed
            {data.completedAt &&
              ` · ${new Date(data.completedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
          </p>
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">Awaiting Slack channel setup.</div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Create a Slack channel for this project, enter the name, then mark the
        task complete. Suggested name:{" "}
        <button
          type="button"
          onClick={handleCopySuggestion}
          className="inline-flex items-center gap-1 font-mono text-foreground hover:text-success"
        >
          #{data.suggestedName}
          {copied ? (
            <Check className="size-3 text-success" />
          ) : (
            <Copy className="size-3 text-muted" />
          )}
        </button>
      </p>

      <label className="block">
        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Channel name<span className="ml-1 text-btr">*</span>
        </span>
        <div className="relative mt-1">
          <Hash className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
          <input
            type="text"
            value={channelName}
            onChange={(e) => {
              onChannelNameChange(
                e.target.value.toLowerCase().replace(/[^a-z0-9-_#]/g, "-"),
              );
              setError(null);
            }}
            className={`${inputClass} pl-8`}
            placeholder={data.suggestedName}
            required
          />
        </div>
      </label>

      {error && <p className="text-xs text-btr">{error}</p>}

      <button
        type="button"
        onClick={handleComplete}
        disabled={!channelName.trim()}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
      >
        <Check className="size-3.5" />
        Confirm Created
      </button>
    </div>
  );
}
