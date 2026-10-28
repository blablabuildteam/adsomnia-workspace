"use client";

import { Pencil, Save } from "lucide-react";

/** Header button that reopens a finished phase so leadership can correct it. */
export function PhaseEditButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 border border-border px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
    >
      <Pencil className="size-3" />
      Edit
    </button>
  );
}

/** Footer for a reopened past phase: save only, no submit or status change. */
export function PhaseRevisionActions({
  saveAction,
  pending,
  savePending,
  onCancel,
}: {
  saveAction: (formData: FormData) => void;
  pending: boolean;
  savePending: boolean;
  onCancel: () => void;
}) {
  return (
    <>
      <p className="mr-auto text-xs text-muted">
        This phase is complete — saving updates the details without changing
        the workstream&apos;s current phase or status.
      </p>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="border border-border px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted hover:text-foreground disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        formAction={saveAction}
        formNoValidate
        disabled={pending}
        className="group relative inline-flex items-center gap-2 overflow-hidden border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:opacity-50"
      >
        <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
        <Save className="relative size-3.5" />
        <span className="relative">
          {savePending ? "Saving…" : "Save Changes"}
        </span>
      </button>
    </>
  );
}
