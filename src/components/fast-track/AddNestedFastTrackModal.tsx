"use client";

import { useState, useTransition } from "react";
import { createFastTrackChildTask } from "@/app/(workspace)/fast-track/actions";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { inputClass } from "@/lib/form-styles";
import { FAST_TRACK_FIELD_LIMITS } from "@/lib/field-limits";

type Props = {
  open: boolean;
  epicKey: string;
  epicTitle: string;
  onClose: () => void;
  onCreated: (task: {
    key: string;
    url: string;
    title: string;
    description: string;
  }) => void;
};

export function AddNestedFastTrackModal({
  open,
  epicKey,
  epicTitle,
  onClose,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startSubmit] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setError(null);
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  function handleSubmit() {
    if (pending) return;
    setError(null);
    startSubmit(async () => {
      const result = await createFastTrackChildTask({
        epicKey,
        title,
        description,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.task) {
        const created = result.task;
        reset();
        onCreated(created);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add task"
      actions={
        <>
          <ModalButton onClick={handleClose} disabled={pending}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            type="submit"
            form="add-fast-track-task"
            disabled={pending}
          >
            {pending ? "Adding…" : "Add task"}
          </ModalButton>
        </>
      }
    >
      <form
        id="add-fast-track-task"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          Nested under{" "}
          <span className="text-foreground">{epicTitle}</span>
          {epicKey ? ` (${epicKey})` : ""}. The task is created in Jira on this
          epic and shows on the board.
        </p>

        <label className="block">
          <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={FAST_TRACK_FIELD_LIMITS.title.max}
            placeholder="What this task covers"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Description
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={FAST_TRACK_FIELD_LIMITS.description.max}
            rows={4}
            placeholder="Context for the people doing the work."
            className={`${inputClass} min-h-[96px] resize-y`}
          />
        </label>

        {error && (
          <p className="border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
