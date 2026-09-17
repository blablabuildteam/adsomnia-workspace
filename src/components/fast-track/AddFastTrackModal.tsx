"use client";

import { useState, useTransition } from "react";
import { createFastTrackTask } from "@/app/(workspace)/fast-track/actions";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { inputClass } from "@/lib/form-styles";
import { FAST_TRACK_FIELD_LIMITS } from "@/lib/field-limits";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (key: string) => void;
};

export function AddFastTrackModal({ open, onClose, onCreated }: Props) {
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
      const result = await createFastTrackTask({ title, description });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.key) {
        reset();
        onCreated(result.key);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Fast-Track task"
      actions={
        <>
          <ModalButton onClick={handleClose} disabled={pending}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            type="submit"
            form="add-fast-track"
            disabled={pending}
          >
            {pending ? "Adding…" : "Add to Fast-Track"}
          </ModalButton>
        </>
      }
    >
      <form
        id="add-fast-track"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <p className="text-sm leading-relaxed text-muted">
          Skips the pipeline. Lands on the Fast Track Jira board for a quick
          fix that one or two people can finish in about a day.
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
            placeholder="What needs to happen"
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
            rows={5}
            placeholder="Context, who it is for, and anything Jira should know."
            className={`${inputClass} min-h-[120px] resize-y`}
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
