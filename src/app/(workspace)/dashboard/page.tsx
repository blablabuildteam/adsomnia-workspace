import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  getAllInitiatives,
  getInitiativeIdsWithLatestDecision,
  getRecentWorkspaceActivity,
} from "@/lib/queries";
import { displayName, getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const [items, activity, ideaFeedback, validationFeedback, gonogoFeedback, user] =
    await Promise.all([
      getAllInitiatives(),
      getRecentWorkspaceActivity(12),
      getInitiativeIdsWithLatestDecision("idea", "feedback"),
      getInitiativeIdsWithLatestDecision("validation", "feedback"),
      getInitiativeIdsWithLatestDecision("go-nogo", "feedback"),
      getCurrentUser(),
    ]);

  if (!user) return null;

  const feedbackIds = [
    ...ideaFeedback,
    ...validationFeedback,
    ...gonogoFeedback,
  ];

  const firstName =
    user.firstName?.trim() || displayName(user).split(" ")[0] || "there";

  return (
    <DashboardView
      initiatives={items}
      activity={activity}
      feedbackIds={feedbackIds}
      user={{ id: user.id, firstName, role: user.role }}
    />
  );
}
