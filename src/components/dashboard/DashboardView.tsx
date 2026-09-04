import { LeadershipDashboard } from "@/components/dashboard/LeadershipDashboard";
import { TeamDashboard } from "@/components/dashboard/TeamDashboard";
import { isLeadership } from "@/lib/permissions";
import type {
  InitiativeWithUsers,
  WorkspaceActivityEntry,
} from "@/lib/queries";

type DashboardProps = {
  initiatives: InitiativeWithUsers[];
  activity: WorkspaceActivityEntry[];
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
  feedbackIds,
  user,
}: DashboardProps) {
  if (isLeadership(user)) {
    return (
      <LeadershipDashboard
        initiatives={initiatives}
        activity={activity}
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
