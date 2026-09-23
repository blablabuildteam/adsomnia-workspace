"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { setWorkstreamArchived } from "@/app/(workspace)/workstreams/[id]/actions";
import { Modal, ModalButton } from "@/components/ui/Modal";

type Props = {
  initiativeId: number;
  title: string;
  stageName: string;
  archived: boolean;
  /** Match the PDF control in the page header (`sm`) or the sticky bar (`md`). */
  size?: "sm" | "md";
};

export function ArchiveWorkstreamButton({
  initiativeId,
  title,
  stageName,
  archived,
  size = "sm",
}: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function run(nextArchived: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setWorkstreamArchived(initiativeId, nextArchived);
      if (result.error) {
        setError(result.error);
        setConfirmOpen(true);
        return;
      }
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (archived ? run(false) : setConfirmOpen(true))}
        disabled={pending}
        className={[
          "inline-flex shrink-0 items-center gap-2 border text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50 print:hidden",
          archived ? "border-[var(--hn-ink)] text-[var(--hn-ink)]" : "border-border",
          size === "md" ? "px-3.5 py-2" : "px-3 py-2",
        ].join(" ")}
        title={
          archived
            ? `Restore from On Hold in ${stageName}`
            : `Archive to On Hold in ${stageName}`
        }
      >
        {archived ? (
          <ArchiveRestore className="size-4" />
        ) : (
          <Archive className="size-4" />
        )}
        <span
          className={[
            "font-display font-bold uppercase tracking-wide",
            size === "md" ? "text-xs" : "text-[10px]",
          ].join(" ")}
        >
          {pending ? (archived ? "Restoring…" : "Archiving…") : archived ? "Restore" : "Archive"}
        </span>
      </button>

      {mounted &&
        createPortal(
          <Modal
            open={confirmOpen}
            onClose={() => {
              if (!pending) setConfirmOpen(false);
            }}
            title="Archive workstream"
            actions={
              <>
                <ModalButton
                  onClick={() => setConfirmOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </ModalButton>
                <ModalButton
                  variant="primary"
                  onClick={() => run(true)}
                  disabled={pending}
                >
                  {pending ? "Archiving…" : "Archive"}
                </ModalButton>
              </>
            }
          >
            <p className="text-sm leading-relaxed text-muted">
              {title} will move to On Hold in {stageName}. You can restore it
              later.
            </p>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </Modal>,
          document.body,
        )}
    </>
  );
}
