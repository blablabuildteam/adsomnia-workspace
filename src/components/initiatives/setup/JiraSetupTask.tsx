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
import {
  JIRA_EPIC_COLOR_HEX,
  JIRA_EPIC_COLORS,
  type JiraEpicColor,
  milestonesToEpicSeeds,
} from "@/lib/integrations/jira-plan";

type JiraInstance = "adsomnia" | "btr" | "hn";

const PARTY_JIRA_LABEL: Record<string, string> = {
  as: "Adsomnia",
  adsomnia: "Adsomnia",
  btr: "Bending The Rules",
  hn: "Harlem Next",
};

type JiraWorkspaceOption = {
  id: JiraInstance;
  label: string;
  host: string;
};

type SuggestedTarget = {
  instance: JiraInstance;
  label: string;
  host: string;
  reason: "lead" | "fallback";
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
    name: seed.name,
    startDate: seed.startDate ?? "",
    endDate: seed.endDate ?? "",
    description: seed.description,
    color: seed.color ?? JIRA_EPIC_COLORS[index % JIRA_EPIC_COLORS.length],
  }));
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
  const suggestion = suggestedName || data.suggestedName || "";
  const savedUrl = data.boardUrl || data.projectUrl || "";
  const savedName = data.projectName || suggestion;
  const [spaceTitle, setSpaceTitle] = useState(data.projectName || suggestion);
  const [epics, setEpics] = useState<EditableEpic[]>(() =>
    seedsToEditable(milestones),
  );
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<SuggestedTarget | null>(null);
  const [loadingSites, setLoadingSites] = useState(true);
  const [optimistic, setOptimistic] = useState<JiraSetupData | null>(null);

  const view = optimistic ?? data;
  const target = suggested;
  const canCreate = Boolean(target);

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
        setSuggested(null);
        return;
      }
      const body = (await res.json()) as {
        instances: JiraWorkspaceOption[];
        suggested: SuggestedTarget | null;
      };
      setSuggested(body.suggested ?? null);
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
    const name = spaceTitle.trim() || suggestion;
    if (!name) {
      setError("Space title is required.");
      return;
    }
    if (!target) {
      setError("No Jira site is connected for this lead production partner.");
      return;
    }
    const readyEpics = epics
      .map((epic) => ({
        name: epic.name.trim(),
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
      setManualMode(false);
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
      projectName: spaceTitle.trim() || suggestion,
    });
    setEditing(false);
    setManualMode(false);
  };

  if (view.status === "completed" && !editing) {
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
            {savedUrl && (
              <a
                href={view.boardUrl || savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-[#38BDF8] hover:underline"
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
              setSpaceTitle(view.projectName || savedName);
              onBoardUrlChange(view.boardUrl || savedUrl);
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

  const partnerLabel =
    target?.label ?? (leadParty ? PARTY_JIRA_LABEL[leadParty] : null);

  return (
    <div className="space-y-4">
      {!editing && (
        <p className="text-xs text-muted">
          Create Jira for this workstream
          {partnerLabel ? ` on ${partnerLabel}` : ""}. Review the recommended
          space title and epics before creating
          {ticketId ? (
            <>
              {" "}
              — project key will be based on{" "}
              <span className="font-mono text-foreground">{ticketId}</span>
            </>
          ) : null}
          .
        </p>
      )}

      {loadingSites ? (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Loader2 className="size-3.5 animate-spin" />
          Checking Jira connection…
        </p>
      ) : target ? (
        <p className="text-xs text-muted">
          Site:{" "}
          <span className="text-foreground">
            {target.label}
            {target.host ? ` · ${target.host.replace(/^https?:\/\//, "")}` : ""}
          </span>
          {target.reason === "fallback" ? (
            <span className="ml-1">
              (no dedicated Jira for this lead partner — using Adsomnia)
            </span>
          ) : null}
        </p>
      ) : leadParty && PARTY_JIRA_LABEL[leadParty] && !target ? (
        <p className="text-xs text-btr">
          {partnerLabel ?? "This partner"} Jira is not connected yet. Paste a
          URL below, or add that site&apos;s credentials.
        </p>
      ) : (
        <p className="text-xs text-muted">
          No Jira site is configured. Paste a URL to confirm an existing space.
        </p>
      )}

      <div>
        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Space title<span className="ml-1 text-btr">*</span>
          </span>
          <div className="mt-1 flex items-stretch gap-2">
            <input
              type="text"
              value={spaceTitle}
              onChange={(e) => {
                setSpaceTitle(e.target.value);
                setError(null);
              }}
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
      </div>

      {!manualMode && canCreate && (
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
                  <input
                    type="text"
                    value={epic.name}
                    onChange={(e) =>
                      updateEpic(epic.id, { name: e.target.value })
                    }
                    placeholder="Epic name"
                    disabled={creating}
                    className="w-full border-b border-border bg-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none disabled:opacity-40"
                  />
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

      {(manualMode || !canCreate) && (
        <label className="block">
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Jira URL{!canCreate ? <span className="ml-1 text-btr">*</span> : null}
          </span>
          <input
            type="url"
            value={boardUrl}
            onChange={(e) => {
              onBoardUrlChange(e.target.value);
              setError(null);
            }}
            className={`${inputClass} mt-1`}
            placeholder="https://….atlassian.net/jira/software/projects/…"
            disabled={creating}
          />
        </label>
      )}

      {error && <p className="text-xs text-btr">{error}</p>}
      {info && !error && <p className="text-xs text-muted">{info}</p>}

      <div className="flex flex-wrap items-center gap-3">
        {canCreate && !manualMode && (
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !(spaceTitle.trim() || suggestion)}
            className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
          >
            {creating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <SquareKanban className="size-3.5" />
            )}
            {creating ? "Creating…" : "Create Jira"}
          </button>
        )}

        {(manualMode || !canCreate) && (
          <button
            type="button"
            onClick={handleManualSave}
            disabled={!boardUrl.trim()}
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
          >
            <Check className="size-3.5" />
            {editing ? "Save Jira Link" : "Confirm Existing"}
          </button>
        )}

        {canCreate && !manualMode && (
          <button
            type="button"
            onClick={() => setManualMode(true)}
            className="font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground"
          >
            Confirm existing instead
          </button>
        )}

        {manualMode && canCreate && (
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
              setSpaceTitle(savedName);
              onBoardUrlChange(savedUrl);
              setEpics(seedsToEditable(milestones));
              setError(null);
              setInfo(null);
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
