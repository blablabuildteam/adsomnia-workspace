"use client";

import { useState } from "react";
import {
  FolderOpen,
  Copy,
  Check,
  ExternalLink,
  Pencil,
  Loader2,
  HardDrive,
} from "lucide-react";
import type { DriveSetupData } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import {
  canCreateProjectDrive,
  createProjectDrive,
  fetchDriveFolderName,
} from "@/lib/integrations/google-drive-browser";

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
  const savedName = loadedFolderName || data.driveName || suggestion;
  const [driveName, setDriveName] = useState(data.driveName || suggestion);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const configured = canCreateProjectDrive();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(driveName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    const name = driveName.trim() || suggestion;
    if (!name) {
      setError("Drive name is required.");
      return;
    }
    if (!configured) {
      setError(
        "Google Drive is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID.",
      );
      return;
    }

    setError(null);
    setInfo(null);
    setCreating(true);
    try {
      const created = await createProjectDrive(name);
      setDriveName(created.name);
      onDriveUrlChange(created.url);
      setLoadedFolderName(created.name);
      if (created.kind === "folder") {
        setInfo(
          "Created a project folder in your Google Drive. Shared Drive creation is not available for this account.",
        );
      }
      onComplete(created.name, created.url);
      setEditing(false);
      setManualMode(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create Google Drive. Try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleManualSave = async () => {
    const url = driveUrl.trim();
    let name = driveName.trim();
    if (!url) {
      setError("Paste a Google Drive folder or Shared Drive link.");
      return;
    }
    setError(null);
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
    onComplete(name || suggestion, url);
    setEditing(false);
    setManualMode(false);
  };

  if (data.status === "completed" && !editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FolderOpen className="size-4 shrink-0 text-success" />
          <div>
            {savedUrl ? (
              <>
                <p className="text-xs text-foreground">{savedName}</p>
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
              setError(null);
              setInfo(null);
              setEditing(true);
              setManualMode(false);
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
          Create a Shared Drive for this project with your Google account. Use
          the suggested name below or choose your own.
        </p>
      )}

      <div>
        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Drive name<span className="ml-1 text-btr">*</span>
          </span>
          <div className="mt-1 flex items-stretch gap-2">
            <input
              type="text"
              value={driveName}
              onChange={(e) => {
                setDriveName(e.target.value);
                setError(null);
              }}
              className={`${inputClass} flex-1`}
              placeholder={suggestion}
              disabled={creating}
            />
            <button
              type="button"
              onClick={handleCopy}
              disabled={creating}
              className="flex items-center gap-1.5 border border-border px-3 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
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

      {!manualMode ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {configured ? (
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating || !(driveName.trim() || suggestion)}
              className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
            >
              {creating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <HardDrive className="size-3.5" />
              )}
              {creating
                ? "Creating Google Drive…"
                : "Create Google Drive with my account"}
            </button>
          ) : (
            <p className="text-[11px] text-btr">
              Google Drive is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              then reload — or link an existing Drive below.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setManualMode(true);
              setError(null);
            }}
            disabled={creating}
            className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-40"
          >
            Link an existing Drive instead
          </button>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Drive URL<span className="ml-1 text-btr">*</span>
            </span>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => {
                onDriveUrlChange(e.target.value);
                setError(null);
              }}
              className={`${inputClass} mt-1`}
              placeholder="https://drive.google.com/drive/folders/..."
              disabled={creating}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleManualSave()}
              className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
            >
              <Check className="size-3.5" />
              Save Drive Link
            </button>
            <button
              type="button"
              onClick={() => {
                setManualMode(false);
                setError(null);
              }}
              className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
            >
              Back to create
            </button>
          </div>
        </>
      )}

      {editing && !manualMode && (
        <button
          type="button"
          onClick={() => {
            setDriveName(savedName);
            onDriveUrlChange(savedUrl);
            setEditing(false);
            setError(null);
            setInfo(null);
          }}
          disabled={creating}
          className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-40"
        >
          Cancel
        </button>
      )}

      {info && <p className="text-[11px] text-muted">{info}</p>}
      {error && <p className="text-[11px] text-btr">{error}</p>}
    </div>
  );
}
