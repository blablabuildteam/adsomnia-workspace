"use client";

import { useState } from "react";
import type { ScopeSignoffData, ScopingScopeItem } from "@/lib/validation-data";
import { CompletedLine, ConfirmRow } from "./ConfirmRow";

const TEXTAREA_CLASS =
  "w-full border border-border bg-surface-input px-2 py-1.5 text-xs text-foreground transition-colors focus:border-muted focus:outline-none";

type Props = {
  data: ScopeSignoffData;
  scopeItems: ScopingScopeItem[];
  readOnly?: boolean;
  onSave: (payload: {
    definitionOfDone: string;
    openQuestions: string;
  }) => void;
  onComplete: (payload: {
    definitionOfDone: string;
    openQuestions: string;
  }) => void;
};

export function ScopeSignoffTask({
  data,
  scopeItems,
  readOnly,
  onSave,
  onComplete,
}: Props) {
  const [definitionOfDone, setDefinitionOfDone] = useState(
    data.definitionOfDone ?? "",
  );
  const [openQuestions, setOpenQuestions] = useState(data.openQuestions ?? "");

  const inScope = scopeItems.filter((item) => item.inScope);
  const excluded = scopeItems.filter((item) => !item.inScope);

  if (data.status === "completed") {
    return (
      <div className="space-y-2">
        <CompletedLine completedAt={data.completedAt}>
          Team signed off on scope and Definition of Done
        </CompletedLine>
        {data.definitionOfDone && (
          <p className="whitespace-pre-line text-xs text-muted">
            <span className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
              Definition of Done
            </span>
            <br />
            {data.definitionOfDone}
          </p>
        )}
        {data.openQuestions && (
          <p className="whitespace-pre-line text-xs text-muted">
            <span className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
              Open questions
            </span>
            <br />
            {data.openQuestions}
          </p>
        )}
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="text-xs text-muted">
        Awaiting the team&apos;s sign-off on scope and Definition of Done.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Run the Q&amp;A, then confirm the team understands what is in scope and
        what &ldquo;done&rdquo; means. Anything still unanswered goes in open
        questions so it can become a risk or a ticket.
      </p>

      {scopeItems.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-2">
          {[...inScope, ...excluded].map((item) => (
            <div
              key={item.id}
              className="border border-border bg-surface px-3 py-1.5"
            >
              <span
                className={`text-xs ${
                  item.inScope ? "text-success" : "text-muted/50 line-through"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
            Definition of Done (optional)
          </span>
          <textarea
            value={definitionOfDone}
            onChange={(event) => setDefinitionOfDone(event.target.value)}
            rows={3}
            placeholder="What the team agreed “done” means for this project"
            className={TEXTAREA_CLASS}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
            Open questions from Q&amp;A (optional)
          </span>
          <textarea
            value={openQuestions}
            onChange={(event) => setOpenQuestions(event.target.value)}
            rows={3}
            placeholder="Anything raised that still needs an answer"
            className={TEXTAREA_CLASS}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => onSave({ definitionOfDone, openQuestions })}
        className="inline-flex items-center gap-1 border border-border px-2 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
      >
        Save
      </button>

      <ConfirmRow
        label="The team confirms the scope and Definition of Done are clear"
        onConfirm={() => onComplete({ definitionOfDone, openQuestions })}
      />
    </div>
  );
}
