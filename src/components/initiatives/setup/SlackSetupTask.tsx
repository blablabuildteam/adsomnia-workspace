"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, Check, Pencil, ExternalLink, Loader2 } from "lucide-react";
import {
  normalizeUrl,
  type SlackSetupData,
} from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import {
  connectExistingSlackChannel,
  createAndCompleteSlackChannel,
} from "@/app/(workspace)/workstreams/[id]/actions";
import { SetupCreateOrLinkRow } from "./SetupCreateOrLinkRow";

type SlackWorkspaceOption = {
  teamId: string;
  teamName: string;
  userLinked: boolean;
};

type SlackChannelOption = {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"create" | "connect">("create");
  const [channelUrl, setChannelUrl] = useState(data.channelUrl ?? "");
  const [isPrivate, setIsPrivate] = useState(data.isPrivate ?? false);
  const [channelQuery, setChannelQuery] = useState("");
  const [channelOptions, setChannelOptions] = useState<SlackChannelOption[]>([]);
  const [channelsTruncated, setChannelsTruncated] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] =
    useState<SlackChannelOption | null>(null);
  const [channelRefresh, setChannelRefresh] = useState(0);
  const channelRequest = useRef(0);
  const freshChannelList = useRef(false);
  const [workspaces, setWorkspaces] = useState<SlackWorkspaceOption[]>([]);
  const [appConfigured, setAppConfigured] = useState(true);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [teamId, setTeamId] = useState(data.teamId ?? "");
  const [optimistic, setOptimistic] = useState<SlackSetupData | null>(null);

  const view = optimistic ?? data;
  const savedName = view.channelName || view.suggestedName;
  const selectedWorkspace = workspaces.find((w) => w.teamId === teamId);
  const userLinkedToSelected = Boolean(selectedWorkspace?.userLinked);

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
      setWorkspaces(
        body.workspaces.map((w) => ({
          ...w,
          userLinked: Boolean(w.userLinked),
        })),
      );
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

  useEffect(() => {
    if (
      readOnly ||
      mode !== "connect" ||
      !teamId ||
      !userLinkedToSelected ||
      (view.status === "completed" && !editing)
    ) {
      return;
    }

    const handle = window.setTimeout(() => {
      const requestId = ++channelRequest.current;
      setLoadingChannels(true);
      const params = new URLSearchParams({ teamId, q: channelQuery });
      if (freshChannelList.current) {
        params.set("fresh", "1");
        freshChannelList.current = false;
      }
      void fetch(`/api/integrations/slack/channels?${params}`)
        .then(async (res) => {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
            channels?: SlackChannelOption[];
            truncated?: boolean;
          } | null;
          if (requestId !== channelRequest.current) return;
          if (!res.ok) {
            setError(body?.error ?? "Could not load Slack channels.");
            setChannelOptions([]);
            setChannelsTruncated(false);
            return;
          }
          setError(null);
          setChannelOptions(body?.channels ?? []);
          setChannelsTruncated(Boolean(body?.truncated));
        })
        .catch(() => {
          if (requestId !== channelRequest.current) return;
          setError("Could not load Slack channels.");
          setChannelOptions([]);
        })
        .finally(() => {
          if (requestId === channelRequest.current) setLoadingChannels(false);
        });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [
    readOnly,
    mode,
    teamId,
    userLinkedToSelected,
    channelQuery,
    editing,
    view.status,
    channelRefresh,
  ]);

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
    setInfo(null);
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
      if (result.bookmarkError) {
        setInfo(result.bookmarkError);
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
      if (result.channelUrl) setChannelUrl(result.channelUrl);
      onComplete({
        channelName: resolvedName,
        channelId: result.channelId,
        channelUrl: result.channelUrl,
        teamId,
        teamName,
        isPrivate,
      });
      setEditing(false);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedChannel) {
      setError("Choose a Slack channel.");
      return;
    }
    if (!teamId) {
      setError("Connect a Slack workspace first.");
      return;
    }
    setError(null);
    setInfo(null);
    setCreating(true);
    try {
      const result = await connectExistingSlackChannel(initiativeId, {
        teamId,
        channelId: selectedChannel.id,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.bookmarkError) {
        setInfo(result.bookmarkError);
      }
      const resolvedName = result.channelName ?? selectedChannel.name;
      const resolvedPrivate = result.isPrivate ?? selectedChannel.isPrivate;
      const teamName = workspaces.find((w) => w.teamId === teamId)?.teamName;
      onChannelNameChange(resolvedName);
      setIsPrivate(resolvedPrivate);
      setOptimistic({
        ...data,
        status: "completed",
        channelName: resolvedName,
        channelId: result.channelId,
        channelUrl: result.channelUrl,
        teamId,
        teamName,
        isPrivate: resolvedPrivate,
        completedAt: new Date().toISOString(),
      });
      if (result.channelUrl) setChannelUrl(result.channelUrl);
      onComplete({
        channelName: resolvedName,
        channelId: result.channelId,
        channelUrl: result.channelUrl,
        teamId,
        teamName,
        isPrivate: resolvedPrivate,
      });
      setEditing(false);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const handleManualComplete = () => {
    const name = channelName.trim().replace(/^#/, "") || data.suggestedName;
    const url = normalizeUrl(channelUrl);
    if (!url) {
      setError("Paste a Slack channel URL.");
      return;
    }
    if (!name) {
      setError("Channel name is required.");
      return;
    }
    setError(null);
    onComplete({ channelName: name, channelUrl: url, isPrivate });
    setEditing(false);
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
                className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-info hover:text-foreground"
              >
                Open in Slack
                <ExternalLink className="size-3" />
              </a>
            ) : null}
            {info ? (
              <p className="mt-2 text-[11px] text-muted">{info}</p>
            ) : null}
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              onChannelNameChange(savedName);
              setChannelUrl(view.channelUrl ?? "");
              setIsPrivate(view.isPrivate ?? false);
              setError(null);
              setInfo(null);
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
      <p className="text-xs text-muted">
        Create a new Slack channel, or connect one that already exists in the
        selected workspace. Google Drive and Jira are bookmarked in the channel.
      </p>

      {loadingWorkspaces ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Checking Slack connection…
        </p>
      ) : !appConfigured ? (
        <p className="text-xs text-btr">
          Slack app credentials are not configured. Set SLACK_CLIENT_ID,
          SLACK_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL, then reload — or paste
          an existing channel URL below.
        </p>
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
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setSelectedChannel(null);
                  setChannelQuery("");
                  setChannelOptions([]);
                  setError(null);
                }}
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

          {!userLinkedToSelected && (
            <div className="space-y-3 border border-border bg-surface px-3 py-3">
              <p className="text-xs text-muted">
                Connect your Slack account once so we can invite you into the
                channel. Approve while logged into the Slack user you use day
                to day.
              </p>
              <a
                href={connectHref}
                className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors hover:bg-transparent hover:text-foreground"
              >
                Connect My Slack Account
              </a>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Channel
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={creating}
                onClick={() => {
                  setMode("create");
                  setError(null);
                }}
                className={`border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  mode === "create"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Create new
              </button>
              <button
                type="button"
                disabled={creating}
                onClick={() => {
                  setMode("connect");
                  setError(null);
                  if (userLinkedToSelected) setLoadingChannels(true);
                }}
                className={`border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  mode === "connect"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                Connect existing
              </button>
            </div>
          </fieldset>

          {mode === "create" ? (
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
          ) : userLinkedToSelected ? (
            <div className="space-y-2">
              <label className="block">
                <span className="flex items-center justify-between gap-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Existing channel
                  <button
                    type="button"
                    disabled={creating || loadingChannels}
                    onClick={() => {
                      freshChannelList.current = true;
                      setChannelRefresh((n) => n + 1);
                    }}
                    className="hover:text-foreground disabled:opacity-40"
                  >
                    Refresh
                  </button>
                </span>
                <div className="relative mt-1">
                  <Hash className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
                  <input
                    type="text"
                    value={channelQuery}
                    onChange={(e) => {
                      setChannelQuery(e.target.value);
                      setSelectedChannel(null);
                      setError(null);
                    }}
                    className={`${inputClass} pl-8`}
                    placeholder="Search channels"
                    disabled={creating}
                  />
                </div>
              </label>
              <p className="text-[11px] text-muted">
                Private channels appear after the app has been added to the
                channel in Slack.
              </p>
              {loadingChannels ? (
                <p className="flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading channels…
                </p>
              ) : channelOptions.length > 0 ? (
                <ul className="max-h-48 overflow-y-auto border border-border">
                  {channelOptions.map((channel) => {
                    const selected = selectedChannel?.id === channel.id;
                    return (
                      <li key={channel.id}>
                        <button
                          type="button"
                          disabled={creating}
                          onClick={() => {
                            setSelectedChannel(channel);
                            setError(null);
                          }}
                          aria-pressed={selected}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs transition-colors ${
                            selected
                              ? "bg-foreground text-background"
                              : "text-foreground hover:bg-surface"
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {selected ? (
                              <Check className="size-3.5 shrink-0" />
                            ) : null}
                            <span className="truncate">#{channel.name}</span>
                          </span>
                          {channel.isPrivate ? (
                            <span
                              className={`shrink-0 text-[10px] uppercase tracking-wide ${
                                selected ? "text-background/70" : "text-muted"
                              }`}
                            >
                              Private
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-muted">
                  No channels match. For a private channel, add the app in
                  Slack, then search again.
                </p>
              )}
              {channelsTruncated ? (
                <p className="text-[11px] text-muted">
                  This workspace has more channels than were loaded. Search by
                  name to narrow the list.
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}

      {mode === "create" || workspaces.length === 0 ? (
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
      ) : null}

      <SetupCreateOrLinkRow
        create={
          mode === "connect" && workspaces.length > 0 && userLinkedToSelected
            ? {
                label: "Connect Slack Channel",
                busyLabel: "Connecting…",
                busy: creating,
                disabled: !selectedChannel || !teamId,
                icon: <Check className="size-3.5" />,
                onClick: () => void handleConnect(),
              }
            : mode === "create" &&
                workspaces.length > 0 &&
                userLinkedToSelected
              ? {
                  label: "Create Slack Channel",
                  busy: creating,
                  disabled: !channelName.trim() || !teamId,
                  icon: <Check className="size-3.5" />,
                  onClick: () => void handleCreate(),
                }
              : undefined
        }
        {...(mode === "connect"
          ? {}
          : {
              urlLabel: "Slack URL",
              urlValue: channelUrl,
              urlPlaceholder: "https://app.slack.com/client/…",
              urlDisabled: creating,
              onUrlChange: (value: string) => {
                setChannelUrl(value);
                setError(null);
              },
              saveLabel: "Save Slack Link",
              saveDisabled: creating || !channelUrl.trim(),
              onSave: handleManualComplete,
            })}
        extra={
          editing ? (
            <button
              type="button"
              onClick={() => {
                onChannelNameChange(savedName);
                setChannelUrl(view.channelUrl ?? "");
                setIsPrivate(view.isPrivate ?? false);
                setError(null);
                setInfo(null);
                setEditing(false);
              }}
              className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
            >
              Cancel
            </button>
          ) : null
        }
      />

      {info && !error && <p className="text-xs text-muted">{info}</p>}
      {error && <p className="text-xs text-btr">{error}</p>}
    </div>
  );
}
