"use client";

import { useEffect, useState } from "react";
import {
  FolderOpen,
  Copy,
  Check,
  ExternalLink,
  Pencil,
  HardDrive,
} from "lucide-react";
import {
  normalizeUrl,
  type DriveFolderLink,
  type DriveSetupData,
} from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import {
  canCreateProjectDrive,
  createProjectDrive,
  fetchDriveFolderName,
  preloadGoogleDriveAuth,
} from "@/lib/integrations/google-drive-browser";
import { SetupCreateOrLinkRow } from "./SetupCreateOrLinkRow";

type Props = {
  data: DriveSetupData;
  suggestedName?: string;
  driveUrl: string;
  folders?: DriveFolderLink[];
  onDriveUrlChange: (value: string) => void;
  readOnly?: boolean;
  onComplete: (
    driveName: string,
    driveUrl?: string,
    folders?: DriveFolderLink[],
  ) => void;
};

function DriveFolderLinks({ folders }: { folders: DriveFolderLink[] }) {
  if (folders.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {folders.map((folder) => (
        <li key={folder.id}>
          <a
            href={folder.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-[11px] text-[#38BDF8] hover:underline"
          >
            {folder.name}
            <ExternalLink className="size-2.5" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function DriveSetupTask({
  data,
  suggestedName,
  driveUrl,
  folders,
  onDriveUrlChange,
  readOnly,
  onComplete,
}: Props) {
  const suggestion = suggestedName || data.suggestedName;
  const savedUrl = data.driveUrl || "";
  const [createdFolders, setCreatedFolders] = useState<DriveFolderLink[] | null>(
    null,
  );
  const savedFolders = createdFolders ?? data.folders ?? folders ?? [];
  const [loadedFolderName, setLoadedFolderName] = useState<string | null>(null);
  const savedName = loadedFolderName || data.driveName || suggestion;
  const [driveName, setDriveName] = useState(data.driveName || suggestion);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const configured = canCreateProjectDrive();

  useEffect(() => {
    preloadGoogleDriveAuth();
  }, []);

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

    const createdPromise = createProjectDrive(name);
    setError(null);
    setInfo(null);
    setCreating(true);
    try {
      const created = await createdPromise;
      setDriveName(created.name);
      onDriveUrlChange(created.url);
      setLoadedFolderName(created.name);
      if (created.folderError) {
        setInfo(
          created.kind === "folder"
            ? `Created a project folder in your Google Drive. ${created.folderError}`
            : created.folderError,
        );
      } else if (created.kind === "folder") {
        setInfo(
          "Created a project folder in your Google Drive, including the recommended folders. Shared Drive creation is not available for this account.",
        );
      }
      setCreatedFolders(created.folders);
      onComplete(created.name, created.url, created.folders);
      setEditing(false);
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
    const url = normalizeUrl(driveUrl);
    let name = driveName.trim();
    if (!url) {
      setError("Paste a Google Drive folder or Shared Drive link.");
      return;
    }
    setError(null);
    try {
      const googleName = await fetchDriveFolderName(url);
      if (googleName) {
        name = googleName;
        setLoadedFolderName(googleName);
      }
    } catch {
      /* keep the typed name if Google does not return one */
    }
    onComplete(name || suggestion, url);
    setEditing(false);
  };

  if (data.status === "completed" && !editing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <FolderOpen className="mt-0.5 size-4 shrink-0 text-success" />
          <div className="min-w-0">
            <p className="text-xs text-foreground">{savedName}</p>
            {savedUrl ? (
              <a
                href={savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline"
              >
                Open in Google Drive
                <ExternalLink className="size-2.5" />
              </a>
            ) : data.completedAt ? (
              <p className="mt-0.5 text-[10px] text-muted">
                Drive confirmed ·{" "}
                {new Date(data.completedAt).toLocaleDateString("en-US", {
                  dateStyle: "medium",
                })}
              </p>
            ) : null}
            <DriveFolderLinks folders={savedFolders} />
            {info ? <p className="mt-2 text-[11px] text-muted">{info}</p> : null}
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
          Create a Shared Drive for this project with your Google account. The
          recommended folder structure is created in the same step.
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

      {!configured && (
        <p className="text-[11px] text-btr">
          Google Drive is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          then reload — or paste an existing Drive URL below.
        </p>
      )}

      <SetupCreateOrLinkRow
        create={
          configured
            ? {
                label: "Create Google Drive with folders",
                busyLabel: "Creating Drive and folders…",
                busy: creating,
                disabled: !(driveName.trim() || suggestion),
                icon: <HardDrive className="size-3.5" />,
                onClick: () => void handleCreate(),
              }
            : undefined
        }
        urlLabel="Drive URL"
        urlValue={driveUrl}
        urlPlaceholder="https://drive.google.com/drive/folders/..."
        urlDisabled={creating}
        onUrlChange={(value) => {
          onDriveUrlChange(value);
          setError(null);
        }}
        saveLabel="Save Drive Link"
        saveDisabled={creating || !driveUrl.trim()}
        onSave={() => void handleManualSave()}
        extra={
          editing ? (
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
          ) : null
        }
      />

      {info && <p className="text-[11px] text-muted">{info}</p>}
      {error && <p className="text-[11px] text-btr">{error}</p>}
    </div>
  );
}
