"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeSetupTask } from "@/app/(workspace)/workstreams/[id]/actions";
import { createProjectDrive } from "@/lib/integrations/google-drive-browser";
import {
  clearDriveOAuthPending,
  driveOAuthReturnUrl,
  parseDriveOAuthCallback,
  readDriveOAuthPending,
} from "@/lib/integrations/google-drive-oauth";

export function GoogleDriveOAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState("Creating Google Drive…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const pending = readDriveOAuthPending();
      const fallback = pending?.returnTo || "/dashboard";
      const parsed = parseDriveOAuthCallback(
        window.location.hash,
        window.location.search,
      );

      function fail(message: string) {
        clearDriveOAuthPending();
        router.replace(driveOAuthReturnUrl(fallback, message));
      }

      if (parsed.error) {
        fail(
          parsed.error === "access_denied"
            ? "Google Drive access was denied."
            : parsed.error,
        );
        return;
      }

      if (!pending) {
        fail("Google Drive sign-in expired. Click Create again.");
        return;
      }

      if (!parsed.accessToken || parsed.state !== pending.state) {
        fail("Google Drive sign-in did not complete. Click Create again.");
        return;
      }

      try {
        if (!cancelled) setStatus("Creating Google Drive and folders…");
        const created = await createProjectDrive(
          pending.driveName,
          parsed.accessToken,
        );
        const formData = new FormData();
        formData.set("taskId", "drive");
        formData.set(
          "data",
          JSON.stringify({
            driveName: created.name,
            driveUrl: created.url,
            ...(created.folders.length > 0 ? { folders: created.folders } : {}),
          }),
        );
        const result = await completeSetupTask(pending.initiativeId, formData);
        clearDriveOAuthPending();
        if (result.error) {
          fail(result.error);
          return;
        }
        router.replace(driveOAuthReturnUrl(pending.returnTo));
      } catch (error) {
        fail(
          error instanceof Error
            ? error.message
            : "Could not create Google Drive. Try again.",
        );
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
        Google Drive
      </p>
      <p className="mt-3 text-sm text-foreground">{status}</p>
      <p className="mt-2 text-xs text-muted">
        Stay on this page until you return to the workstream.
      </p>
    </div>
  );
}
