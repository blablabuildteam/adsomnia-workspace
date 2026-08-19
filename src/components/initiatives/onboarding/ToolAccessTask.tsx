"use client";

import type { ToolAccessData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

type Props = {
  data: ToolAccessData;
  readOnly?: boolean;
  onComplete: () => void;
};

export function ToolAccessTask({ data, readOnly, onComplete }: Props) {
  if (data.status === "completed") {
    return (
      <CompletedLine completedAt={data.completedAt}>
        Team confirmed they have access to Slack, Jira, and Google Drive
      </CompletedLine>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting confirmation that the team has access to all project tools.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Ask the team to open Slack, Jira, and Google Drive now — invites that
        never arrived surface immediately, and the links are in the Project
        Workspace panel above.
      </p>
      <ConfirmRow
        label="Everyone has received their invites and can access all three tools"
        onConfirm={onComplete}
      />
    </div>
  );
}
