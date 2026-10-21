"use client";

import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Flag,
  PauseCircle,
  Users,
} from "lucide-react";
import { ConsensusPriorityChip } from "@/components/production/ConsensusPriorityChip";
import { ProductionBriefHero } from "@/components/production/ProductionBriefHero";
import { ProductionHealthBadge } from "@/components/production/ProductionHealthBadge";
import {
  EpicTicketGroups,
  STATUS_COLORS,
  StatusFillBar,
} from "@/components/production/epic-tickets";
import { getPartyInk, getStageColor, PARTIES, STAGES } from "@/data/workflow";
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

export type ProductionToolKey = "jira" | "slack" | "drive";

const TOOL_ORDER: { key: ProductionToolKey; logo: string; fallback: string }[] =
  [
    { key: "jira", logo: "/logos/jira.png", fallback: "Jira" },
    { key: "slack", logo: "/logos/slack.png", fallback: "Slack" },
    { key: "drive", logo: "/logos/google-drive.png", fallback: "Drive" },
  ];

function ToolIcon({
  logo,
  label,
  href,
  onAdd,
}: {
  logo: string;
  label: string;
  href?: string;
  onAdd?: () => void;
}) {
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className="size-4 object-contain" />
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={label}
        aria-label={`Open ${label}`}
        className="inline-flex size-8 items-center justify-center border border-border text-foreground transition-colors hover:border-foreground"
      >
        {icon}
      </a>
    );
  }

  if (onAdd) {
    return (
      <button
        type="button"
        onClick={onAdd}
        title={`Add ${label}`}
        aria-label={`Add ${label}`}
        className="inline-flex size-8 items-center justify-center border border-dashed border-border text-foreground opacity-40 transition-opacity hover:border-foreground hover:opacity-100"
      >
        {icon}
      </button>
    );
  }

  return (
    <span
      title={`${label} not linked`}
      aria-label={`${label} not linked`}
      className="inline-flex size-8 items-center justify-center border border-dashed border-border opacity-40"
    >
      {icon}
    </span>
  );
}

function EpicRow({
  epic,
  tasks,
  tasksLoading,
}: {
  epic: ProductionEpic;
  tasks?: ProductionEpic["tasks"];
  tasksLoading?: boolean;
}) {
  const fullyDone = epic.total > 0 && epic.done >= epic.total;
  const [ticketsOpen, setTicketsOpen] = useState(!fullyDone);
  const openCount = Math.max(epic.total - epic.done - epic.inProgress, 0);
  const ticketList = tasks ?? epic.tasks ?? [];
  const showTickets = epic.total > 0 || ticketList.length > 0;

  return (
    <div className="border border-border bg-hover px-3 py-3">
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

      {showTickets && (
        <div className="mt-3 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => setTicketsOpen((open) => !open)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Tickets
              <span className="ml-1.5 tabular-nums">
                {ticketList.length || epic.total}
              </span>
            </span>
            <ChevronDown
              className={[
                "size-3.5 text-muted transition-transform",
                ticketsOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>
          {ticketsOpen && (
            tasksLoading && ticketList.length === 0 ? (
              <p className="mt-2.5 text-[12px] text-muted">Loading tickets…</p>
            ) : (
              <EpicTicketGroups
                tasks={ticketList}
                className="mt-2.5 max-h-72 space-y-3 overflow-y-auto pr-1"
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function LabeledMeta({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
        {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
      {children}
    </h3>
  );
}

function PipelineJourney({ journey }: { journey: JourneyStage[] | null }) {
  const rows =
    journey ??
    STAGES.map(
      (stage): JourneyStage => ({
        id: stage.id as JourneyStage["id"],
        label: stage.name,
      }),
    );

  return (
    <ol className="space-y-0">
      {rows.map((stage, index) => {
        const reached = Boolean(stage.enteredAt) || stage.id === "production";
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
                  (stage.id === "production" ? "In production" : "Not recorded")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CollectedDetail({ project }: { project: ProductionProject }) {
  const [open, setOpen] = useState(false);
  const { brief } = project;

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between border-b border-border pb-2"
      >
        <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
          Collected pipeline detail
        </h3>
        <ChevronDown
          className={[
            "size-4 text-muted transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[11px] text-muted">Submitter</dt>
              <dd>{brief.submitterName}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Sponsor</dt>
              <dd>{brief.sponsorName}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">T-shirt</dt>
              <dd>{brief.tShirtSize ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Adsomnia priority</dt>
              <dd>{brief.priority ?? "—"}</dd>
            </div>
          </dl>
          {brief.solutionDirection && (
            <p className="text-sm leading-relaxed text-muted">
              {brief.solutionDirection}
            </p>
          )}
          {brief.team.length > 0 && (
            <div>
              <p className="mb-2 inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                <Users className="size-3" />
                Team
              </p>
              <ul className="space-y-1.5 text-sm">
                {brief.team.map((member) => (
                  <li key={`${member.name}-${member.role}`}>
                    {member.name}
                    <span className="text-muted"> · {member.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {brief.milestones.length > 0 && (
            <div>
              <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Scoping milestones
              </p>
              <ul className="space-y-1.5 text-sm">
                {brief.milestones.map((milestone) => (
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
  );
}

type Props = {
  project: ProductionProject;
  journey: JourneyStage[] | null;
  tasksByEpic?: Record<string, ProductionEpic["tasks"]> | null;
  tasksLoading?: boolean;
  /** Overrides the stored consensus priority while an edit is in flight. */
  consensusPriority?: string;
  /** Replaces the read-only priority chip, e.g. with a leadership control. */
  priority?: ReactNode;
  /** Share, close and similar controls in the header's top-right corner. */
  headerActions?: ReactNode;
  onAddTool?: (key: ProductionToolKey) => void;
  /** Inline form shown under the tool links while one is being added. */
  toolForm?: ReactNode;
  /** Workstream link, archive and similar controls under the journey. */
  actions?: ReactNode;
  /** Scroll the body inside a fixed-height container, as in the modal. */
  scrollBody?: boolean;
  titleId?: string;
};

export function ProductionDetailView({
  project,
  journey,
  tasksByEpic,
  tasksLoading,
  consensusPriority,
  priority,
  headerActions,
  onAddTool,
  toolForm,
  actions,
  scrollBody = false,
  titleId,
}: Props) {
  const party = partyMeta(project.leadPartyId);
  const accent = HEALTH_META[project.health].color;
  const archived = Boolean(project.archivedAt);
  const currentPriority = consensusPriority ?? project.brief.consensusPriority;

  return (
    <>
      <header
        className="shrink-0 border-b border-border px-5 py-5 sm:px-6"
        style={{ borderTop: `3px solid ${accent}` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              {project.ticketId}
            </p>
            <h2
              id={titleId}
              className="font-display mt-1 text-3xl font-extrabold uppercase leading-none"
            >
              {project.title}
            </h2>
            {(archived || project.addedManually) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                {archived && (
                  <span
                    className="inline-flex items-center gap-1 border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      borderColor: "var(--hn-ink)",
                      color: "var(--hn-ink)",
                    }}
                  >
                    <PauseCircle className="size-3" />
                    On Hold
                  </span>
                )}
                {project.addedManually && (
                  <p className="text-[12px] text-muted">
                    Added manually from Production — did not go through the
                    pipeline
                    {project.addedAt
                      ? ` · ${formatJourneyDate(project.addedAt)}`
                      : ""}
                  </p>
                )}
              </div>
            )}
          </div>
          {headerActions && (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid grid-cols-3 gap-3 sm:gap-8">
            <LabeledMeta label="On Track">
              <ProductionHealthBadge health={project.health} />
            </LabeledMeta>
            <LabeledMeta label="Production Party">
              {party ? (
                <span
                  className="inline-flex border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    borderColor: party.color,
                    color: getPartyInk(party.id),
                  }}
                >
                  {party.label}
                </span>
              ) : (
                <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted/50">
                  —
                </span>
              )}
            </LabeledMeta>
            <LabeledMeta label="Priority">
              {priority ?? <ConsensusPriorityChip value={currentPriority} />}
            </LabeledMeta>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {TOOL_ORDER.map((tool) => {
              const linked = project.tools[tool.key];
              const canAdd =
                Boolean(onAddTool) &&
                !linked?.href &&
                (tool.key === "slack" || tool.key === "drive");
              return (
                <ToolIcon
                  key={tool.key}
                  logo={tool.logo}
                  label={linked?.label ?? tool.fallback}
                  href={linked?.href}
                  onAdd={canAdd ? () => onAddTool?.(tool.key) : undefined}
                />
              );
            })}
          </div>
        </div>
        {toolForm}
      </header>

      {project.addedManually ? (
        // Without a pipeline brief there is no sidebar, so epics take the
        // full width and tile into two columns.
        <div
          className={[
            "px-5 py-6 sm:px-6",
            scrollBody ? "min-h-0 flex-1 overflow-y-auto" : "",
          ].join(" ")}
        >
          <EpicProgress
            project={project}
            tasksByEpic={tasksByEpic}
            tasksLoading={tasksLoading}
            className="grid items-start gap-2 md:grid-cols-2"
          />
        </div>
      ) : (
        // Epics and the brief sidebar scroll independently, so a long epic
        // list never leaves the sidebar column empty below its content.
        <div
          className={[
            "lg:grid lg:grid-cols-[minmax(0,1fr)_400px]",
            scrollBody
              ? "min-h-0 flex-1 overflow-y-auto lg:overflow-hidden"
              : "lg:items-start",
          ].join(" ")}
        >
          <div
            className={[
              "min-w-0 px-5 py-6 sm:px-6",
              scrollBody ? "lg:min-h-0 lg:overflow-y-auto" : "",
            ].join(" ")}
          >
            <EpicProgress
              project={project}
              tasksByEpic={tasksByEpic}
              tasksLoading={tasksLoading}
              className="space-y-2"
            />
          </div>

          <aside
            className={[
              "min-w-0 space-y-8 border-t border-border px-5 py-6 sm:px-6 lg:border-l lg:border-t-0",
              scrollBody
                ? "lg:min-h-0 lg:overflow-y-auto"
                : "lg:sticky lg:top-0 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto",
            ].join(" ")}
          >
            <ProductionBriefHero
              brief={{ ...project.brief, consensusPriority: currentPriority }}
            />
            <section>
              <SectionTitle>Pipeline journey</SectionTitle>
              <PipelineJourney journey={journey} />
              {actions}
            </section>
            <CollectedDetail project={project} />
          </aside>
        </div>
      )}
    </>
  );
}

function EpicProgress({
  project,
  tasksByEpic,
  tasksLoading,
  className,
}: {
  project: ProductionProject;
  tasksByEpic?: Record<string, ProductionEpic["tasks"]> | null;
  tasksLoading?: boolean;
  className: string;
}) {
  return (
    <section>
      <SectionTitle>Epic progress</SectionTitle>
      {project.epics.length === 0 ? (
        <p className="text-sm text-muted">
          {project.jira.fetchError ?? "No epics found on this Jira board."}
        </p>
      ) : (
        <div className={className}>
          {project.epics.map((epic) => (
            <EpicRow
              key={epic.key}
              epic={epic}
              tasks={tasksByEpic?.[epic.key]}
              tasksLoading={tasksLoading}
            />
          ))}
        </div>
      )}
    </section>
  );
}
