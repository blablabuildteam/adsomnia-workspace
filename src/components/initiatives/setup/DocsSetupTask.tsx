"use client";

import { ExternalLink } from "lucide-react";
import { getStageColor } from "@/data/workflow";
import type { DocsSetupData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "../onboarding/ConfirmRow";

const ACCENT = getStageColor("setup");

type Props = {
  data: DocsSetupData;
  driveUrl?: string;
  readOnly?: boolean;
  onComplete: () => void;
};

export function DocsSetupTask({ data, driveUrl, readOnly, onComplete }: Props) {
  const status = data?.status ?? "pending";
  if (status === "completed") {
    return (
      <CompletedLine accent={ACCENT} completedAt={data?.completedAt}>
        Documentation confirmed in the project Drive
      </CompletedLine>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting confirmation that documentation is stored in Drive.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-xs text-muted">
          Check that briefing, scope, and delivery files are stored in the
          project Drive folders created in the previous step.
        </p>
        {driveUrl ? (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 border border-border bg-fill-subtle px-3 py-2 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            Open Google Drive
            <ExternalLink className="size-3" />
          </a>
        ) : null}
      </div>

      <ConfirmRow
        accent={ACCENT}
        label="All documentation is stored in the Drive folders"
        blockedReason={
          driveUrl ? null : "Finish Create Google Drive first."
        }
        onConfirm={onComplete}
      />
    </div>
  );
}
