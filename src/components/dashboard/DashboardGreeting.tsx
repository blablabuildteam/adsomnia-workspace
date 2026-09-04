"use client";

import { useEffect, useState } from "react";
import { roleLabel } from "@/lib/permissions";

export function DashboardGreeting({
  firstName,
  role,
  subtitle,
}: {
  firstName: string;
  role: string;
  subtitle: string;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const hours = now?.getHours();
  const greeting =
    hours == null
      ? "Welcome back"
      : hours < 12
        ? "Good morning"
        : hours < 18
          ? "Good afternoon"
          : "Good evening";

  const dateLine = now
    ? now.toLocaleDateString("en-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "\u00a0";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
          Launchpad
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl lg:text-6xl">
          {greeting}, {firstName}
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted">{subtitle}</p>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-muted">
          {dateLine}
        </p>
        <p className="mt-1 font-display text-xs font-bold uppercase tracking-wide text-foreground">
          {roleLabel(role)}
        </p>
      </div>
    </div>
  );
}
