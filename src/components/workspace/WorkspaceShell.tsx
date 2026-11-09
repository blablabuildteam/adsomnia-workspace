"use client";

import { Suspense, use, useEffect, useState } from "react";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { JiraStatusNotice } from "./JiraStatusNotice";
import type { SidebarProfileUser } from "./SidebarProfile";
import type { JiraTokenReminder } from "@/lib/integrations/jira-token-reminder";
import type { JiraHealthIssue } from "@/lib/integrations/jira-health";

const STORAGE_KEY = "adsomnia-sidebar-collapsed";

type Props = {
  user: SidebarProfileUser;
  children: React.ReactNode;
  jiraTokenReminder?: JiraTokenReminder | null;
  /** Jira sites that fail right now; resolves after the page has rendered. */
  jiraHealth: Promise<JiraHealthIssue[]>;
  canManageJira: boolean;
};

export function WorkspaceShell({
  user,
  children,
  jiraTokenReminder = null,
  jiraHealth,
  canManageJira,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <WorkspaceSidebar
        user={user}
        collapsed={hydrated ? collapsed : false}
        onToggle={toggle}
      />
      <main className="workspace-content min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
      <FeedbackButton />
      <Suspense fallback={null}>
        <JiraStatusFromServer
          health={jiraHealth}
          reminder={jiraTokenReminder}
          canManage={canManageJira}
        />
      </Suspense>
    </div>
  );
}

function JiraStatusFromServer({
  health,
  reminder,
  canManage,
}: {
  health: Promise<JiraHealthIssue[]>;
  reminder: JiraTokenReminder | null;
  canManage: boolean;
}) {
  const issues = use(health);
  return (
    <JiraStatusNotice issues={issues} reminder={reminder} canManage={canManage} />
  );
}
