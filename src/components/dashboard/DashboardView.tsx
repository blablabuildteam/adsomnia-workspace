import { LeadershipDashboard } from "@/components/dashboard/LeadershipDashboard";
import { TeamDashboard } from "@/components/dashboard/TeamDashboard";
import type { FastTrackItem } from "@/lib/fast-track";
import { isLeadership } from "@/lib/permissions";
import type {
  InitiativeWithUsers,
  WorkspaceActivityEntry,
} from "@/lib/queries";

type DashboardProps = {
  initiatives: InitiativeWithUsers[];
  activity: WorkspaceActivityEntry[];
  fastTrackItems: FastTrackItem[];
  fastTrackError?: string | null;
  feedbackIds: number[];
  user: {
    id: string;
    firstName: string;
    role: "leadership" | "production" | "team";
  };
};

export function DashboardView({
  initiatives,
  activity,
  fastTrackItems,
  fastTrackError,
  feedbackIds,
  user,
}: DashboardProps) {
  if (isLeadership(user)) {
    return (
      <LeadershipDashboard
        initiatives={initiatives}
        activity={activity}
        fastTrackItems={fastTrackItems}
        fastTrackError={fastTrackError}
        firstName={user.firstName}
        role={user.role}
      />
    );
  }

  return (
    <TeamDashboard
      initiatives={initiatives}
      feedbackIds={feedbackIds}
      userId={user.id}
      firstName={user.firstName}
      role={user.role}
    />
  );
}
