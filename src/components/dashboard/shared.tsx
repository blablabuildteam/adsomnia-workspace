import type { ReactNode } from "react";
import { STAGES, getStageColor } from "@/data/workflow";

export const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

export const STAGE_HREF: Record<string, string> = {
  idea: "/pipeline/initiatives",
  validation: "/pipeline/validation",
  scoping: "/pipeline/scoping",
  "go-nogo": "/pipeline/go-nogo",
  setup: "/pipeline/setup",
  onboarding: "/pipeline/onboarding",
  production: "/pipeline/production",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "Review",
  approved: "Approved",
  rejected: "Rejected",
  "on-hold": "On Hold",
  draft: "Draft",
};

const STATUS_COLOR: Record<string, string> = {
  submitted: "#38BDF8",
  approved: "#22c55e",
  rejected: "#FF3B1F",
  "on-hold": "#7E90A3",
  draft: "#666666",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? "#FFFFFF";
}

export function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function SectionHeading({
  kicker,
  children,
  trailing,
}: {
  kicker?: string;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        {kicker && (
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-sm font-bold uppercase tracking-wide">
          {children}
        </h2>
      </div>
      {trailing}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  return (
    <span
      className="border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: color, color }}
    >
      {statusLabel(status)}
    </span>
  );
}

export function nextStage(stageId: string) {
  const index = STAGES.findIndex((stage) => stage.id === stageId);
  if (index < 0 || index >= STAGES.length - 1) return null;
  return STAGES[index + 1];
}

export function StageChip({ stageId }: { stageId: string }) {
  const stage = STAGES.find((item) => item.id === stageId);
  const color = getStageColor(stageId);
  return (
    <span
      className="border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: color, color }}
    >
      {stage?.name ?? stageId}
    </span>
  );
}

export function StageProgress({ currentStageId }: { currentStageId: string }) {
  const currentIndex = STAGES.findIndex((stage) => stage.id === currentStageId);
  return (
    <ol className="flex items-center gap-1" aria-hidden>
      {STAGES.map((stage, index) => {
        const current = index === currentIndex;
        const done = currentIndex >= 0 && index < currentIndex;
        return (
          <li
            key={stage.id}
            title={stage.name}
            className="h-1 min-w-0 flex-1"
            style={{
              backgroundColor: current
                ? getStageColor(stage.id)
                : done
                  ? "rgba(255,255,255,0.35)"
                  : "rgba(255,255,255,0.08)",
            }}
          />
        );
      })}
    </ol>
  );
}
