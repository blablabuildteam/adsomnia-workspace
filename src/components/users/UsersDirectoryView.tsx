"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { roleLabel } from "@/lib/permissions";
import type { RegisteredUserEntry } from "@/lib/queries";

type RoleFilter = "all" | RegisteredUserEntry["role"];

const FILTERS: { key: RoleFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "leadership", label: "Leadership" },
  { key: "team", label: "Team" },
  { key: "production", label: "Production" },
];

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

type Props = {
  users: RegisteredUserEntry[];
};

function formatRegistered(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function UsersDirectoryView({ users }: Props) {
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const byRole = { leadership: 0, team: 0, production: 0 };
    for (const user of users) byRole[user.role] += 1;
    return byRole;
  }, [users]);

  const visibleFilters = FILTERS.filter(
    (item) => item.key === "all" || counts[item.key] > 0,
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users.filter((user) => {
      if (filter !== "all" && user.role !== filter) return false;
      if (!needle) return true;
      const haystack = [user.name, user.email, user.jobTitle ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, query, users]);

  return (
    <div className="mx-auto w-full max-w-[1800px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <div className="relative z-10">
          <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-bbb">
            blablabuild
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
            Users
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Workspace accounts. New people are added here when they sign in
            with Google.
          </p>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {visibleFilters.map((item) => {
            const active = filter === item.key;
            const count =
              item.key === "all" ? users.length : counts[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={[
                  "border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:border-border-strong hover:text-foreground",
                ].join(" ")}
              >
                {item.label} {count}
              </button>
            );
          })}
        </div>
        <label className="relative block w-full sm:w-64">
          <span className="sr-only">Search users</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            className="w-full border border-border bg-surface py-2 pr-3 pl-8 text-sm text-foreground placeholder:text-muted/50 focus:border-muted focus:outline-none"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="relative border border-border bg-surface px-5 py-8 text-sm text-muted">
          <CornerTicks />
          {users.length === 0
            ? "No one has signed in yet."
            : "No accounts match this search."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((user) => (
            <li key={user.id}>
              <article className="group relative border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong hover:bg-hover sm:px-5">
                <CornerTicks className={hoverTicks} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {user.email}
                    </p>
                    {user.jobTitle ? (
                      <p className="mt-1 truncate text-[11px] text-muted/80">
                        {user.jobTitle}
                      </p>
                    ) : null}
                  </div>
                  <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] sm:justify-end">
                    <div>
                      <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                        Role
                      </dt>
                      <dd className="mt-0.5 font-medium uppercase tracking-wide text-foreground">
                        {roleLabel(user.role)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                        Profile
                      </dt>
                      <dd className="mt-0.5 uppercase tracking-wide text-foreground">
                        {user.profileComplete ? "Complete" : "Pending"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                        Registered
                      </dt>
                      <dd className="mt-0.5 tabular-nums text-foreground">
                        {formatRegistered(user.createdAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
