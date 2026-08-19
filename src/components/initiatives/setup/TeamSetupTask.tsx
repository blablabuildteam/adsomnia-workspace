"use client";

import { useState } from "react";
import { Check, Plus, Trash2, Users } from "lucide-react";
import type { SetupTeamMember } from "@/lib/validation-data";
import { PARTIES } from "@/data/workflow";
import { inputClass } from "@/lib/form-styles";

type Props = {
  members: SetupTeamMember[];
  readOnly?: boolean;
  onComplete: (members: SetupTeamMember[]) => void;
};

export function TeamSetupTask({ members: initial, readOnly, onComplete }: Props) {
  const [members, setMembers] = useState<SetupTeamMember[]>(initial);

  const addMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        email: "",
        role: "",
        party: "",
        totalHours: 0,
        hoursPerDay: 0,
      },
    ]);
  };

  const updateMember = (id: string, field: string, value: string | number) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  if (readOnly) {
    return (
      <div className="space-y-1.5">
        {members.length === 0 && (
          <p className="text-xs text-muted">No team members added yet.</p>
        )}
        {members.map((m) => {
          const party = PARTIES.find((p) => p.id === m.party);
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-foreground">
                  {m.name || "—"}{" "}
                  <span className="text-muted/50">· {m.role || "—"}</span>
                </p>
                {party && (
                  <span
                    className="font-display text-[9px] font-bold uppercase tracking-wider"
                    style={{ color: party.color }}
                  >
                    {party.label}
                  </span>
                )}
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">
                {m.totalHours}h
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Review and finalize the project team. Members are pre-loaded from
        scoping. Add people, assign emails, and ensure everyone is accounted for
        before inviting them to project environments.
      </p>

      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.id}
            className="grid gap-2 border border-border bg-surface p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]"
          >
            <input
              type="text"
              value={m.name}
              onChange={(e) => updateMember(m.id, "name", e.target.value)}
              className={inputClass}
              placeholder="Name"
            />
            <input
              type="text"
              value={m.role}
              onChange={(e) => updateMember(m.id, "role", e.target.value)}
              className={inputClass}
              placeholder="Role"
            />
            <input
              type="email"
              value={m.email || ""}
              onChange={(e) => updateMember(m.id, "email", e.target.value)}
              className={`${inputClass} sm:w-48`}
              placeholder="Email"
            />
            <select
              value={m.party || ""}
              onChange={(e) => updateMember(m.id, "party", e.target.value)}
              className={`${inputClass} sm:w-36`}
            >
              <option value="">Party</option>
              {PARTIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeMember(m.id)}
              className="flex size-10 items-center justify-center border border-border text-muted transition-colors hover:border-btr hover:text-btr"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addMember}
        className="inline-flex items-center gap-1.5 border border-border px-3 py-2 text-xs text-muted transition-colors hover:border-foreground hover:text-foreground"
      >
        <Plus className="size-3.5" />
        Add Team Member
      </button>

      <div>
        <button
          type="button"
          onClick={() => onComplete(members)}
          disabled={members.length === 0}
          className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-50"
        >
          <Users className="size-3.5" />
          Confirm Team
        </button>
      </div>
    </div>
  );
}
