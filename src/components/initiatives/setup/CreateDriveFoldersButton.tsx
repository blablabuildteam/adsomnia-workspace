"use client";

import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import {
  canCreateDriveFolders,
  createRecommendedDriveFolders,
  parseGoogleDriveFolderId,
  type CreatedDriveFolder,
} from "@/lib/integrations/google-drive-browser";

type Props = {
  driveUrl?: string;
  onCreated?: (folders: CreatedDriveFolder[]) => void;
};

export function CreateDriveFoldersButton({ driveUrl, onCreated }: Props) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const folderId = parseGoogleDriveFolderId(driveUrl ?? "");
  const configured = canCreateDriveFolders();

  const handleCreate = async () => {
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await createRecommendedDriveFolders(driveUrl ?? "");
      onCreated?.(result.folders);
      if (result.created.length === 0 && result.skipped.length > 0) {
        setMessage("Those folders are already in this Drive.");
      } else if (result.skipped.length > 0) {
        setMessage(
          `Created ${result.created.length} folders. Skipped ${result.skipped.length} that already existed.`,
        );
      } else {
        setMessage(`Created ${result.created.length} folders in this Drive.`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create folders. Try again.",
      );
    } finally {
      setPending(false);
    }
  };

  if (!configured) {
    return (
      <p className="text-[11px] text-muted">
        Google sign-in is not configured, so folders have to be created
        manually.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={pending || !folderId}
        className="inline-flex items-center gap-2 border border-foreground/20 bg-foreground/5 px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-foreground transition-colors hover:border-foreground hover:bg-foreground/10 disabled:opacity-40"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <FolderPlus className="size-3.5" />
        )}
        {pending ? "Creating folders…" : "Create folders with my Google account"}
      </button>
      {!folderId && (
        <p className="text-[11px] text-muted">
          Finish Create Google Drive first. Google will ask for permission to
          create the folders.
        </p>
      )}
      {message && <p className="text-[11px] text-success">{message}</p>}
      {error && <p className="text-[11px] text-btr">{error}</p>}
    </div>
  );
}
