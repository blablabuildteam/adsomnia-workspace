"use client";

import { useEffect, useRef, useState } from "react";
import { FolderOpen, Copy, Check, ExternalLink, Pencil } from "lucide-react";
import type { DriveSetupData } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import { fetchDriveFolderName } from "@/lib/integrations/google-drive-browser";

type Props = {
  data: DriveSetupData;
  suggestedName?: string;
  driveUrl: string;
  onDriveUrlChange: (value: string) => void;
  readOnly?: boolean;
  onComplete: (driveName: string, driveUrl?: string) => void;
};

export function DriveSetupTask({
  data,
  suggestedName,
  driveUrl,
  onDriveUrlChange,
  readOnly,
  onComplete,
}: Props) {
  const suggestion = suggestedName || data.suggestedName;
  const savedUrl = data.driveUrl || "";
  const [loadedFolderName, setLoadedFolderName] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState(false);
  const folderLabel =
    loadedFolderName ||
    (data.driveName && data.driveName !== suggestion ? data.driveName : null);
  const savedName = folderLabel || suggestion;
  const [driveName, setDriveName] = useState(data.driveName || suggestion);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (data.status !== "completed" || !savedUrl || readOnly) return;

    let cancelled = false;
    setLoadingName(true);
    void fetchDriveFolderName(savedUrl)
      .then((name) => {
        if (cancelled || !name) return;
        setLoadedFolderName(name);
        if (name !== data.driveName) {
          onCompleteRef.current(name, savedUrl);
        }
      })
      .catch(() => {
        /* keep the saved label if Google does not return a name */
      })
      .finally(() => {
        if (!cancelled) setLoadingName(false);
      });

    return () => {
      cancelled = true;
    };
  }, [savedUrl, readOnly, data.status, data.driveName]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(driveName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    const url = driveUrl.trim();
    let name = driveName.trim();
    if (url) {
      try {
        const googleName = await fetchDriveFolderName(url);
        if (googleName) {
          name = googleName;
          setLoadedFolderName(googleName);
        }
      } catch {
        /* keep the typed name if Google does not return one */
      }
    }
    onComplete(name || suggestion, url || undefined);
    setEditing(false);
  };

  if (data.status === "completed" && !editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FolderOpen className="size-4 shrink-0 text-success" />
          <div>
            {savedUrl ? (
              <>
                <p className="text-xs text-foreground">
                  {folderLabel ||
                    (loadingName ? "Loading folder name…" : "Drive folder")}
                </p>
                <a
                  href={savedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline"
                >
                  Open in Google Drive
                  <ExternalLink className="size-2.5" />
                </a>
              </>
            ) : (
              <>
                <p className="text-xs text-foreground">{savedName}</p>
                {data.completedAt && (
                  <p className="mt-0.5 text-[10px] text-muted">
                    Drive confirmed ·{" "}
                    {new Date(data.completedAt).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setDriveName(savedName);
              onDriveUrlChange(savedUrl);
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
      <div className="text-xs text-muted">
        Awaiting Google Drive setup.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!editing && (
        <p className="text-xs text-muted">
          Create a shared Google Drive for this project. Use the suggested name
          below or choose your own.
        </p>
      )}

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
          Drive URL <span className="font-normal text-muted/50">(optional)</span>
        </span>
        <input
          type="url"
          value={driveUrl}
          onChange={(e) => onDriveUrlChange(e.target.value)}
          className={`${inputClass} mt-1`}
          placeholder="https://drive.google.com/drive/folders/..."
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
        >
          <Check className="size-3.5" />
          {editing ? "Save Drive Link" : "Confirm Created"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setDriveName(savedName);
              onDriveUrlChange(savedUrl);
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
