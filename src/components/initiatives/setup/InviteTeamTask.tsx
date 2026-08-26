"use client";

import { getStageColor } from "@/data/workflow";
import type { InviteTeamData } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "../onboarding/ConfirmRow";

const ACCENT = getStageColor("setup");

const FALLBACK_SLACK_URL = "https://app.slack.com";

type ToolLink = {
  name: string;
  logo: string;
  href?: string;
  openLabel: string;
};

type Props = {
  data: InviteTeamData;
  slackChannelName?: string;
  slackChannelUrl?: string;
  driveUrl?: string;
  jiraBoardUrl?: string;
  readOnly?: boolean;
  onComplete: () => void;
};

export function InviteTeamTask({
  data,
  slackChannelName,
  slackChannelUrl,
  driveUrl,
  jiraBoardUrl,
  readOnly,
  onComplete,
}: Props) {
  const tools: ToolLink[] = [
    {
      name: slackChannelName ? `#${slackChannelName.replace(/^#/, "")}` : "Slack",
      logo: "/logos/slack.png",
      href: slackChannelUrl || FALLBACK_SLACK_URL,
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
      <CompletedLine accent={ACCENT} completedAt={data.completedAt}>
        Team invited to Slack, Jira, and Google Drive
      </CompletedLine>
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

      <ConfirmRow
        accent={ACCENT}
        label="The team has been invited to Slack, Jira, and Google Drive"
        onConfirm={onComplete}
      />
    </div>
  );
}
