import { redirect } from "next/navigation";
import {
  displayName,
  getCurrentUser,
  needsProfileCompletion,
} from "@/lib/session";
import { canSeeJiraTokenReminder } from "@/lib/permissions";
import { getJiraTokenReminder } from "@/lib/integrations/jira-token-reminder";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (needsProfileCompletion(user)) {
    redirect("/complete-profile");
  }

  const jiraTokenReminder = canSeeJiraTokenReminder(user)
    ? getJiraTokenReminder()
    : null;

  return (
    <div className="app-atmosphere flex h-dvh min-h-0 flex-col overflow-hidden">
      <WorkspaceShell
        user={{
          name: displayName(user),
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          email: user.email,
          role: user.role,
        }}
        jiraTokenReminder={jiraTokenReminder}
      >
        {children}
      </WorkspaceShell>
    </div>
  );
}
