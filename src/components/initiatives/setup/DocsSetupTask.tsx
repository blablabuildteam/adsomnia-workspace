"use client";

import { Check, ExternalLink } from "lucide-react";
import {
  RECOMMENDED_DRIVE_FOLDERS,
  type DriveFolderLink,
} from "@/lib/validation-data";
import { CreateDriveFoldersButton } from "./CreateDriveFoldersButton";

type Props = {
  linkedDocs?: unknown;
  folders?: DriveFolderLink[];
  driveUrl?: string;
  readOnly?: boolean;
  onFoldersCreated?: (folders: DriveFolderLink[]) => void;
  onComplete: (folders: DriveFolderLink[]) => void;
};

export function DocsSetupTask({
  folders = [],
  driveUrl,
  readOnly,
  onFoldersCreated,
  onComplete,
}: Props) {
  const folderByName = new Map(folders.map((folder) => [folder.name, folder]));
  const allLinked = RECOMMENDED_DRIVE_FOLDERS.every((folder) =>
    folderByName.has(folder.name),
  );

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Create the recommended folder structure in the project Drive, then
        confirm once the folders are in place.
      </p>

      <div className="border border-border bg-surface-elevated px-3 py-3">
        <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Recommended folder structure
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          {allLinked
            ? "Folders are ready. Open any folder to add briefing, scope, and delivery files."
            : "Create these folders in the project Drive so the team can find briefing, scope, and delivery files without hunting."}
        </p>
        <ol className="mt-3 space-y-2 font-mono text-[11px] text-foreground">
          {RECOMMENDED_DRIVE_FOLDERS.map((folder) => {
            const linked = folderByName.get(folder.name);
            return (
              <li key={folder.name} className="flex flex-wrap items-baseline gap-x-2">
                {linked ? (
                  <a
                    href={linked.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#38BDF8] hover:underline"
                  >
                    {folder.name}
                    <ExternalLink className="size-2.5" />
                  </a>
                ) : (
                  <span>{folder.name}</span>
                )}
                <span className="font-sans text-[10px] text-muted">
                  {folder.hint}
                </span>
              </li>
            );
          })}
        </ol>
        {!readOnly && !allLinked && (
          <div className="mt-4">
            <CreateDriveFoldersButton
              driveUrl={driveUrl}
              onCreated={onFoldersCreated}
            />
          </div>
        )}
      </div>

      {!readOnly && (
        <button
          type="button"
          onClick={() => onComplete(folders)}
          className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20"
        >
          <Check className="size-3.5" />
          Confirm Documentation
        </button>
      )}
    </div>
  );
}
