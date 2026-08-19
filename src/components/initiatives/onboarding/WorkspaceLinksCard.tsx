"use client";

import { useActionState, useState } from "react";
import { ArrowUpRight, FileText, LayoutGrid, Pencil } from "lucide-react";
import { getStageColor } from "@/data/workflow";
import type { OnboardingLinks, SetupData } from "@/lib/validation-data";
import { saveOnboardingLinks } from "@/app/(workspace)/workstreams/[id]/actions";
import { PhaseSectionCard } from "../PhaseSectionCard";

const ACCENT = getStageColor("onboarding");
const ROW_INPUT_CLASS =
  "w-full border border-border bg-surface-input px-2 py-1.5 text-xs text-foreground transition-colors focus:border-muted focus:outline-none";

const initialState: { error?: string; success?: boolean } = {};

type Props = {
  initiativeId: number;
  setupData: SetupData | null;
  links: OnboardingLinks;
  readOnly?: boolean;
};

export function WorkspaceLinksCard({
  initiativeId,
  setupData,
  links,
  readOnly,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    saveOnboardingLinks.bind(null, initiativeId),
    initialState,
  );

  const channelName = setupData?.slack.channelName?.replace(/^#/, "");
  const driveUrl = setupData?.drive.driveUrl;
  const jiraUrl = setupData?.jira.boardUrl || setupData?.jira.projectUrl;
  const docs = (setupData?.documentation.linkedDocs ?? []).filter((d) => d.url);

  const tools: {
    key: string;
    logo: string;
    name: string;
    href?: string;
    fallback?: string;
  }[] = [
    {
      key: "slack",
      logo: "/logos/slack.png",
      name: channelName ? `#${channelName}` : "Slack",
      href: links.slackChannelUrl,
    },
    {
      key: "jira",
      logo: "/logos/jira.png",
      name: setupData?.jira.projectName || "Jira board",
      href: jiraUrl,
      fallback: "Board link not set",
    },
    {
      key: "drive",
      logo: "/logos/google-drive.png",
      name: setupData?.drive.driveName || "Google Drive",
      href: driveUrl,
      fallback: "Drive link not set",
    },
  ];

  return (
    <PhaseSectionCard
      header={
        <>
          <div className="flex items-center gap-2 text-muted">
            <LayoutGrid
              className="size-3.5 shrink-0"
              style={{ color: ACCENT }}
            />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Project Workspaces
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
            >
              <Pencil className="size-3" />
              {editing ? "Done" : "Edit links"}
            </button>
          )}
        </>
      }
      bodyClassName="space-y-3 p-4"
    >
      <div className="grid gap-1.5 sm:grid-cols-3">
        {tools.map((tool) => (
          <div
            key={tool.key}
            className="flex items-center justify-between gap-2 border border-border bg-surface px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tool.logo}
                alt=""
                className="size-3.5 shrink-0 object-contain"
              />
              <span className="truncate text-xs text-foreground">
                {tool.name}
              </span>
            </span>
            {tool.href ? (
              <a
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${tool.name}`}
                className="shrink-0 transition-opacity hover:opacity-70"
                style={{ color: ACCENT }}
              >
                <ArrowUpRight className="size-4" strokeWidth={2.5} />
              </a>
            ) : tool.fallback ? (
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted/50">
                {tool.fallback}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {(docs.length > 0 || links.notesUrl) && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          {docs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <FileText className="size-3 shrink-0 text-muted/50" />
              {docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  {doc.title}
                </a>
              ))}
            </div>
          )}

          {links.notesUrl && (
            <a
              href={links.notesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide transition-opacity hover:opacity-70"
              style={{ color: ACCENT }}
            >
              Kickoff notes
              <ArrowUpRight className="size-3" strokeWidth={2.5} />
            </a>
          )}
        </div>
      )}

      {editing && !readOnly && (
        <form
          action={formAction}
          className="space-y-3 border-t border-border/60 pt-3"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
                Slack channel link
              </span>
              <input
                type="text"
                name="slackChannelUrl"
                defaultValue={links.slackChannelUrl ?? ""}
                placeholder="https://app.slack.com/client/…"
                className={ROW_INPUT_CLASS}
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
                Kickoff notes link
              </span>
              <input
                type="text"
                name="notesUrl"
                defaultValue={links.notesUrl ?? ""}
                placeholder="https://docs.google.com/…"
                className={ROW_INPUT_CLASS}
              />
            </label>
          </div>
          {state.error && <p className="text-xs text-btr">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
          >
            {pending ? "Saving…" : "Save links"}
          </button>
        </form>
      )}
    </PhaseSectionCard>
  );
}
