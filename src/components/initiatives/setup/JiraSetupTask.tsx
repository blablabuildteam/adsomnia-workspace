"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  SquareKanban,
  Trash2,
} from "lucide-react";
import type { JiraSetupData, ScopingMilestone } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";
import { normalizeUrl } from "@/lib/validation-data";
import { createAndCompleteJiraBoard } from "@/app/(workspace)/workstreams/[id]/actions";
import { SetupCreateOrLinkRow } from "./SetupCreateOrLinkRow";
import {
  JIRA_EPIC_COLOR_HEX,
  JIRA_EPIC_COLORS,
  JIRA_ISSUE_SUMMARY_MAX,
  JIRA_PROJECT_NAME_MAX,
  type JiraEpicColor,
  milestonesToEpicSeeds,
  ticketIdToProjectKeyHint,
  validateJiraProjectName,
} from "@/lib/integrations/jira-plan";

type JiraInstance = "adsomnia" | "btr" | "hn" | "bbb";

const JIRA_INSTANCES: JiraInstance[] = ["adsomnia", "btr", "hn", "bbb"];

const PARTY_JIRA_LABEL: Record<JiraInstance, string> = {
  adsomnia: "Adsomnia",
  btr: "Bending The Rules",
  hn: "Harlem Next",
  bbb: "blablabuild",
};

const PARTY_JIRA_LOGOS: Record<JiraInstance, string> = {
  adsomnia: "/logos/adsomnia.png",
  btr: "/logos/bendingtherules.jpeg",
  hn: "/logos/harlemnext.webp",
  bbb: "/logos/blablabuild.png",
};

function isJiraInstance(value: string | null | undefined): value is JiraInstance {
  return JIRA_INSTANCES.includes(value as JiraInstance);
}

type JiraWorkspaceOption = {
  id: JiraInstance;
  label: string;
  host: string | null;
  configured: boolean;
};

type SuggestedTarget = {
  instance: JiraInstance;
  label: string;
  host: string;
  reason: "lead" | "fallback" | "selected";
};

type EditableEpic = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
  color: JiraEpicColor;
};

function seedsToEditable(
  milestones: ScopingMilestone[] | undefined,
): EditableEpic[] {
  return milestonesToEpicSeeds(milestones ?? []).map((seed, index) => ({
    id: `epic-${index}-${seed.name}`,
    name: seed.name.slice(0, JIRA_ISSUE_SUMMARY_MAX),
    startDate: seed.startDate ?? "",
    endDate: seed.endDate ?? "",
    description: seed.description,
    color: seed.color ?? JIRA_EPIC_COLORS[index % JIRA_EPIC_COLORS.length],
  }));
}

function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length;
  return (
    <span
      className={`text-[10px] tabular-nums ${n >= max ? "text-btr" : "text-muted"}`}
    >
      {n}/{max}
    </span>
  );
}

type Props = {
  initiativeId: number;
  data: JiraSetupData;
  suggestedName?: string;
  boardUrl: string;
  onBoardUrlChange: (value: string) => void;
  leadParty?: string;
  ticketId?: string;
  milestones?: ScopingMilestone[];
  readOnly?: boolean;
  onComplete: (payload: {
    boardUrl: string;
    projectName: string;
    created?: boolean;
  }) => void;
};

export function JiraSetupTask({
  initiativeId,
  data,
  suggestedName,
  boardUrl,
  onBoardUrlChange,
  leadParty,
  ticketId,
  milestones,
  readOnly,
  onComplete,
}: Props) {
  const router = useRouter();
  const suggestion = (suggestedName || data.suggestedName || "").slice(
    0,
    JIRA_PROJECT_NAME_MAX,
  );
  const savedUrl = data.boardUrl || data.projectUrl || "";
  const savedName = (data.projectName || suggestion).slice(
    0,
    JIRA_PROJECT_NAME_MAX,
  );
  const [spaceTitle, setSpaceTitle] = useState(savedName);
  const projectKeyHint = ticketId
    ? ticketIdToProjectKeyHint(ticketId)
    : "";
  const [epics, setEpics] = useState<EditableEpic[]>(() =>
    seedsToEditable(milestones),
  );
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sites, setSites] = useState<JiraWorkspaceOption[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<JiraInstance | null>(
    () => (isJiraInstance(data.workspace) ? data.workspace : null),
  );
  const [loadingSites, setLoadingSites] = useState(true);
  const [optimistic, setOptimistic] = useState<JiraSetupData | null>(null);

  const view = optimistic ?? data;
  const selectedSite = sites.find((site) => site.id === selectedInstance);
  const target =
    selectedSite?.configured && selectedSite.host
      ? {
          instance: selectedSite.id,
          label: selectedSite.label,
          host: selectedSite.host,
        }
      : null;
  const canCreate = Boolean(target);
  const hasConfiguredSite = sites.some((site) => site.configured);

  const loadSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const query = leadParty
        ? `?leadParty=${encodeURIComponent(leadParty)}`
        : "";
      const res = await fetch(`/api/integrations/jira/workspaces${query}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Could not load Jira sites.");
        setSites([]);
        return;
      }
      const body = (await res.json()) as {
        instances: JiraWorkspaceOption[];
        suggested: SuggestedTarget | null;
      };
      const instances = body.instances ?? [];
      setSites(instances);
      setSelectedInstance((current) => {
        if (
          current &&
          instances.some((site) => site.id === current && site.configured)
        ) {
          return current;
        }
        const suggested = body.suggested?.instance;
        if (
          suggested &&
          instances.some((site) => site.id === suggested && site.configured)
        ) {
          return suggested;
        }
        return null;
      });
    } catch {
      setError("Could not load Jira sites.");
    } finally {
      setLoadingSites(false);
    }
  }, [leadParty]);

  useEffect(() => {
    setOptimistic(null);
  }, [data.status, data.boardUrl, data.projectKey]);

  useEffect(() => {
    if (readOnly || (view.status === "completed" && !editing)) return;
    void loadSites();
  }, [readOnly, view.status, editing, loadSites]);

  const updateEpic = (id: string, patch: Partial<EditableEpic>) => {
    setEpics((current) =>
      current.map((epic) => (epic.id === id ? { ...epic, ...patch } : epic)),
    );
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(spaceTitle);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    const name = (spaceTitle.trim() || suggestion).slice(
      0,
      JIRA_PROJECT_NAME_MAX,
    );
    if (!name) {
      setError("Space title is required.");
      return;
    }
    const nameError = validateJiraProjectName(name);
    if (nameError) {
      setError(nameError);
      return;
    }
    if (!target) {
      setError("Choose a Jira environment before creating the board.");
      return;
    }
    const readyEpics = epics
      .map((epic) => ({
        name: epic.name.trim().slice(0, JIRA_ISSUE_SUMMARY_MAX),
        description: epic.description,
        startDate: epic.startDate || undefined,
        endDate: epic.endDate || undefined,
        color: epic.color,
      }))
      .filter((epic) => epic.name);
    if (epics.length > 0 && readyEpics.length === 0) {
      setError("Give each epic a name, or remove empty rows.");
      return;
    }
    setError(null);
    setInfo(null);
    setCreating(true);
    try {
      const result = await createAndCompleteJiraBoard(initiativeId, {
        instance: target.instance,
        name,
        epics: readyEpics,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const nextUrl = result.boardUrl ?? "";
      if (nextUrl) onBoardUrlChange(nextUrl);
      setSpaceTitle(result.projectName ?? name);
      setOptimistic({
        ...data,
        status: "completed",
        projectName: result.projectName ?? name,
        projectKey: result.projectKey,
        boardUrl: nextUrl,
        projectUrl: nextUrl,
        workspace: result.workspace,
        completedAt: new Date().toISOString(),
      });
      if (result.epicError) {
        setInfo(result.epicError);
      }
      onComplete({
        boardUrl: nextUrl,
        projectName: result.projectName ?? name,
        created: true,
      });
      setEditing(false);
      router.refresh();
    } finally {
      setCreating(false);
    }
  };

  const handleManualSave = () => {
    const url = normalizeUrl(boardUrl);
    if (!url) {
      setError("A valid Jira URL is required.");
      return;
    }
    setError(null);
    onComplete({
      boardUrl: url,
      projectName: (spaceTitle.trim() || suggestion).slice(
        0,
        JIRA_PROJECT_NAME_MAX,
      ),
    });
    setEditing(false);
  };

  if (view.status === "completed" && !editing) {
    const workspaceLabel = isJiraInstance(view.workspace)
      ? PARTY_JIRA_LABEL[view.workspace]
      : null;
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <SquareKanban className="size-4 shrink-0 text-success" />
          <div>
            <p className="text-xs text-foreground">
              {view.projectName || savedName || "Jira"}
              {view.projectKey ? (
                <span className="ml-2 font-mono text-[10px] text-muted">
                  {view.projectKey}
                </span>
              ) : null}
            </p>
            {workspaceLabel && (
              <p className="mt-0.5 text-[10px] text-muted">{workspaceLabel}</p>
            )}
            {savedUrl && (
              <a
                href={view.boardUrl || savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-info hover:underline"
              >
                Open in Jira
                <ExternalLink className="size-2.5" />
              </a>
            )}
          </div>
        </div>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setSpaceTitle(
                (view.projectName || savedName).slice(0, JIRA_PROJECT_NAME_MAX),
              );
              onBoardUrlChange(view.boardUrl || savedUrl);
              if (isJiraInstance(view.workspace)) {
                setSelectedInstance(view.workspace);
              }
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
    return <div className="text-xs text-muted">Awaiting Jira setup.</div>;
  }

  const environmentOptions =
    sites.length > 0
      ? sites
      : JIRA_INSTANCES.map((id) => ({
          id,
          label: PARTY_JIRA_LABEL[id],
          host: null,
          configured: false,
        }));

  return (
    <div className="space-y-4">
      {!editing && (
        <p className="text-xs text-muted">
          Choose which Jira environment this board should be created in, then
          review the space title and epics
          {projectKeyHint ? (
            <>
              {" "}
              — project key will be{" "}
              <span className="font-mono text-foreground">{projectKeyHint}</span>
            </>
          ) : null}
          .
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Jira environment<span className="ml-1 text-btr">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {environmentOptions.map((site) => {
            const selected = selectedInstance === site.id;
            return (
              <button
                key={site.id}
                type="button"
                disabled={creating || loadingSites || !site.configured}
                onClick={() => {
                  setSelectedInstance(site.id);
                  setError(null);
                }}
                aria-pressed={selected}
                title={
                  site.configured
                    ? site.host
                      ? `${site.label} · ${site.host.replace(/^https?:\/\//, "")}`
                      : site.label
                    : `${site.label} Jira is not connected yet`
                }
                className={[
                  "flex flex-col items-center justify-center gap-2 border px-3 py-3 transition-colors",
                  selected
                    ? "border-foreground bg-foreground/[0.06] text-foreground"
                    : "border-border text-muted hover:border-foreground hover:text-foreground",
                  !site.configured || loadingSites
                    ? "cursor-not-allowed opacity-40"
                    : "",
                ].join(" ")}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PARTY_JIRA_LOGOS[site.id]}
                  alt=""
                  className="h-6 w-auto max-w-full object-contain"
                />
                <span className="font-display flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide">
                  {selected && (
                    <Check className="animate-check-pop size-3 shrink-0" />
                  )}
                  {site.label}
                </span>
                {!loadingSites && !site.configured && (
                  <span className="text-[9px] text-muted">Not connected</span>
                )}
              </button>
            );
          })}
        </div>
        {loadingSites ? (
          <p className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="size-3.5 animate-spin" />
            Checking Jira connections…
          </p>
        ) : target ? (
          <p className="text-xs text-muted">
            Create on{" "}
            <span className="text-foreground">
              {target.label}
              {target.host
                ? ` · ${target.host.replace(/^https?:\/\//, "")}`
                : ""}
            </span>
          </p>
        ) : hasConfiguredSite ? (
          <p className="text-xs text-muted">
            Select a Jira environment first. This is independent of the lead
            production party.
          </p>
        ) : (
          <p className="text-xs text-muted">
            No Jira site is configured. Paste a URL to confirm an existing
            space.
          </p>
        )}
      </fieldset>

      <div>
        <label className="block">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Space title<span className="ml-1 text-btr">*</span>
            </span>
            <CharCount value={spaceTitle} max={JIRA_PROJECT_NAME_MAX} />
          </span>
          <div className="mt-1 flex items-stretch gap-2">
            <input
              type="text"
              value={spaceTitle}
              onChange={(e) => {
                setSpaceTitle(e.target.value.slice(0, JIRA_PROJECT_NAME_MAX));
                setError(null);
              }}
              maxLength={JIRA_PROJECT_NAME_MAX}
              className={`${inputClass} flex-1`}
              placeholder={suggestion}
              disabled={creating}
            />
            <button
              type="button"
              onClick={handleCopy}
              disabled={creating}
              className="flex items-center justify-center border border-border px-3 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
            >
              {copied ? (
                <Check className="size-3.5 text-success" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
        </label>
        {suggestion && spaceTitle.trim() === suggestion && (
          <p className="mt-1 text-[10px] text-muted">
            Recommended from {ticketId ? `${ticketId} · ` : ""}the workstream
            title
          </p>
        )}
        {spaceTitle.length >= JIRA_PROJECT_NAME_MAX && (
          <p className="mt-1 text-[10px] text-btr">
            Jira allows {JIRA_PROJECT_NAME_MAX} characters for a space title.
          </p>
        )}
      </div>

      {canCreate && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Epics to create
            </p>
            <span className="text-[10px] text-muted">
              Pre-filled from scoping — edit before create
            </span>
          </div>
          {epics.length === 0 ? (
            <p className="border border-border bg-surface px-3 py-2 text-xs text-muted">
              No scoping epics yet. Add one below, or create the space without
              epics.
            </p>
          ) : (
            <div className="space-y-2">
              {epics.map((epic, index) => (
                <div
                  key={epic.id}
                  className="space-y-2 border border-border bg-surface px-3 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0"
                      style={{ backgroundColor: JIRA_EPIC_COLOR_HEX[epic.color] }}
                      aria-hidden
                    />
                    <span className="font-display text-[9px] font-bold uppercase tracking-widest text-muted/50">
                      Epic {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setEpics((current) =>
                          current.filter((row) => row.id !== epic.id),
                        )
                      }
                      disabled={creating}
                      className="ml-auto text-muted hover:text-btr disabled:opacity-40"
                      aria-label={`Remove ${epic.name || `epic ${index + 1}`}`}
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={epic.name}
                      onChange={(e) =>
                        updateEpic(epic.id, {
                          name: e.target.value.slice(0, JIRA_ISSUE_SUMMARY_MAX),
                        })
                      }
                      maxLength={JIRA_ISSUE_SUMMARY_MAX}
                      placeholder="Epic name"
                      disabled={creating}
                      className="w-full border-b border-border bg-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none disabled:opacity-40"
                    />
                    {epic.name.length >= 200 && (
                      <div className="mt-1 text-right">
                        <CharCount
                          value={epic.name}
                          max={JIRA_ISSUE_SUMMARY_MAX}
                        />
                      </div>
                    )}
                  </div>
                  <fieldset className="space-y-1.5">
                    <legend className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
                      Color
                    </legend>
                    <div className="flex flex-wrap gap-1.5">
                      {JIRA_EPIC_COLORS.map((color) => {
                        const selected = epic.color === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            disabled={creating}
                            onClick={() => updateEpic(epic.id, { color })}
                            title={color.replaceAll("_", " ")}
                            aria-label={`Set color ${color.replaceAll("_", " ")}`}
                            aria-pressed={selected}
                            className="size-5 border transition-colors disabled:opacity-40"
                            style={{
                              backgroundColor: JIRA_EPIC_COLOR_HEX[color],
                              borderColor: selected
                                ? "#FFFFFF"
                                : "transparent",
                            }}
                          />
                        );
                      })}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
                        Start
                      </span>
                      <input
                        type="date"
                        value={epic.startDate}
                        onChange={(e) =>
                          updateEpic(epic.id, { startDate: e.target.value })
                        }
                        disabled={creating}
                        className={`${inputClass} mt-1 py-2 text-sm`}
                      />
                    </label>
                    <label className="block">
                      <span className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
                        End
                      </span>
                      <input
                        type="date"
                        value={epic.endDate}
                        onChange={(e) =>
                          updateEpic(epic.id, { endDate: e.target.value })
                        }
                        disabled={creating}
                        className={`${inputClass} mt-1 py-2 text-sm`}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              setEpics((current) => [
                ...current,
                {
                  id: `epic-new-${Date.now()}`,
                  name: "",
                  startDate: "",
                  endDate: "",
                  color: JIRA_EPIC_COLORS[
                    current.length % JIRA_EPIC_COLORS.length
                  ],
                },
              ])
            }
            disabled={creating}
            className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-40"
          >
            <Plus className="size-3" />
            Add epic
          </button>
        </div>
      )}

      <SetupCreateOrLinkRow
        create={
          loadingSites || hasConfiguredSite
            ? {
                label: "Create Jira",
                busy: creating,
                disabled:
                  loadingSites ||
                  !target ||
                  !(spaceTitle.trim() || suggestion),
                icon: <SquareKanban className="size-3.5" />,
                onClick: () => void handleCreate(),
              }
            : undefined
        }
        urlLabel="Jira URL"
        urlValue={boardUrl}
        urlPlaceholder="https://….atlassian.net/jira/software/projects/…"
        urlDisabled={creating}
        onUrlChange={(value) => {
          onBoardUrlChange(value);
          setError(null);
        }}
        saveLabel="Save Jira Link"
        saveDisabled={creating || !boardUrl.trim()}
        onSave={handleManualSave}
        extra={
          editing ? (
            <button
              type="button"
              onClick={() => {
                setSpaceTitle(savedName);
                onBoardUrlChange(savedUrl);
                setEpics(seedsToEditable(milestones));
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

      {error && <p className="text-xs text-btr">{error}</p>}
      {info && !error && <p className="text-xs text-muted">{info}</p>}
    </div>
  );
}
