"use client";

import { useActionState, useEffect, useState } from "react";
import {
  Target,
  Lightbulb,
  TrendingUp,
  Users,
  Pencil,
  AlertCircle,
  Save,
  type LucideIcon,
} from "lucide-react";
import {
  updateIdeaDetails,
  type IdeaUpdateResult,
} from "@/app/(workspace)/workstreams/[id]/actions";
import { inputClass } from "@/lib/form-styles";

const initial: IdeaUpdateResult = {};

type IdeaFields = {
  title: string;
  problemStatement: string | null;
  opportunitySolution: string | null;
  expectedImpact: string | null;
  targetAudience: string | null;
};

const FIELD_META: {
  name: keyof Omit<IdeaFields, "title">;
  label: string;
  icon: LucideIcon;
  required: boolean;
}[] = [
  {
    name: "problemStatement",
    label: "Problem Statement",
    icon: Target,
    required: true,
  },
  {
    name: "opportunitySolution",
    label: "Opportunity / Solution",
    icon: Lightbulb,
    required: true,
  },
  {
    name: "expectedImpact",
    label: "Expected Impact",
    icon: TrendingUp,
    required: true,
  },
  {
    name: "targetAudience",
    label: "Target Audience",
    icon: Users,
    required: false,
  },
];

type Props = {
  initiativeId: number;
  values: IdeaFields;
  /** Whether the current user may edit (creator or leadership, pre-approval). */
  canEdit: boolean;
};

export function IdeaDetailsSection({ initiativeId, values, canEdit }: Props) {
  const [editing, setEditing] = useState(false);

  const boundUpdate = updateIdeaDetails.bind(null, initiativeId);
  const [state, action, pending] = useActionState(boundUpdate, initial);

  // Close the form once the save has gone through.
  useEffect(() => {
    if (state.success) setEditing(false);
  }, [state]);

  return (
    <div className="bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="font-display text-xs font-bold uppercase tracking-wide">
          Initiative Details
        </h3>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
          >
            <Pencil className="size-3" />
            Edit
          </button>
        )}
      </div>

      {!editing ? (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {FIELD_META.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.name} className="bg-surface p-4">
                <div className="mb-2 flex items-center gap-2 text-muted">
                  <Icon className="size-3.5" />
                  <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                    {field.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {values[field.name] ?? "—"}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <form action={action} className="space-y-4 p-4">
          {state.error && (
            <div className="flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2 text-xs text-btr">
              <AlertCircle className="size-3.5 shrink-0" />
              {state.error}
            </div>
          )}

          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wide text-muted">
              Title<span className="ml-1 text-btr">*</span>
            </span>
            <input
              type="text"
              name="title"
              required
              defaultValue={values.title}
              className={`${inputClass} mt-1`}
            />
          </label>

          {FIELD_META.map((field) => {
            const Icon = field.icon;
            return (
              <label key={field.name} className="block">
                <span className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-muted">
                  <Icon className="size-3.5" />
                  {field.label}
                  {field.required && <span className="text-btr">*</span>}
                </span>
                <textarea
                  name={field.name}
                  required={field.required}
                  rows={3}
                  defaultValue={values[field.name] ?? ""}
                  className={`${inputClass} mt-1`}
                />
              </label>
            );
          })}

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={pending}
              className="border border-border px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="group relative inline-flex items-center gap-2 overflow-hidden border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <Save className="relative size-3.5" />
              <span className="relative">
                {pending ? "Saving…" : "Save Changes"}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
