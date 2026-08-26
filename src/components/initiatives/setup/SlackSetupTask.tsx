"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Copy, Check, Pencil, ExternalLink, Loader2 } from "lucide-react";
import type { SlackSetupData } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import { createAndCompleteSlackChannel } from "@/app/(workspace)/workstreams/[id]/actions";

type SlackWorkspaceOption = {
  teamId: string;
  teamName: string;
};

type Props = {
  initiativeId: number;
  data: SlackSetupData;
  channelName: string;
  onChannelNameChange: (value: string) => void;
  returnTo: string;
  readOnly?: boolean;
  onComplete: (payload: {
    channelName: string;
    channelId?: string;
    channelUrl?: string;
    teamId?: string;
    teamName?: string;
    isPrivate?: boolean;
  }) => void;
};

export function SlackSetupTask({
  initiativeId,
  data,
  channelName,
  onChannelNameChange,
  returnTo,
  readOnly,
  onComplete,
}: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [isPrivate, setIsPrivate] = useState(data.isPrivate ?? false);
  const [workspaces, setWorkspaces] = useState<SlackWorkspaceOption[]>([]);
  const [appConfigured, setAppConfigured] = useState(true);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [teamId, setTeamId] = useState(data.teamId ?? "");
  const [optimistic, setOptimistic] = useState<SlackSetupData | null>(null);

  const view = optimistic ?? data;
  const savedName = view.channelName || view.suggestedName;

  const loadWorkspaces = useCallback(async () => {
    setLoadingWorkspaces(true);
    try {
      const res = await fetch("/api/integrations/slack/workspaces");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Could not load Slack workspaces.");
        setWorkspaces([]);
        return;
      }
      const body = (await res.json()) as {
        appConfigured: boolean;
        workspaces: SlackWorkspaceOption[];
      };
      setAppConfigured(body.appConfigured);
      setWorkspaces(body.workspaces);
      setTeamId((current) => {
        if (current && body.workspaces.some((w) => w.teamId === current)) {
          return current;
        }
        return body.workspaces[0]?.teamId ?? "";
      });
    } catch {
      setError("Could not load Slack workspaces.");
    } finally {
      setLoadingWorkspaces(false);
    }
  }, []);

  useEffect(() => {
    setOptimistic(null);
  }, [data.status, data.channelId, data.channelName]);

  useEffect(() => {
    if (readOnly || (view.status === "completed" && !editing)) return;
    void loadWorkspaces();
  }, [readOnly, view.status, editing, loadWorkspaces]);

  const handleCopySuggestion = async () => {
    await navigator.clipboard.writeText(data.suggestedName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    const name = channelName.trim().replace(/^#/, "");
    if (!name) {
      setError("Channel name is required.");
      return;
    }
    if (!teamId) {
      setError("Connect a Slack workspace first.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const result = await createAndCompleteSlackChannel(initiativeId, {
        teamId,
        channelName: name,
        isPrivate,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const resolvedName = result.channelName ?? name;
      const teamName = workspaces.find((w) => w.teamId === teamId)?.teamName;
      onChannelNameChange(resolvedName);
      setOptimistic({
        ...data,
        status: "completed",
        channelName: resolvedName,
        channelId: result.channelId,
        channelUrl: result.channelUrl,
        teamId,
        teamName,
        isPrivate,
        completedAt: new Date().toISOString(),
      });
      onComplete({
        channelName: resolvedName,
        channelId: result.channelId,
        channelUrl: result.channelUrl,
        teamId,
        teamName,
        isPrivate,
      });
      setEditing(false);
      setManualMode(false);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const handleManualComplete = () => {
    const name = channelName.trim().replace(/^#/, "");
    if (!name) {
      setError("Channel name is required.");
      return;
    }
    setError(null);
    onComplete({ channelName: name, isPrivate });
    setEditing(false);
    setManualMode(false);
  };

  const connectHref = `/api/integrations/slack/oauth/start?returnTo=${encodeURIComponent(returnTo)}`;

  if (view.status === "completed" && !editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Hash className="size-4 shrink-0 text-success" />
          <div>
            <p className="text-xs text-foreground">
              #{savedName}
              {view.isPrivate ? (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-muted">
                  Private
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 text-[10px] text-muted">
              {view.teamName ? `${view.teamName} · ` : ""}
              Channel confirmed
              {view.completedAt &&
                ` · ${new Date(view.completedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`}
            </p>
            {view.channelUrl ? (
              <a
                href={view.channelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#38BDF8] hover:text-foreground"
              >
                Open in Slack
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              onChannelNameChange(savedName);
              setIsPrivate(view.isPrivate ?? false);
              setError(null);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
          >
            <Pencil className="size-3" />
            Edit
          </button>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">Awaiting Slack channel setup.</div>
    );
  }

  return (
    <div className="space-y-4">
      {!editing && (
        <p className="text-xs text-muted">
          Create a Slack channel for this project from Adsomnia Workspace.
          Suggested name:{" "}
          <button
            type="button"
            onClick={handleCopySuggestion}
            className="inline-flex items-center gap-1 font-mono text-foreground hover:text-success"
          >
            #{data.suggestedName}
            {copied ? (
              <Check className="size-3 text-success" />
            ) : (
              <Copy className="size-3 text-muted" />
            )}
          </button>
        </p>
      )}

      {loadingWorkspaces ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Checking Slack connection…
        </p>
      ) : !appConfigured ? (
        <div className="space-y-3">
          <p className="text-xs text-btr">
            Slack app credentials are not configured. Set SLACK_CLIENT_ID,
            SLACK_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL, then reload. You can
            still confirm an existing channel name below.
          </p>
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Channel name<span className="ml-1 text-btr">*</span>
            </span>
            <div className="relative mt-1">
              <Hash className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
              <input
                type="text"
                value={channelName}
                onChange={(e) => {
                  onChannelNameChange(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-_#]/g, "-"),
                  );
                  setError(null);
                }}
                className={`${inputClass} pl-8`}
                placeholder={data.suggestedName}
                required
              />
            </div>
          </label>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Connect a Slack workspace once. The same distributable app can later
            be installed in the client workspace.
          </p>
          <a
            href={connectHref}
            className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors hover:bg-transparent hover:text-foreground"
          >
            Connect Slack
          </a>
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Channel name<span className="ml-1 text-btr">*</span>
            </span>
            <div className="relative mt-1">
              <Hash className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
              <input
                type="text"
                value={channelName}
                onChange={(e) => {
                  onChannelNameChange(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-_#]/g, "-"),
                  );
                  setError(null);
                }}
                className={`${inputClass} pl-8`}
                placeholder={data.suggestedName}
                required
              />
            </div>
          </label>
        </div>
      ) : (
        <>
          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Slack workspace
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className={inputClass}
                disabled={creating}
              >
                {workspaces.map((ws) => (
                  <option key={ws.teamId} value={ws.teamId}>
                    {ws.teamName}
                  </option>
                ))}
              </select>
              <a
                href={connectHref}
                className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
              >
                Add workspace
              </a>
            </div>
          </label>

          <label className="block">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Channel name<span className="ml-1 text-btr">*</span>
            </span>
            <div className="relative mt-1">
              <Hash className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
              <input
                type="text"
                value={channelName}
                onChange={(e) => {
                  onChannelNameChange(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-_#]/g, "-"),
                  );
                  setError(null);
                }}
                className={`${inputClass} pl-8`}
                placeholder={data.suggestedName}
                required
                disabled={creating}
              />
            </div>
          </label>

          <fieldset className="space-y-2">
            <legend className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Visibility
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={() => setIsPrivate(false)}
                className={`border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  !isPrivate
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Public
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => setIsPrivate(true)}
                className={`border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  isPrivate
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Private
              </button>
            </div>
          </fieldset>
        </>
      )}

      {error && <p className="text-xs text-btr">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {workspaces.length > 0 && !manualMode && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !channelName.trim() || !teamId}
            className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
          >
            {creating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            {creating ? "Creating…" : "Create Channel"}
          </button>
        )}

        {(manualMode || workspaces.length === 0 || !appConfigured) && (
          <button
            type="button"
            onClick={handleManualComplete}
            disabled={!channelName.trim()}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
          >
            <Check className="size-3.5" />
            {editing ? "Save Channel Name" : "Confirm Existing"}
          </button>
        )}

        {workspaces.length > 0 && !manualMode && (
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
          >
            Confirm existing instead
          </button>
        )}

        {manualMode && workspaces.length > 0 && (
          <button
            type="button"
            onClick={() => setManualMode(false)}
            className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
          >
            Back to create
          </button>
        )}

        {editing && (
          <button
            type="button"
            onClick={() => {
              onChannelNameChange(savedName);
              setIsPrivate(view.isPrivate ?? false);
              setError(null);
              setEditing(false);
              setManualMode(false);
            }}
            className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
