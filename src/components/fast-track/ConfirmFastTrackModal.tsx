"use client";

import { Rocket } from "lucide-react";
import { Modal, ModalButton } from "@/components/ui/Modal";

type Props = {
  open: boolean;
  onClose: () => void;
  pending?: boolean;
  /** When set, confirm submits the enclosing form with this server action. */
  formAction?: (formData: FormData) => void | Promise<void>;
};

export function ConfirmFastTrackModal({
  open,
  onClose,
  pending = false,
  formAction,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title="Push to Fast-Track?"
      actions={
        <>
          <ModalButton onClick={onClose} disabled={pending}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="warning"
            type="submit"
            formAction={formAction}
            formNoValidate
            disabled={pending}
          >
            {pending ? "Pushing…" : "Push to Fast-Track"}
          </ModalButton>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center border border-bbb/30 bg-bbb/10">
          <Rocket className="size-5 text-bbb" />
        </div>
        <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
          <p>
            This workstream will skip the rest of the pipeline. A task is
            created on the Fast Track Jira board for a quick fix that one or two
            people can finish in about a day.
          </p>
          <p className="text-xs text-muted">
            Current details are saved, then you are taken to the Fast-Track
            board. Confirm only if that is the intended path.
          </p>
        </div>
      </div>
    </Modal>
  );
}
