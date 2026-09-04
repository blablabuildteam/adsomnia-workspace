"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Flag,
  Users,
  X,
} from "lucide-react";
import {
  loadProductionJourney,
  setProductionArchived,
} from "@/app/(workspace)/pipeline/production/actions";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { ProductionHealthBadge } from "@/components/production/ProductionHealthBadge";
import {
  EpicTicketGroups,
  STATUS_COLORS,
  StatusFillBar,
} from "@/components/production/epic-tickets";
import { getStageColor, PARTIES, STAGES } from "@/data/workflow";
import {
  formatShortDate,
  HEALTH_META,
  type ProductionEpic,
  type ProductionProject,
} from "@/lib/production/health";
import type { JourneyStage } from "@/lib/production/load";

const FLAG_COPY: Record<string, string> = {
  "no-end-date": "No end date — excluded from risk",
  "no-start-date": "No start date — excluded from risk",
  "no-tickets": "No nested tickets — excluded from risk",
};

function partyMeta(id: string | null) {
  if (!id) return null;
  return PARTIES.find((party) => party.id === id) ?? null;
}

function formatJourneyDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium" });
}

const TOOL_ORDER = [
  {
    key: "jira" as const,
    logo: "/logos/jira.png",
    fallback: "Jira",
  },
  {
    key: "slack" as const,
    logo: "/logos/slack.png",
    fallback: "Slack",
  },
  {
    key: "drive" as const,
    logo: "/logos/google-drive.png",
    fallback: "Drive",
  },
];

function ToolChip({
  logo,
  label,
  href,
}: {
  logo: string;
  label: string;
  href?: string;
}) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" className="size-3.5 shrink-0 object-contain" />
      <span className="truncate">{label}</span>
    </>
  );
  const cls =
    "inline-flex max-w-full items-center gap-1.5 border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`${cls} border-border text-foreground transition-colors hover:border-foreground`}
      >
        {inner}
      </a>
    );
  }

  return (
    <span className={`${cls} border-dashed border-border text-muted/50`}>
      {inner}
    </span>
  );
}

function EpicRow({ epic }: { epic: ProductionEpic }) {
  const [ticketsOpen, setTicketsOpen] = useState(true);
  const openCount = Math.max(epic.total - epic.done - epic.inProgress, 0);

  return (
    <div className="border border-border bg-white/[0.02] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{epic.name}</p>
          <p className="mt-0.5 font-display text-[10px] font-bold uppercase tracking-wider text-muted">
            {epic.key}
            {epic.status ? ` · ${epic.status}` : ""}
          </p>
        </div>
        {epic.health ? (
          <ProductionHealthBadge health={epic.health} compact />
        ) : (
          <span className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-[#EAB308]">
            <Flag className="size-3" />
            Flagged
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-3" />
          {epic.startDate ? formatShortDate(epic.startDate) : "No start"}
          {" – "}
          {epic.endDate ? formatShortDate(epic.endDate) : "No end"}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <div>
          <p
            className="font-display text-sm font-bold tabular-nums"
            style={{ color: STATUS_COLORS.done }}
          >
            {epic.done}
          </p>
          <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
            Done
          </p>
        </div>
        <div>
          <p
            className="font-display text-sm font-bold tabular-nums"
            style={{ color: STATUS_COLORS.inProgress }}
          >
            {epic.inProgress}
          </p>
          <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
            In progress
          </p>
        </div>
        <div>
          <p
            className="font-display text-sm font-bold tabular-nums"
            style={{ color: STATUS_COLORS.open }}
          >
            {openCount}
          </p>
          <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
            Open
          </p>
        </div>
      </div>

      <StatusFillBar
        done={epic.done}
        inProgress={epic.inProgress}
        total={epic.total}
        className="mt-2 h-1.5"
      />

      {epic.flagged && epic.flagReason && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#EAB308]">
          <AlertTriangle className="size-3" />
          {FLAG_COPY[epic.flagReason]}
        </p>
      )}
      {!epic.flagged &&
        epic.timeElapsedPct !== undefined &&
        epic.ticketsDonePct !== undefined && (
          <p className="mt-2 text-[11px] text-muted">
            Time {Math.round(epic.timeElapsedPct)}% elapsed ·{" "}
            {Math.round(epic.ticketsDonePct)}% of tickets done
          </p>
        )}

      {epic.tasks.length > 0 && (
        <div className="mt-3 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => setTicketsOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Tickets
              <span className="ml-1.5 tabular-nums">{epic.tasks.length}</span>
            </span>
            <ChevronDown
              className={[
                "size-3.5 text-muted transition-transform",
                ticketsOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          {ticketsOpen && (
            <EpicTicketGroups
              tasks={epic.tasks}
              className="mt-2.5 max-h-72 space-y-3 overflow-y-auto pr-1"
            />
          )}
        </div>
      )}
    </div>
  );
}

type Props = {
  project: ProductionProject | null;
  canArchive: boolean;
  onClose: () => void;
  onArchived: () => void;
};

export function ProductionDetailDrawer({
  project,
  canArchive,
  onClose,
  onArchived,
}: Props) {
  const [journey, setJourney] = useState<JourneyStage[] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiving, startArchive] = useTransition();

  useEffect(() => {
    if (!project) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
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
  }, [project, onClose, confirmArchive]);

  useEffect(() => {
    if (!project) {
      setJourney(null);
      setDetailOpen(false);
      setConfirmArchive(false);
      setArchiveError(null);
      return;
    }
    let cancelled = false;
    setJourney(null);
    setDetailOpen(false);
    setConfirmArchive(false);
    setArchiveError(null);
    loadProductionJourney(project.id).then((rows) => {
      if (!cancelled) setJourney(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [project]);

  if (!project) return null;

  const party = partyMeta(project.leadPartyId);
  const accent = HEALTH_META[project.health].color;
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close production details"
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-surface animate-drawer-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="production-drawer-title"
      >
        <div
          className="border-b border-border px-5 py-4"
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                {project.ticketId}
              </p>
              <h2
                id="production-drawer-title"
                className="font-display mt-1 text-3xl font-extrabold uppercase leading-none"
              >
                {project.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ProductionHealthBadge health={project.health} />
                {archived && (
                  <span className="inline-flex items-center gap-1 border border-muted/40 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    <Archive className="size-3" />
                    Archived
                  </span>
                )}
                {party && (
                  <span
                    className="border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
                    style={{ borderColor: party.color, color: party.color }}
                  >
                    {party.label}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="border border-border p-2 text-muted transition-colors hover:border-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {TOOL_ORDER.map((tool) => {
              const linked = project.tools[tool.key];
              return (
                <ToolChip
                  key={tool.key}
                  logo={tool.logo}
                  label={linked?.label ?? tool.fallback}
                  href={linked?.href}
                />
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              Epic progress
            </h3>
            {project.epics.length === 0 ? (
              <p className="text-sm text-muted">
                {project.jira.fetchError ?? "No epics found on this Jira board."}
              </p>
            ) : (
              <div className="space-y-2">
                {project.epics.map((epic) => (
                  <EpicRow key={epic.key} epic={epic} />
                ))}
              </div>
            )}
          </section>

          <section className="mt-8">
            <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              Pipeline journey
            </h3>
            <ol className="space-y-0">
              {(journey ??
                STAGES.map(
                  (stage): JourneyStage => ({
                    id: stage.id as JourneyStage["id"],
                    label: stage.name,
                  }),
                )).map((stage, index, rows) => {
                const reached =
                  Boolean(stage.enteredAt) || stage.id === "production";
                const color = getStageColor(stage.id);
                const last = index === rows.length - 1;
                return (
                  <li key={stage.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className="size-2.5 shrink-0 border"
                        style={{
                          borderColor: color,
                          backgroundColor: reached ? color : "transparent",
                        }}
                      />
                      {!last && <span className="w-px flex-1 bg-border" />}
                    </div>
                    <div className={last ? "pb-0" : "pb-4"}>
                      <p className="text-sm font-medium">{stage.label}</p>
                      <p className="text-[11px] text-muted">
                        {formatJourneyDate(stage.enteredAt) ??
                          (stage.id === "production"
                            ? "In production"
                            : "Not recorded")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Link
              href={`/workstreams/${project.id}`}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
            >
              Open full workstream
              <ArrowUpRight className="size-3.5" />
            </Link>
            {canArchive && (
              <button
                type="button"
                onClick={() =>
                  archived ? runArchive(false) : setConfirmArchive(true)
                }
                disabled={archiving}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
              >
                {archived ? (
                  <>
                    <ArchiveRestore className="size-3.5" />
                    {archiving ? "Restoring…" : "Restore to Production"}
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
          </section>

          <section className="mt-8">
            <button
              type="button"
              onClick={() => setDetailOpen((open) => !open)}
              className="flex w-full items-center justify-between border-b border-border pb-2"
            >
              <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                Collected pipeline detail
              </h3>
              <ChevronDown
                className={[
                  "size-4 text-muted transition-transform",
                  detailOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>
            {detailOpen && (
              <div className="mt-4 space-y-4">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] text-muted">Submitter</dt>
                    <dd>{project.brief.submitterName}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">Sponsor</dt>
                    <dd>{project.brief.sponsorName}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">T-shirt</dt>
                    <dd>{project.brief.tShirtSize ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted">Priority</dt>
                    <dd>
                      {project.brief.consensusPriority ??
                        project.brief.priority ??
                        "—"}
                    </dd>
                  </div>
                </dl>
                {project.brief.solutionDirection && (
                  <p className="text-sm leading-relaxed text-muted">
                    {project.brief.solutionDirection}
                  </p>
                )}
                {project.brief.team.length > 0 && (
                  <div>
                    <p className="mb-2 inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      <Users className="size-3" />
                      Team
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {project.brief.team.map((member) => (
                        <li key={`${member.name}-${member.role}`}>
                          {member.name}
                          <span className="text-muted"> · {member.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {project.brief.milestones.length > 0 && (
                  <div>
                    <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Scoping milestones
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {project.brief.milestones.map((milestone) => (
                        <li key={`${milestone.epic}-${milestone.milestone}`}>
                          {milestone.epic}
                          {milestone.milestone ? ` · ${milestone.milestone}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </aside>

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
          {project.title} will leave the active Production board and move to
          Archive. You can restore it later.
        </p>
      </Modal>
    </div>
  );
}
