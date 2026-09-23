import { LeadershipDashboard } from "@/components/dashboard/LeadershipDashboard";
import { TeamDashboard } from "@/components/dashboard/TeamDashboard";
import { visibleOnDashboard } from "@/lib/dashboard-attention";
import type { FastTrackItem } from "@/lib/fast-track";
import { seesAllWorkstreams, type WorkspaceRole } from "@/lib/permissions";
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
    role: WorkspaceRole;
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
  const active = initiatives.filter(visibleOnDashboard);

  if (seesAllWorkstreams(user)) {
    return (
      <LeadershipDashboard
        initiatives={active}
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
      initiatives={active}
      feedbackIds={feedbackIds}
      userId={user.id}
      firstName={user.firstName}
      role={user.role}
    />
  );
}
