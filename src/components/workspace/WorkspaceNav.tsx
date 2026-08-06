"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  GitBranch,
  LayoutDashboard,
  Lightbulb,
  Map,
  Ticket,
} from "lucide-react";
import { isPreviewLocked } from "@/data/preview-access";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/intake", label: "Intake Template", icon: ClipboardList },
  { href: "/ideas/new", label: "Submit Idea", icon: Lightbulb },
  { href: "/initiatives/WS-1042", label: "Initiative", icon: Ticket },
  { href: "/framework", label: "Framework Map", icon: Map },
] as const;

export function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <div className="flex size-8 items-center justify-center border border-border-strong bg-surface-elevated">
            <GitBranch className="size-4 text-foreground" />
          </div>
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              Adsomnia
            </p>
            <p className="font-display text-sm font-bold uppercase tracking-wide text-foreground">
              Workspace
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const locked = isPreviewLocked(href);
            const active =
              !locked &&
              (pathname === href ||
                (href.startsWith("/initiatives") &&
                  pathname.startsWith("/initiatives")));

            if (locked) {
              return (
                <span
                  key={href}
                  title="Coming soon"
                  aria-disabled="true"
                  className="flex shrink-0 cursor-not-allowed items-center gap-2 border border-transparent px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted/35"
                >
                  <Icon className="size-3.5 opacity-50" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex shrink-0 items-center gap-2 border px-3 py-2 text-xs font-medium uppercase tracking-wide transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-transparent text-muted hover:border-border hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        <span className="hidden shrink-0 border border-bbb/40 bg-bbb/10 px-2 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-bbb lg:inline">
          Concept
        </span>
      </div>
    </nav>
  );
}

export function ConceptBanner() {
  return (
    <div className="border-b border-bbb/30 bg-bbb/5 px-4 py-2.5 sm:px-6 lg:px-8 print:hidden">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 text-xs text-muted">
        <span className="font-display shrink-0 font-bold uppercase tracking-[0.14em] text-bbb">
          Concept Preview
        </span>
        <span>
          These views illustrate how the Adsomnia Workspace System will
          operationalize the Production Framework — mock data only, no backend
          yet.
        </span>
      </div>
    </div>
  );
}
