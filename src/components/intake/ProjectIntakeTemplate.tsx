"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Info,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import {
  INTAKE_SECTIONS,
  LEAD_PARTY_OPTIONS,
  createRoleHourRow,
  emptyEpicRows,
  emptyRoleHourRows,
  type EpicRow,
  type IntakeField,
  type RoleHourRow,
} from "@/data/intake-template";

const STORAGE_KEY = "adsomnia-intake-v1";

type ProjectSlot = {
  id: string;
  label: string;
  projectName: string;
  values: Record<string, string>;
  epics: EpicRow[];
  roleHours: RoleHourRow[];
};

type StoredIntake = {
  version: 1;
  savedAt: string;
  activeIndex: number;
  projects: ProjectSlot[];
};

function createProjectSlot(index: number): ProjectSlot {
  return {
    id: `project-${index}`,
    label: `Project ${index}`,
    projectName: "",
    values: {},
    epics: emptyEpicRows(4),
    roleHours: emptyRoleHourRows(),
  };
}

function defaultProjects(): ProjectSlot[] {
  return [createProjectSlot(1), createProjectSlot(2), createProjectSlot(3)];
}

/** Tab label: project name, else Idea title, else "Project N". */
function projectTabLabel(project: ProjectSlot): string {
  const name = project.projectName.trim();
  if (name) return name;
  const ideaTitle = (project.values.title ?? "").trim().split("\n")[0]?.trim();
  if (ideaTitle) return ideaTitle;
  return project.label;
}

function loadStoredIntake(): StoredIntake | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIntake;
    if (parsed?.version !== 1 || !Array.isArray(parsed.projects)) return null;
    if (parsed.projects.length !== 3) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistIntake(
  projects: ProjectSlot[],
  activeIndex: number,
): string {
  const savedAt = new Date().toISOString();
  const payload: StoredIntake = {
    version: 1,
    savedAt,
    activeIndex,
    projects,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return savedAt;
}

function FieldShell({
  field,
  children,
  fieldClassName = "border-border bg-surface",
}: {
  field: IntakeField;
  children: React.ReactNode;
  fieldClassName?: string;
}) {
  return (
    <div
      className={`border p-4 print:break-inside-avoid ${fieldClassName}`}
    >
      <label className="font-display block text-xs font-bold uppercase tracking-wide text-foreground">
        {field.label}
        {field.required && <span className="ml-1 text-btr">*</span>}
      </label>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">
        <span className="font-medium text-foreground/70">Expected: </span>
        {field.expectation}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full border border-border bg-surface-elevated px-3 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:border-border-strong focus:outline-none print:border-border print:bg-transparent";

/** Distinct stage container accents (brand palette). */
const STAGE_STYLES = {
  idea: {
    accent: "#FFFFFF",
    shell: "border-white/30 bg-white/[0.03]",
    header: "border-white/20 bg-white/[0.07]",
    field: "border-white/15 bg-black/40",
  },
  validation: {
    accent: "#7E90A3",
    shell: "border-[#7E90A3]/40 bg-[#7E90A3]/[0.07]",
    header: "border-[#7E90A3]/30 bg-[#7E90A3]/[0.12]",
    field: "border-[#7E90A3]/25 bg-black/35",
  },
  scoping: {
    accent: "#CEFF00",
    shell: "border-[#CEFF00]/35 bg-[#CEFF00]/[0.05]",
    header: "border-[#CEFF00]/30 bg-[#CEFF00]/[0.09]",
    field: "border-[#CEFF00]/20 bg-black/40",
  },
} as const;

export function ProjectIntakeTemplate() {
  const [projects, setProjects] = useState<ProjectSlot[]>(defaultProjects);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Restore from this browser’s localStorage (no database).
  useEffect(() => {
    const stored = loadStoredIntake();
    if (stored) {
      setProjects(stored.projects);
      setActiveIndex(
        Math.min(Math.max(stored.activeIndex, 0), stored.projects.length - 1),
      );
      setSavedAt(stored.savedAt);
      setDirty(false);
    }
    setHydrated(true);
  }, []);

  // Auto-save shortly after edits once hydrated.
  useEffect(() => {
    if (!hydrated || !dirty) return;
    const timer = window.setTimeout(() => {
      const at = persistIntake(projects, activeIndex);
      setSavedAt(at);
      setDirty(false);
      setSaveFlash(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [projects, activeIndex, dirty, hydrated]);

  // Persist which project tab is active (without dirty flash).
  useEffect(() => {
    if (!hydrated || !savedAt) return;
    persistIntake(projects, activeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when tab changes
  }, [activeIndex]);

  useEffect(() => {
    if (!saveFlash) return;
    const timer = window.setTimeout(() => setSaveFlash(false), 1600);
    return () => window.clearTimeout(timer);
  }, [saveFlash]);

  const active = projects[activeIndex];

  const markDirty = () => setDirty(true);

  const updateActive = (patch: Partial<ProjectSlot>) => {
    setProjects((prev) =>
      prev.map((p, i) => (i === activeIndex ? { ...p, ...patch } : p)),
    );
    markDirty();
  };

  const setValue = (fieldId: string, value: string) => {
    updateActive({
      values: { ...active.values, [fieldId]: value },
    });
  };

  const handleSave = () => {
    const at = persistIntake(projects, activeIndex);
    setSavedAt(at);
    setDirty(false);
    setSaveFlash(true);
  };

  const handleClearSaved = () => {
    const confirmed = window.confirm(
      "Clear all saved intake data in this browser and reset the three project forms?",
    );
    if (!confirmed) return;
    localStorage.removeItem(STORAGE_KEY);
    setProjects(defaultProjects());
    setActiveIndex(0);
    setSavedAt(null);
    setDirty(false);
  };

  const savedLabel = savedAt
    ? new Date(savedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  const updateEpic = (id: string, key: keyof EpicRow, value: string) => {
    updateActive({
      epics: active.epics.map((row) =>
        row.id === id ? { ...row, [key]: value } : row,
      ),
    });
  };

  const addEpic = () => {
    updateActive({
      epics: [
        ...active.epics,
        {
          id: `epic-${Date.now()}`,
          epic: "",
          milestone: "",
          start: "",
          end: "",
          notes: "",
        },
      ],
    });
  };

  const removeEpic = (id: string) => {
    if (active.epics.length <= 1) return;
    updateActive({ epics: active.epics.filter((r) => r.id !== id) });
  };

  const updateRoleHour = (
    id: string,
    key: keyof RoleHourRow,
    value: string,
  ) => {
    updateActive({
      roleHours: active.roleHours.map((row) =>
        row.id === id ? { ...row, [key]: value } : row,
      ),
    });
  };

  const addRoleHour = () => {
    updateActive({ roleHours: [...active.roleHours, createRoleHourRow()] });
  };

  const removeRoleHour = (id: string) => {
    if (active.roleHours.length <= 1) return;
    updateActive({
      roleHours: active.roleHours.filter((row) => row.id !== id),
    });
  };

  const totalHours = active.roleHours.reduce((sum, row) => {
    const n = Number.parseFloat(row.totalHours);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  const renderField = (field: IntakeField, fieldClassName?: string) => {
    if (field.type === "epic-table") {
      return (
        <FieldShell field={field} fieldClassName={fieldClassName}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-2 py-2">Epic</th>
                  <th className="px-2 py-2">Milestone / Outcome</th>
                  <th className="px-2 py-2 w-32">Start</th>
                  <th className="px-2 py-2 w-32">End</th>
                  <th className="px-2 py-2">Notes</th>
                  <th className="w-10 print:hidden" />
                </tr>
              </thead>
              <tbody>
                {active.epics.map((row) => (
                  <tr key={row.id} className="border-b border-border/70">
                    <td className="p-1.5">
                      <input
                        className={inputClass}
                        value={row.epic}
                        onChange={(e) =>
                          updateEpic(row.id, "epic", e.target.value)
                        }
                        placeholder="Epic name"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        className={inputClass}
                        value={row.milestone}
                        onChange={(e) =>
                          updateEpic(row.id, "milestone", e.target.value)
                        }
                        placeholder="Milestone / outcome"
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="date"
                        className={inputClass}
                        value={row.start}
                        onChange={(e) =>
                          updateEpic(row.id, "start", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="date"
                        className={inputClass}
                        value={row.end}
                        onChange={(e) =>
                          updateEpic(row.id, "end", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        className={inputClass}
                        value={row.notes}
                        onChange={(e) =>
                          updateEpic(row.id, "notes", e.target.value)
                        }
                        placeholder="Optional"
                      />
                    </td>
                    <td className="p-1.5 print:hidden">
                      <button
                        type="button"
                        onClick={() => removeEpic(row.id)}
                        className="border border-border p-2 text-muted hover:border-btr hover:text-btr"
                        aria-label="Remove epic row"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addEpic}
            className="mt-3 inline-flex items-center gap-2 border border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:border-border-strong hover:text-foreground print:hidden"
          >
            <Plus className="size-3.5" />
            Add Epic / Milestone
          </button>
        </FieldShell>
      );
    }

    if (field.type === "role-hours") {
      return (
        <FieldShell field={field} fieldClassName={fieldClassName}>
          <div className="space-y-3">
            {active.roleHours.map((row, index) => (
              <div
                key={row.id}
                className="border border-border bg-surface-elevated p-3 print:break-inside-avoid"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Resource {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeRoleHour(row.id)}
                    className="border border-border p-1.5 text-muted hover:border-btr hover:text-btr print:hidden"
                    aria-label="Remove resource row"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Role description
                    </span>
                    <input
                      className={`${inputClass} mt-1`}
                      value={row.roleDescription}
                      onChange={(e) =>
                        updateRoleHour(
                          row.id,
                          "roleDescription",
                          e.target.value,
                        )
                      }
                      placeholder="e.g. Senior Frontend Engineer, Project Manager, Data Analyst"
                    />
                  </label>
                  <label className="block">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Name
                    </span>
                    <input
                      className={`${inputClass} mt-1`}
                      value={row.name}
                      onChange={(e) =>
                        updateRoleHour(row.id, "name", e.target.value)
                      }
                      placeholder="Person’s name"
                    />
                  </label>
                  <label className="block">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Party / Owner
                    </span>
                    <select
                      className={`${inputClass} mt-1`}
                      value={row.party}
                      onChange={(e) =>
                        updateRoleHour(row.id, "party", e.target.value)
                      }
                    >
                      <option value="">Select…</option>
                      {LEAD_PARTY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Total hours
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      className={`${inputClass} mt-1`}
                      value={row.totalHours}
                      onChange={(e) =>
                        updateRoleHour(row.id, "totalHours", e.target.value)
                      }
                      placeholder="e.g. 80"
                    />
                  </label>
                  <label className="block">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Hours per day
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      className={`${inputClass} mt-1`}
                      value={row.hoursPerDay}
                      onChange={(e) =>
                        updateRoleHour(row.id, "hoursPerDay", e.target.value)
                      }
                      placeholder="e.g. 4"
                    />
                  </label>
                  <label className="block">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Active from
                    </span>
                    <input
                      type="date"
                      className={`${inputClass} mt-1`}
                      value={row.periodStart}
                      onChange={(e) =>
                        updateRoleHour(row.id, "periodStart", e.target.value)
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                      Active until
                    </span>
                    <input
                      type="date"
                      className={`${inputClass} mt-1`}
                      value={row.periodEnd}
                      onChange={(e) =>
                        updateRoleHour(row.id, "periodEnd", e.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRoleHour}
            className="mt-3 inline-flex items-center gap-2 border border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted hover:border-border-strong hover:text-foreground print:hidden"
          >
            <Plus className="size-3.5" />
            Add person / role
          </button>
          <div className="mt-4 flex items-center justify-between border border-border bg-surface px-4 py-3">
            <span className="font-display text-xs font-bold uppercase tracking-wide">
              Project total hours
            </span>
            <span className="font-display text-sm font-extrabold tabular-nums">
              {totalHours || "—"}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Add one row per person. Role description is free-format — use
            whatever title fits. Total hours, hours/day, and active period are
            required for capacity booking in Project Setup.
          </p>
        </FieldShell>
      );
    }

    return (
      <FieldShell field={field} fieldClassName={fieldClassName}>
        {field.type === "textarea" ? (
          <textarea
            rows={3}
            className={inputClass}
            value={active.values[field.id] ?? ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        ) : field.type === "select" ? (
          <select
            className={inputClass}
            value={active.values[field.id] ?? ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            required={field.required}
          >
            <option value="">Select…</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type === "date" ? "date" : "text"}
            className={inputClass}
            value={active.values[field.id] ?? ""}
            onChange={(e) => setValue(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        )}
      </FieldShell>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Concept hub
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {savedLabel && (
            <span className="text-[11px] text-muted">
              {saveFlash || !dirty ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <Check className="size-3" />
                  Saved {savedLabel}
                </span>
              ) : (
                <span>Unsaved changes…</span>
              )}
            </span>
          )}
          {!savedLabel && dirty && (
            <span className="text-[11px] text-muted">Unsaved changes…</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background"
          >
            <Save className="size-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-border px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-foreground hover:border-border-strong"
          >
            <Printer className="size-3.5" />
            Print / PDF
          </button>
        </div>
      </div>

      <header className="mb-8 print:mb-6">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
          Adsomnia Workspace · Pre–Jira Setup
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
          Project Intake
          <br />
          Template
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Collect Stage 1–3 information (Idea → Validation → Scoping) for each
          kickoff project. Completed forms feed Go/No-Go and Jira Project Setup
          (Epics, Milestones, and resource booking).
        </p>
      </header>

      <div className="mb-6 flex gap-3 border border-border bg-surface-elevated p-4 print:break-inside-avoid">
        <Info className="mt-0.5 size-4 shrink-0 text-bbb" />
        <div className="text-xs leading-relaxed text-muted">
          <p className="font-display font-bold uppercase tracking-wide text-foreground">
            How to use
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              Complete <strong className="text-foreground">one form per project</strong>{" "}
              (three project tabs provided for the current kickoff batch).
            </li>
            <li>
              Every field shows an <strong className="text-foreground">Expected</strong>{" "}
              description — fill to that standard so Project Setup does not need
              follow-up rounds.
            </li>
            <li>
              Stage 3 requires an <strong className="text-foreground">Epic & Milestone Timeline</strong>{" "}
              and <strong className="text-foreground">role-based hour estimates</strong>{" "}
              before Jira boards and capacity can be created.
            </li>
            <li>
              Tabs update to the <strong className="text-foreground">project name</strong>{" "}
              (or Idea title) as you fill them in.
            </li>
            <li>
              <strong className="text-foreground">Save</strong> stores everything in
              this browser (no database). Auto-saves as you type. Use Print / PDF
              to share filled forms.
            </li>
          </ul>
        </div>
      </div>

      {/* Project tabs */}
      <div className="mb-6 flex flex-wrap gap-1 print:hidden">
        {projects.map((project, i) => {
          const label = projectTabLabel(project);
          const isPlaceholder = label === project.label;
          return (
            <button
              key={project.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              title={label}
              className={[
                "max-w-[220px] truncate border px-4 py-2 font-display text-xs font-bold tracking-wide transition-colors",
                isPlaceholder ? "uppercase" : "normal-case",
                i === activeIndex
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted hover:border-border-strong hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Project header */}
      <section className="mb-8 border border-border bg-surface p-4 print:break-inside-avoid">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
          Project identity
        </p>
        <label className="mt-3 block">
          <span className="font-display text-xs font-bold uppercase tracking-wide">
            Project name <span className="text-btr">*</span>
          </span>
          <p className="mt-1 text-xs text-muted">
            <span className="font-medium text-foreground/70">Expected: </span>
            Working title used in Workspace and Jira (can match Idea title).
          </p>
          <input
            className={`${inputClass} mt-2`}
            value={active.projectName}
            onChange={(e) => updateActive({ projectName: e.target.value })}
            placeholder={`e.g. Kickoff project ${activeIndex + 1}`}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-[10px] font-bold uppercase tracking-wider text-bbb">
            Slot {activeIndex + 1} of 3 · Stages 1–3
            {projectTabLabel(active) !== active.label && (
              <span className="ml-2 normal-case tracking-normal text-muted">
                — {projectTabLabel(active)}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={handleClearSaved}
            className="text-[10px] uppercase tracking-wide text-muted underline-offset-2 hover:text-btr hover:underline print:hidden"
          >
            Reset all forms
          </button>
        </div>
      </section>

      {/* Stage sections */}
      <div className="space-y-10">
        {INTAKE_SECTIONS.map((section) => {
          const style = STAGE_STYLES[section.stageId];
          return (
            <section
              key={section.stageId}
              className={`border p-4 sm:p-5 print:break-before-page ${style.shell}`}
              style={{ borderTopWidth: 3, borderTopColor: style.accent }}
            >
              <div
                className={`mb-4 border px-4 py-4 ${style.header}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p
                      className="font-display text-[11px] font-bold uppercase tracking-[0.2em]"
                      style={{ color: style.accent }}
                    >
                      Stage {String(section.number).padStart(2, "0")}
                    </p>
                    <h2 className="font-display mt-1 text-2xl font-extrabold uppercase tracking-tight">
                      {section.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      Owner: {section.owner}
                    </p>
                  </div>
                  <ClipboardList
                    className="size-5"
                    style={{ color: style.accent }}
                  />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                  {section.purpose}
                </p>
              </div>
              <div className="space-y-3">
                {section.fields.map((field) => (
                  <div key={field.id}>
                    {renderField(field, style.field)}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-10 border-t border-border pt-6 text-xs text-muted print:mt-6">
        <p>
          Completed intake enables Stage 4 Go/No-Go and Stage 5 Project Setup in
          Jira (Epics, Milestones, dates, and booked capacity from role hours).
        </p>
        <p className="mt-2 print:hidden">
          Aligned with the Production Framework — see{" "}
          <Link href="/framework" className="text-foreground underline-offset-2 hover:underline">
            Framework Map
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
