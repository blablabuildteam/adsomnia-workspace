"use client";

import { useState } from "react";
import { FolderOpen, Copy, Check, ExternalLink } from "lucide-react";
import type { DriveSetupData } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";

type Props = {
  data: DriveSetupData;
  readOnly?: boolean;
  onComplete: (driveName: string, driveUrl?: string) => void;
};

export function DriveSetupTask({ data, readOnly, onComplete }: Props) {
  const [driveName, setDriveName] = useState(
    data.driveName || data.suggestedName,
  );
  const [driveUrl, setDriveUrl] = useState(data.driveUrl || "");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(driveName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data.status === "completed") {
    return (
      <div className="flex items-center gap-3">
        <FolderOpen className="size-4 text-success" />
        <div>
          <p className="text-xs text-foreground">
            {data.driveName || data.suggestedName}
          </p>
          {data.driveUrl && (
            <a
              href={data.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline"
            >
              Open in Google Drive
              <ExternalLink className="size-2.5" />
            </a>
          )}
          {!data.driveUrl && data.completedAt && (
            <p className="mt-0.5 text-[10px] text-muted">
              Drive confirmed · {new Date(data.completedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting Google Drive setup.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Create a shared Google Drive for this project. Use the suggested name
        below or choose your own.
      </p>

      <div>
        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Suggested Drive Name
          </span>
          <div className="mt-1 flex items-stretch gap-2">
            <input
              type="text"
              value={driveName}
              onChange={(e) => setDriveName(e.target.value)}
              className={`${inputClass} flex-1`}
              placeholder="Project Drive Name"
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
          Drive URL <span className="font-normal text-muted/50">(optional)</span>
        </span>
        <input
          type="url"
          value={driveUrl}
          onChange={(e) => setDriveUrl(e.target.value)}
          className={`${inputClass} mt-1`}
          placeholder="https://drive.google.com/drive/folders/..."
        />
      </label>

      <button
        type="button"
        onClick={() => onComplete(driveName, driveUrl || undefined)}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
      >
        <Check className="size-3.5" />
        Confirm Created
      </button>
    </div>
  );
}
