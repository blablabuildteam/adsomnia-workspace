"use client";

import { useState } from "react";
import { Check, Plus, X, CheckCircle2 } from "lucide-react";
import type { ScopingScopeItem } from "@/lib/validation-data";
import { inputClass } from "@/lib/form-styles";

type Props = {
  scopeItems: ScopingScopeItem[];
  confirmed?: boolean;
  readOnly?: boolean;
  onComplete: (items: ScopingScopeItem[], notes?: string) => void;
};

export function ScopeConfirmTask({
  scopeItems: initial,
  confirmed,
  readOnly,
  onComplete,
}: Props) {
  const [items, setItems] = useState<ScopingScopeItem[]>(
    initial.length > 0 ? initial : [],
  );
  const [notes, setNotes] = useState("");
  const [newItem, setNewItem] = useState("");

  const toggleScope = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, inScope: !i.inScope } : i)),
    );
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: newItem.trim(), inScope: true },
    ]);
    setNewItem("");
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  if (confirmed || readOnly) {
    return (
      <div className="space-y-2">
        {confirmed && (
          <div className="flex items-center gap-2 text-xs text-success">
            <CheckCircle2 className="size-3.5" />
            Scope confirmed
          </div>
        )}
        {items.length === 0 && !confirmed && (
          <p className="text-xs text-muted">No scope items defined.</p>
        )}
        <div className="grid gap-1.5 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 border border-border bg-surface px-3 py-1.5 text-xs"
            >
              <span
                className={
                  item.inScope
                    ? "text-success"
                    : "text-muted/50 line-through"
                }
              >
                {item.inScope ? "✓" : "✗"} {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Review the scope boundaries from scoping. Toggle items in/out, add new
        ones, then confirm.
      </p>

      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 border border-border bg-surface px-3 py-2"
          >
            <button
              type="button"
              onClick={() => toggleScope(item.id)}
              className={`size-5 shrink-0 border ${
                item.inScope
                  ? "border-success bg-success/20 text-success"
                  : "border-border text-muted/40"
              } flex items-center justify-center`}
            >
              {item.inScope && <Check className="size-3" />}
            </button>
            <span
              className={`flex-1 text-xs ${!item.inScope ? "text-muted/50 line-through" : ""}`}
            >
              {item.label}
            </span>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-muted/40 hover:text-btr"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-stretch gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className={`${inputClass} flex-1`}
          placeholder="Add scope item…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <button
          type="button"
          onClick={addItem}
          disabled={!newItem.trim()}
          className="flex items-center gap-1.5 border border-border px-3 text-xs text-muted hover:border-foreground hover:text-foreground disabled:opacity-50"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={inputClass}
        rows={2}
        placeholder="Notes on scope changes (optional)…"
      />

      <button
        type="button"
        onClick={() => onComplete(items, notes || undefined)}
        disabled={items.length === 0}
        className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-50"
      >
        <Check className="size-3.5" />
        Confirm Scope
      </button>
    </div>
  );
}
