"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Columns3,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Map,
  User,
} from "lucide-react";
import { logout } from "@/lib/auth";

const PRIMARY_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ideas/new", label: "Submit Initiative", icon: Lightbulb },
] as const;

const PIPELINE_SUB_ITEMS = [
  { href: "/overview", label: "Kanban Overview" },
  { href: "/pipeline/initiatives", label: "01 Initiatives" },
  { href: "/pipeline/validation", label: "02 Validation" },
  { href: "/pipeline/scoping", label: "03 Scoping" },
  { href: "/pipeline/go-nogo", label: "04 Go / No-Go" },
  { href: "/pipeline/setup", label: "05 Project Setup" },
  { href: "/pipeline/onboarding", label: "06 Onboarding" },
  { href: "/pipeline/production", label: "07 Production" },
] as const;

const REFERENCE_NAV_ITEMS = [
  { href: "/intake", label: "Intake Template", icon: ClipboardList },
  { href: "/framework", label: "Framework Map", icon: Map },
] as const;

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  subdued = false,
}: NavItem & { active: boolean; collapsed: boolean; subdued?: boolean }) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={[
        "flex items-center border transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
        active
          ? "border-foreground bg-foreground text-background"
          : subdued
            ? "border-transparent text-muted/70 hover:border-border hover:bg-surface-elevated hover:text-muted"
            : "border-transparent text-muted hover:border-border hover:bg-surface-elevated hover:text-foreground",
      ].join(" ")}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && (
        <span className="truncate text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      )}
    </Link>
  );
}

function PipelineNav({
  collapsed,
  pathname,
}: {
  collapsed: boolean;
  pathname: string;
}) {
  const isPipelineActive =
    pathname === "/overview" || pathname.startsWith("/pipeline");
  const [open, setOpen] = useState(isPipelineActive);

  if (collapsed) {
    return (
      <Link
        href="/overview"
        title="Pipeline"
        className={[
          "flex items-center justify-center border py-2.5 transition-colors",
          isPipelineActive
            ? "border-foreground bg-foreground text-background"
            : "border-transparent text-muted hover:border-border hover:bg-surface-elevated hover:text-foreground",
        ].join(" ")}
      >
        <Columns3 className="size-4 shrink-0" />
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={[
          "flex w-full items-center gap-3 border px-3 py-2.5 transition-colors",
          isPipelineActive
            ? "border-border bg-surface-elevated text-foreground"
            : "border-transparent text-muted hover:border-border hover:bg-surface-elevated hover:text-foreground",
        ].join(" ")}
      >
        <Columns3 className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left text-xs font-medium uppercase tracking-wide">
          Pipeline
        </span>
        <ChevronDown
          className={[
            "size-3.5 shrink-0 transition-transform",
            open ? "rotate-0" : "-rotate-90",
          ].join(" ")}
        />
      </button>
      {open && (
        <ul className="mt-0.5 space-y-0.5 pl-5">
          {PIPELINE_SUB_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center border-l-2 px-3 py-1.5 text-[11px] font-medium tracking-wide transition-colors",
                    active
                      ? "border-foreground text-foreground"
                      : "border-border text-muted hover:border-muted hover:text-foreground",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type Props = {
  userName: string;
  collapsed: boolean;
  onToggle: () => void;
};

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/ideas/new" && pathname.startsWith("/ideas")) return true;
  if (
    href === "/dashboard" &&
    (pathname === "/dashboard" || pathname.startsWith("/initiatives"))
  ) {
    return true;
  }
  return false;
}

export function WorkspaceSidebar({ userName, collapsed, onToggle }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={[
        "sidebar-shell flex h-full shrink-0 flex-col border-r border-border bg-surface/90 backdrop-blur-sm transition-[width] duration-200 ease-out",
        collapsed ? "w-[68px]" : "w-[240px]",
      ].join(" ")}
    >
      {/* Brand + toggle */}
      <div
        className={[
          "flex items-center border-b border-border",
          collapsed ? "justify-center px-2 py-4" : "justify-between gap-2 px-4 py-4",
        ].join(" ")}
      >
        <Link
          href="/dashboard"
          className={[
            "group flex min-w-0 items-center",
            collapsed ? "justify-center" : "gap-3",
          ].join(" ")}
          title="Adsomnia Workspace"
        >
          <div className="flex size-9 shrink-0 items-center justify-center border border-border-strong bg-surface-elevated">
            <GitBranch className="size-4 text-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                Adsomnia
              </p>
              <p className="font-display truncate text-sm font-bold uppercase tracking-wide text-foreground">
                Workspace
              </p>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="flex size-8 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center border-b border-border py-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex size-8 items-center justify-center border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* Primary navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="space-y-1">
          <li>
            <NavLink
              href="/dashboard"
              label="Dashboard"
              icon={LayoutDashboard}
              active={isActive(pathname, "/dashboard")}
              collapsed={collapsed}
            />
          </li>
          <li>
            <PipelineNav collapsed={collapsed} pathname={pathname} />
          </li>
          <li>
            <NavLink
              href="/ideas/new"
              label="Submit Initiative"
              icon={Lightbulb}
              active={isActive(pathname, "/ideas/new")}
              collapsed={collapsed}
            />
          </li>
        </ul>
      </nav>

      {/* Reference links — not core workspace views */}
      <div
        className={[
          "border-t border-border px-2 py-3",
          collapsed ? "space-y-1" : "space-y-2",
        ].join(" ")}
      >
        {!collapsed && (
          <p className="px-3 font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted/60">
            Reference
          </p>
        )}
        <ul className="space-y-1">
          {REFERENCE_NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink
                {...item}
                active={isActive(pathname, item.href)}
                collapsed={collapsed}
                subdued
              />
            </li>
          ))}
        </ul>
      </div>

      {/* User + sign out */}
      <div
        className={[
          "border-t border-border",
          collapsed ? "px-2 py-3" : "px-3 py-4",
        ].join(" ")}
      >
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2 px-1 text-xs text-muted">
            <User className="size-3.5 shrink-0" />
            <span className="truncate">{userName}</span>
          </div>
        )}
        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className={[
              "flex w-full items-center border border-transparent text-xs text-muted transition-colors hover:border-border hover:text-foreground",
              collapsed ? "justify-center py-2" : "gap-2 px-3 py-2",
            ].join(" ")}
          >
            <LogOut className="size-3.5 shrink-0" />
            {!collapsed && (
              <span className="font-display font-bold uppercase tracking-wide">
                Sign Out
              </span>
            )}
          </button>
        </form>
      </div>
    </aside>
  );
}
