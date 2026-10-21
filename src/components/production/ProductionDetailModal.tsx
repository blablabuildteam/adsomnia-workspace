"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, ArrowUpRight, ChevronDown, X } from "lucide-react";
import {
  loadProductionJourney,
  linkProductionTool,
  setProductionArchived,
  updateProductionConsensusPriority,
} from "@/app/(workspace)/pipeline/production/actions";
import { ShareButton } from "@/components/initiatives/ShareButton";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { ConsensusPriorityChip } from "@/components/production/ConsensusPriorityChip";
import { ProductionDetailView } from "@/components/production/ProductionDetailView";
import { inputClass } from "@/lib/form-styles";
import type { ProductionProject } from "@/lib/production/health";
import type { JourneyStage } from "@/lib/production/load";
import { useProductionEpicTasks } from "@/components/production/useProductionEpicTasks";
import {
  PRIORITY_META,
  PRIORITY_OPTIONS,
} from "@/lib/validation-data";

function PriorityControl({
  value,
  canAdjust,
  disabled,
  onChange,
}: {
  value?: string;
  canAdjust: boolean;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  if (!canAdjust) {
    return <ConsensusPriorityChip value={value} />;
  }

  const color = value ? PRIORITY_META[value]?.color : undefined;

  return (
    <span className="relative inline-flex items-center">
      <select
        value={value ?? ""}
        disabled={disabled}
        aria-label="Consensus priority"
        onChange={(event) => {
          const next = event.target.value;
          if (next) onChange(next);
        }}
        className={[
          "appearance-none border bg-transparent py-0.5 pl-2 pr-6 font-display text-[10px] font-bold uppercase tracking-wide",
          color ? "" : "border-border text-muted/50",
          disabled ? "opacity-50" : "cursor-pointer",
        ].join(" ")}
        style={
          color
            ? {
                borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
                color,
              }
            : undefined
        }
      >
        {!value && <option value="">TBD</option>}
        {PRIORITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 size-3 text-current opacity-70" />
    </span>
  );
}

type Props = {
  project: ProductionProject | null;
  /** Public link to this project's production view. */
  sharePath?: string;
  canArchive: boolean;
  canAdjustPriority: boolean;
  canEditTools?: boolean;
  onClose: () => void;
  onArchived: () => void;
  onPriorityUpdated: () => void;
  onToolsUpdated?: () => void;
};

export function ProductionDetailModal({
  project,
  sharePath,
  canArchive,
  canAdjustPriority,
  canEditTools = false,
  onClose,
  onArchived,
  onPriorityUpdated,
  onToolsUpdated,
}: Props) {
  const [journey, setJourney] = useState<JourneyStage[] | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiving, startArchive] = useTransition();
  const [priority, setPriority] = useState<string | undefined>(undefined);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [priorityPending, startPriority] = useTransition();
  const [addingTool, setAddingTool] = useState<"slack" | "drive" | null>(null);
  const [toolUrl, setToolUrl] = useState("");
  const [toolError, setToolError] = useState<string | null>(null);
  const [toolPending, startTool] = useTransition();
  const { tasksByEpic, loading: tasksLoading } = useProductionEpicTasks(
    project?.id ?? null,
    Boolean(project),
  );

  useEffect(() => {
    if (!project) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (addingTool) {
        setAddingTool(null);
        setToolError(null);
        return;
      }
      if (confirmArchive) {
        setConfirmArchive(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [project, onClose, confirmArchive, addingTool]);

  useEffect(() => {
    setJourney(null);
    setConfirmArchive(false);
    setArchiveError(null);
    setPriority(project?.brief.consensusPriority);
    setPriorityError(null);
    setAddingTool(null);
    setToolUrl("");
    setToolError(null);
    if (!project || project.addedManually) return;
    let cancelled = false;
    loadProductionJourney(project.id).then((rows) => {
      if (!cancelled) setJourney(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [project]);

  if (!project) return null;

  const archived = Boolean(project.archivedAt);

  function runArchive(nextArchived: boolean) {
    if (!project) return;
    setArchiveError(null);
    startArchive(async () => {
      const result = await setProductionArchived(project.id, nextArchived);
      if (result.error) {
        setArchiveError(result.error);
        return;
      }
      setConfirmArchive(false);
      onArchived();
    });
  }

  const priorityControl = (
    <>
      <PriorityControl
        value={priority ?? project.brief.consensusPriority}
        canAdjust={canAdjustPriority}
        disabled={priorityPending}
        onChange={(next) => {
          const previous = priority ?? project.brief.consensusPriority;
          setPriority(next);
          setPriorityError(null);
          startPriority(async () => {
            const result = await updateProductionConsensusPriority(
              project.id,
              next,
            );
            if (result.error) {
              setPriority(previous);
              setPriorityError(result.error);
              return;
            }
            onPriorityUpdated();
          });
        }}
      />
      {priorityError && (
        <p className="mt-1 text-[10px] text-danger">{priorityError}</p>
      )}
    </>
  );

  const toolForm = addingTool && (
    <form
      className="mt-4 max-w-xl space-y-2 border border-border bg-hover px-3 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        setToolError(null);
        startTool(async () => {
          const result = await linkProductionTool(
            project.id,
            addingTool,
            toolUrl,
          );
          if (result.error) {
            setToolError(result.error);
            return;
          }
          setAddingTool(null);
          setToolUrl("");
          onToolsUpdated?.();
        });
      }}
    >
      <label className="block">
        <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          {addingTool === "slack" ? "Slack channel URL" : "Google Drive URL"}
        </span>
        <input
          type="url"
          value={toolUrl}
          onChange={(event) => setToolUrl(event.target.value)}
          placeholder={
            addingTool === "slack"
              ? "https://….slack.com/archives/…"
              : "https://drive.google.com/…"
          }
          className={inputClass}
          autoFocus
        />
      </label>
      {toolError && <p className="text-[11px] text-danger">{toolError}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setAddingTool(null);
            setToolUrl("");
            setToolError(null);
          }}
          disabled={toolPending}
          className="border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={toolPending}
          className="border border-foreground bg-foreground px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-background disabled:opacity-50"
        >
          {toolPending ? "Saving…" : "Save link"}
        </button>
      </div>
    </form>
  );

  const actions = (
    <>
      {!project.addedManually && (
        <Link
          href={`/workstreams/${project.id}`}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
        >
          Open full workstream
          <ArrowUpRight className="size-3.5" />
        </Link>
      )}
      {canArchive && (
        <button
          type="button"
          onClick={() =>
            archived ? runArchive(false) : setConfirmArchive(true)
          }
          disabled={archiving}
          className={[
            "inline-flex w-full items-center justify-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50",
            project.addedManually ? "mt-5" : "mt-2",
          ].join(" ")}
        >
          {archived ? (
            <>
              <ArchiveRestore className="size-3.5" />
              {archiving ? "Restoring…" : "Restore"}
            </>
          ) : (
            <>
              <Archive className="size-3.5" />
              Archive project
            </>
          )}
        </button>
      )}
      {archiveError && (
        <p className="mt-2 text-[12px] text-danger">{archiveError}</p>
      )}
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 lg:p-8">
      <button
        type="button"
        aria-label="Close production details"
        className="absolute inset-0 bg-scrim backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className="workspace-content relative z-10 flex h-full w-full max-w-6xl flex-col border border-border-strong bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.8)] animate-fade-in sm:h-auto sm:max-h-full"
        role="dialog"
        aria-modal="true"
        aria-labelledby="production-detail-title"
      >
        <ProductionDetailView
          key={project.id}
          project={project}
          journey={journey}
          tasksByEpic={tasksByEpic}
          tasksLoading={tasksLoading}
          consensusPriority={priority}
          priority={priorityControl}
          onAddTool={
            canEditTools
              ? (key) => {
                  if (key === "jira") return;
                  setAddingTool((current) => (current === key ? null : key));
                  setToolUrl("");
                  setToolError(null);
                }
              : undefined
          }
          toolForm={toolForm}
          actions={actions}
          scrollBody
          titleId="production-detail-title"
          headerActions={
            <>
              {sharePath && <ShareButton path={sharePath} />}
              <button
                type="button"
                onClick={onClose}
                className="border border-border p-2 text-muted transition-colors hover:border-foreground hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </>
          }
        />
      </div>

      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Archive project"
        actions={
          <>
            <ModalButton
              onClick={() => setConfirmArchive(false)}
              disabled={archiving}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant="primary"
              onClick={() => runArchive(true)}
              disabled={archiving}
            >
              {archiving ? "Archiving…" : "Archive"}
            </ModalButton>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-muted">
          {project.title} will move to On Hold in Production & Reporting. You
          can restore it later.
        </p>
      </Modal>
    </div>
  );
}
