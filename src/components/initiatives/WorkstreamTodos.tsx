"use client";

import {
  startTransition,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ChevronDown, ListChecks, Plus, Trash2, X } from "lucide-react";
import {
  addTodo,
  deleteTodo,
  editTodo,
  setTodoDone,
  type TodoResult,
} from "@/app/(workspace)/workstreams/[id]/todo-actions";
import { STAGES } from "@/data/workflow";
import { TODO_BODY_MAX } from "@/lib/field-limits";
import type { WorkstreamTodo } from "@/lib/workstream-todos";

type TodoChange =
  | { kind: "add"; todo: WorkstreamTodo }
  | { kind: "edit"; id: number; body: string }
  | { kind: "done"; id: number; done: boolean }
  | { kind: "delete"; id: number };

function applyChange(current: WorkstreamTodo[], change: TodoChange) {
  switch (change.kind) {
    case "add":
      return [...current, change.todo];
    case "edit":
      return current.map((t) =>
        t.id === change.id ? { ...t, body: change.body } : t,
      );
    case "done":
      return current.map((t) =>
        t.id === change.id
          ? { ...t, doneAt: change.done ? new Date() : null }
          : t,
      );
    case "delete":
      return current.filter((t) => t.id !== change.id);
  }
}

function stageName(stageId: string): string {
  return STAGES.find((stage) => stage.id === stageId)?.name ?? stageId;
}

function countLabel(count: number): string {
  if (count > 99) return "99+";
  return String(count);
}

type Props = {
  initiativeId: number;
  todos: WorkstreamTodo[];
  currentStage: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dockAbovePhaseBar?: boolean;
};

/** Personal to-do list for one workstream; only the signed-in user sees it. */
export function WorkstreamTodos({
  initiativeId,
  todos,
  currentStage,
  open,
  onOpenChange,
  dockAbovePhaseBar = false,
}: Props) {
  const [optimisticTodos, applyOptimistic] = useOptimistic(
    todos,
    applyChange,
  );
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editingRef = useRef(false);

  const openTodos = optimisticTodos.filter((t) => !t.doneAt);
  const doneTodos = optimisticTodos.filter((t) => t.doneAt);

  useEffect(() => {
    editingRef.current = editingId !== null;
  }, [editingId]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !editingRef.current) onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  function run(change: TodoChange, action: () => Promise<TodoResult>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  function submitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    run(
      {
        kind: "add",
        todo: {
          id: -Date.now(),
          body,
          stage: currentStage,
          doneAt: null,
          createdAt: new Date(),
        },
      },
      () => addTodo(initiativeId, body),
    );
  }

  function startEdit(todo: WorkstreamTodo) {
    if (todo.id < 0) return;
    setEditingId(todo.id);
    setEditDraft(todo.body);
  }

  function saveEdit(todo: WorkstreamTodo) {
    setEditingId(null);
    const body = editDraft.trim();
    if (!body || body === todo.body) return;
    run({ kind: "edit", id: todo.id, body }, () =>
      editTodo(initiativeId, todo.id, body),
    );
  }

  function onEditKey(event: KeyboardEvent<HTMLInputElement>, todo: WorkstreamTodo) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEdit(todo);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditingId(null);
    }
  }

  function toggle(todo: WorkstreamTodo) {
    if (todo.id < 0) return;
    const done = !todo.doneAt;
    run({ kind: "done", id: todo.id, done }, () =>
      setTodoDone(initiativeId, todo.id, done),
    );
  }

  function remove(todo: WorkstreamTodo) {
    if (todo.id < 0) return;
    run({ kind: "delete", id: todo.id }, () =>
      deleteTodo(initiativeId, todo.id),
    );
  }

  function renderRow(todo: WorkstreamTodo) {
    const done = Boolean(todo.doneAt);
    const editing = editingId === todo.id;
    return (
      <li key={todo.id} className="group flex items-start gap-3 px-4 py-2.5">
        <input
          type="checkbox"
          checked={done}
          onChange={() => toggle(todo)}
          disabled={todo.id < 0}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-foreground"
          aria-label={done ? `Mark "${todo.body}" as open` : `Mark "${todo.body}" as done`}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              type="text"
              value={editDraft}
              maxLength={TODO_BODY_MAX}
              autoFocus
              onChange={(e) => setEditDraft(e.target.value)}
              onBlur={() => saveEdit(todo)}
              onKeyDown={(e) => onEditKey(e, todo)}
              className="w-full border border-border-input bg-surface-input px-2 py-1 text-xs text-foreground focus:border-muted focus:outline-none"
              aria-label="Edit to-do"
            />
          ) : (
            <button
              type="button"
              onClick={() => startEdit(todo)}
              className={[
                "block w-full text-left text-xs leading-relaxed whitespace-pre-wrap break-words",
                done ? "text-muted line-through" : "text-foreground/90 hover:text-foreground",
              ].join(" ")}
              title="Click to edit"
            >
              {todo.body}
            </button>
          )}
          <p className="mt-0.5 font-display text-[9px] font-bold uppercase tracking-[0.14em] text-muted/70">
            {stageName(todo.stage)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => remove(todo)}
          disabled={todo.id < 0}
          className="flex size-6 shrink-0 items-center justify-center text-muted opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:hidden"
          aria-label={`Delete "${todo.body}"`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </li>
    );
  }

  return (
    <div className="relative">
      {open && (
        <section
          id="workstream-todos-panel"
          className={[
            "absolute bottom-full right-0 mb-3 flex w-[min(380px,calc(100vw-2rem))] flex-col border border-border-strong bg-surface shadow-[0_16px_48px_rgba(0,0,0,0.8)] animate-fade-in",
            dockAbovePhaseBar
              ? "h-[min(480px,calc(100dvh-17rem))]"
              : "h-[min(480px,calc(100dvh-13rem))]",
          ].join(" ")}
          role="dialog"
          aria-labelledby="workstream-todos-title"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ListChecks className="size-4 text-muted" />
            <h2
              id="workstream-todos-title"
              className="font-display text-xs font-bold uppercase tracking-wide"
            >
              My to-dos
            </h2>
            <span className="font-display tabular-nums text-xs text-muted">
              {openTodos.length}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="ml-auto flex size-8 items-center justify-center border border-transparent text-muted transition-colors hover:border-border hover:text-foreground"
              aria-label="Close to-dos"
            >
              <X className="size-4" />
            </button>
          </header>

          <form
            onSubmit={submitNew}
            className="flex items-center gap-2 border-b border-border p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={TODO_BODY_MAX}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a to-do…"
              className="min-w-0 flex-1 border border-border-input bg-surface-input px-3 py-2 text-xs text-foreground placeholder:text-muted/50 focus:border-muted focus:outline-none"
              aria-label="New to-do"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex size-8 shrink-0 items-center justify-center border border-foreground bg-foreground text-background transition-opacity disabled:opacity-30"
              aria-label="Add to-do"
            >
              <Plus className="size-4" />
            </button>
          </form>

          {error && (
            <p className="border-b border-border px-4 py-2 text-xs text-red-400" role="alert">
              {error}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {openTodos.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-muted">
                {doneTodos.length > 0
                  ? "All done here."
                  : "Nothing yet. Only you can see your to-dos."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {openTodos.map(renderRow)}
              </ul>
            )}

            {doneTodos.length > 0 && (
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDone((prev) => !prev)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
                  aria-expanded={showDone}
                >
                  <ChevronDown
                    className={[
                      "size-3.5 transition-transform",
                      showDone ? "" : "-rotate-90",
                    ].join(" ")}
                  />
                  Done ({doneTodos.length})
                </button>
                {showDone && (
                  <ul className="divide-y divide-border">
                    {doneTodos.map(renderRow)}
                  </ul>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="relative flex size-14 items-center justify-center border border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background"
        aria-expanded={open}
        aria-controls="workstream-todos-panel"
        aria-label={
          open
            ? "Close to-dos"
            : openTodos.length > 0
              ? `Open my to-dos, ${openTodos.length} open`
              : "Open my to-dos"
        }
      >
        {open ? <X className="size-5" /> : <ListChecks className="size-5" />}
        {!open && openTodos.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center border border-foreground bg-background px-1 font-display text-[10px] font-bold tabular-nums text-foreground">
            {countLabel(openTodos.length)}
          </span>
        )}
      </button>
    </div>
  );
}
