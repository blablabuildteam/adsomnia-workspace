"use client";

import { useEffect, useState } from "react";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import type { SidebarProfileUser } from "./SidebarProfile";

const STORAGE_KEY = "adsomnia-sidebar-collapsed";

type Props = {
  user: SidebarProfileUser;
  children: React.ReactNode;
};

export function WorkspaceShell({ user, children }: Props) {
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
    </div>
  );
}
