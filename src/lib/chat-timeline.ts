import type { ActivityEntry, CommentEntry } from "@/lib/queries";

export type ChatSystemKind = "phase" | "status";

export type ChatCommentItem = {
  kind: "comment";
  id: string;
  createdAt: Date;
  userId: string | null;
  userName: string;
  body: string;
};

export type ChatSystemItem = {
  kind: "system";
  id: string;
  createdAt: Date;
  actorName: string;
  systemKind: ChatSystemKind;
  /** Short line shown in the divider, e.g. "Advanced to Validation". */
  label: string;
  /** Stage the event belongs to, for grouping remarks by phase. */
  stage: string;
};

export type ChatTimelineItem = ChatCommentItem | ChatSystemItem;

type StatusChatMeta = {
  systemKind: ChatSystemKind;
  label: string;
  stage: string;
};

const STATUS_CHAT_EVENTS: Record<string, StatusChatMeta> = {
  idea_submitted: {
    systemKind: "phase",
    label: "Entered Initiative",
    stage: "Initiative",
  },
  idea_resubmitted: {
    systemKind: "status",
    label: "Resubmitted for review",
    stage: "Initiative",
  },
  idea_rejected: {
    systemKind: "status",
    label: "Status changed to Rejected",
    stage: "Initiative",
  },
  idea_on_hold: {
    systemKind: "status",
    label: "Status changed to On Hold",
    stage: "Initiative",
  },
  idea_feedback: {
    systemKind: "status",
    label: "Sent back with feedback",
    stage: "Initiative",
  },
  approved_to_validation: {
    systemKind: "phase",
    label: "Advanced to Validation",
    stage: "Validation",
  },
  converted_to_fast_track: {
    systemKind: "phase",
    label: "Moved to Fast-Track",
    stage: "Fast-Track",
  },
  validation_submitted: {
    systemKind: "status",
    label: "Submitted for review",
    stage: "Validation",
  },
  validation_resubmitted: {
    systemKind: "status",
    label: "Resubmitted for review",
    stage: "Validation",
  },
  validation_approved: {
    systemKind: "phase",
    label: "Advanced to Scoping",
    stage: "Scoping",
  },
  validation_rejected: {
    systemKind: "status",
    label: "Status changed to Rejected",
    stage: "Validation",
  },
  validation_feedback: {
    systemKind: "status",
    label: "Sent back with feedback",
    stage: "Validation",
  },
  validation_on_hold: {
    systemKind: "status",
    label: "Status changed to On Hold",
    stage: "Validation",
  },
  scoping_submitted: {
    systemKind: "phase",
    label: "Advanced to Go / No-Go",
    stage: "Go / No-Go",
  },
  scoping_resubmitted: {
    systemKind: "status",
    label: "Resubmitted for review",
    stage: "Go / No-Go",
  },
  gonogo_approved: {
    systemKind: "phase",
    label: "Advanced to Project Setup",
    stage: "Project Setup",
  },
  gonogo_rejected: {
    systemKind: "status",
    label: "Status changed to Rejected",
    stage: "Go / No-Go",
  },
  gonogo_feedback: {
    systemKind: "status",
    label: "Sent back with feedback",
    stage: "Go / No-Go",
  },
  gonogo_on_hold: {
    systemKind: "status",
    label: "Status changed to On Hold",
    stage: "Go / No-Go",
  },
  setup_completed: {
    systemKind: "phase",
    label: "Advanced to Onboarding & Kickoff",
    stage: "Onboarding & Kickoff",
  },
  onboarding_completed: {
    systemKind: "phase",
    label: "Advanced to Production & Reporting",
    stage: "Production & Reporting",
  },
};

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function getStatusChatMeta(action: string): StatusChatMeta | null {
  return STATUS_CHAT_EVENTS[action] ?? null;
}

/** Activity that starts a new pipeline phase. Comments after it belong to that phase. */
const PHASE_ENTRY_ACTIONS: Record<string, string> = {
  approved_to_validation: "validation",
  converted_to_fast_track: "fast-track",
  validation_approved: "scoping",
  scoping_submitted: "go-nogo",
  gonogo_approved: "setup",
  setup_completed: "onboarding",
  onboarding_completed: "production",
};

export function currentChatPhaseId(
  currentStage: string,
  isFastTrack = false,
): string {
  return isFastTrack ? "fast-track" : currentStage;
}

/**
 * True when the remark was posted after the workstream entered `phaseId`
 * (and before any later phase change). Used to hide the latest-message
 * popup for remarks left behind in a prior phase.
 */
export function commentBelongsToPhase(
  comment: Pick<CommentEntry, "createdAt">,
  activity: ActivityEntry[],
  phaseId: string,
): boolean {
  let inferred = "idea";
  const commentAt = asDate(comment.createdAt).getTime();
  const entries = [...activity].sort(
    (a, b) => asDate(a.createdAt).getTime() - asDate(b.createdAt).getTime(),
  );

  for (const entry of entries) {
    const next = PHASE_ENTRY_ACTIONS[entry.action];
    if (!next) continue;
    if (asDate(entry.createdAt).getTime() <= commentAt) inferred = next;
  }

  return inferred === phaseId;
}

/**
 * Chronological chat thread: user remarks plus status/phase system messages.
 * Comments are expected newest-first (query order); the result is oldest-first.
 */
export function buildChatTimeline(
  comments: CommentEntry[],
  activity: ActivityEntry[],
): ChatTimelineItem[] {
  const items: ChatTimelineItem[] = [
    ...comments.map((comment) => ({
      kind: "comment" as const,
      id: `comment-${comment.id}`,
      createdAt: asDate(comment.createdAt),
      userId: comment.userId,
      userName: comment.userName,
      body: comment.body,
    })),
    ...activity.flatMap((entry) => {
      const meta = getStatusChatMeta(entry.action);
      if (!meta) return [];
      return [
        {
          kind: "system" as const,
          id: `system-${entry.id}`,
          createdAt: asDate(entry.createdAt),
          actorName: entry.userName,
          systemKind: meta.systemKind,
          label: meta.label,
          stage: meta.stage,
        },
      ];
    }),
  ];

  return items.sort((a, b) => {
    const delta = a.createdAt.getTime() - b.createdAt.getTime();
    if (delta !== 0) return delta;
    if (a.kind === b.kind) return 0;
    return a.kind === "system" ? -1 : 1;
  });
}
