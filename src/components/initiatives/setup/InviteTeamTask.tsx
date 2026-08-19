"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import type { InviteTeamData } from "@/lib/validation-data";

const SLACK_URL = "https://app.slack.com";

type ToolLink = {
  name: string;
  logo: string;
  href?: string;
  openLabel: string;
};

type Props = {
  data: InviteTeamData;
  slackChannelName?: string;
  driveUrl?: string;
  jiraBoardUrl?: string;
  readOnly?: boolean;
  onComplete: () => void;
};

export function InviteTeamTask({
  data,
  slackChannelName,
  driveUrl,
  jiraBoardUrl,
  readOnly,
  onComplete,
}: Props) {
  const [confirmed, setConfirmed] = useState(false);

  const tools: ToolLink[] = [
    {
      name: slackChannelName ? `#${slackChannelName.replace(/^#/, "")}` : "Slack",
      logo: "/logos/slack.png",
      href: SLACK_URL,
      openLabel: "Open Slack",
    },
    {
      name: "Jira",
      logo: "/logos/jira.png",
      href: jiraBoardUrl,
      openLabel: "Open Jira board",
    },
    {
      name: "Google Drive",
      logo: "/logos/google-drive.png",
      href: driveUrl,
      openLabel: "Open Google Drive",
    },
  ];

  if (data.status === "completed") {
    return (
      <div className="flex items-center gap-2 text-xs text-success">
        <CheckCircle2 className="size-3.5" />
        Team invited to Slack, Jira, and Google Drive
        {data.completedAt && (
          <span className="text-muted">
            ·{" "}
            {new Date(data.completedAt).toLocaleDateString("en-US", {
              dateStyle: "medium",
            })}
          </span>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting team invites to Slack, Jira, and Google Drive.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Invite the project team to the Slack channel, Jira board, and Google
        Drive so everyone has access before kickoff.
      </p>

      <div className="space-y-1.5">
        {tools.map((tool) => (
          <div
            key={tool.openLabel}
            className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tool.logo}
                alt=""
                className="size-3.5 shrink-0 object-contain"
              />
              <span className="truncate text-xs text-foreground">{tool.name}</span>
            </span>
            {tool.href ? (
              <a
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#38BDF8] hover:text-foreground"
              >
                {tool.openLabel}
              </a>
            ) : (
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted/50">
                Link not set
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => setConfirmed((current) => !current)}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <span
            aria-hidden
            className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${
              confirmed
                ? "border-success bg-success text-background"
                : "border-foreground/30 bg-transparent text-transparent hover:border-success"
            }`}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-xs text-foreground">
            The team has been invited to Slack, Jira, and Google Drive
          </span>
        </button>
        <button
          type="button"
          onClick={() => onComplete()}
          disabled={!confirmed}
          className="inline-flex shrink-0 items-center gap-2 border border-success bg-success/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
        >
          Confirm Done
        </button>
      </div>
    </div>
  );
}
