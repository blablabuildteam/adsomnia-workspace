import { DashboardView } from "@/components/dashboard/DashboardView";
import { loadFastTrackOverview, type FastTrackItem } from "@/lib/fast-track";
import { withoutDeletedJiraSpaces } from "@/lib/production/load";
import { seesAllWorkstreams } from "@/lib/permissions";
import { listUserWorkstreamGrants } from "@/lib/workstream-access";
import {
  getAllInitiatives,
  getInitiativeIdsWithLatestDecision,
  getRecentWorkspaceActivity,
} from "@/lib/queries";
import { displayName, getCurrentUser } from "@/lib/session";

const EMPTY_FAST_TRACK: Awaited<ReturnType<typeof loadFastTrackOverview>> = {
  items: [] as FastTrackItem[],
  boardUrl: null,
  fetchError: null,
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [rawItems, activity, ideaFeedback, validationFeedback, gonogoFeedback, fastTrack, grants] =
    await Promise.all([
      getAllInitiatives(user),
      getRecentWorkspaceActivity(12),
      getInitiativeIdsWithLatestDecision("idea", "feedback"),
      getInitiativeIdsWithLatestDecision("validation", "feedback"),
      getInitiativeIdsWithLatestDecision("go-nogo", "feedback"),
      seesAllWorkstreams(user)
        ? loadFastTrackOverview(user)
        : Promise.resolve(EMPTY_FAST_TRACK),
      seesAllWorkstreams(user)
        ? Promise.resolve([])
        : listUserWorkstreamGrants(user.id),
    ]);

  const items = await withoutDeletedJiraSpaces(rawItems);
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
      fastTrackItems={fastTrack.items}
      fastTrackError={fastTrack.fetchError}
      feedbackIds={feedbackIds}
      user={{ id: user.id, firstName, role: user.role }}
      grants={grants}
    />
  );
}
