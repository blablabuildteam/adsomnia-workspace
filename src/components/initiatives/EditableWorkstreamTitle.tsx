"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, X } from "lucide-react";
import { renameWorkstream } from "@/app/(workspace)/workstreams/[id]/actions";
import { IDEA_FIELD_LIMITS } from "@/lib/field-limits";

const TITLE_CLASS =
  "font-display text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl";

type Props = {
  initiativeId: number;
  title: string;
  /** Leadership only; everyone else sees the plain heading. */
  canEdit: boolean;
};

export function EditableWorkstreamTitle({ initiativeId, title, canEdit }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canEdit || !editing) {
    return (
      <h1 className={`group mt-4 ${TITLE_CLASS}`}>
        {title}
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setDraft(title);
              setError(null);
              setEditing(true);
            }}
            className="ml-3 inline-flex size-8 translate-y-[-0.2em] items-center justify-center border border-border align-middle text-muted opacity-60 transition-[opacity,color,border-color] hover:border-foreground hover:text-foreground group-hover:opacity-100 print:hidden"
            title="Rename workstream"
            aria-label="Rename workstream"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </h1>
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await renameWorkstream(initiativeId, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <form
      className="mt-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <textarea
        autoFocus
        rows={2}
        value={draft}
        maxLength={IDEA_FIELD_LIMITS.title.max}
        disabled={pending}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            save();
          } else if (event.key === "Escape") {
            setEditing(false);
          }
        }}
        aria-label="Workstream title"
        className={`w-full resize-none border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-foreground disabled:opacity-60 ${TITLE_CLASS}`}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending || !draft.trim()}
          className="inline-flex items-center gap-2 border border-success px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/10 disabled:opacity-50"
        >
          <Check className="size-3.5" />
          {pending ? "Saving…" : "Save title"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(false)}
          className="inline-flex items-center gap-2 border border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          <X className="size-3.5" />
          Cancel
        </button>
        <span className="text-[11px] tabular-nums text-muted">
          {draft.trim().length}/{IDEA_FIELD_LIMITS.title.max}
        </span>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
    </form>
  );
}
