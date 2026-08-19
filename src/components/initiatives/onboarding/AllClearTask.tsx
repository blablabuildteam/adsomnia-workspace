"use client";

import type { AllClearData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

type Props = {
  data: AllClearData;
  readOnly?: boolean;
  onComplete: () => void;
};

export function AllClearTask({ data, readOnly, onComplete }: Props) {
  if (data.status === "completed") {
    return (
      <CompletedLine completedAt={data.completedAt}>
        Room&apos;s briefed. Zero open questions. Traffic never sleeps.
      </CompletedLine>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting confirmation that the room is briefed and question-free.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Last off-ramp before we put this on the road. The briefing stuck, nobody
        is nodding along while secretly lost, and there are no questions left
        hanging in the room. Traffic never sleeps — a confused team is just a
        jam with extra steps.
      </p>
      <ConfirmRow
        label="Everyone is up to speed. No outstanding questions. Let the traffic move."
        onConfirm={onComplete}
      />
    </div>
  );
}
