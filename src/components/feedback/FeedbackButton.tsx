"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertCircle, Check, ImagePlus, MessageSquare, X } from "lucide-react";
import {
  submitProductFeedback,
  type SubmitFeedbackResult,
} from "@/app/(workspace)/feedback/actions";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { CharCount } from "@/components/ui/CharCount";
import { compressFeedbackImage } from "@/lib/feedback-image";
import { FEEDBACK_FIELD_LIMITS } from "@/lib/field-limits";
import { inputClass } from "@/lib/form-styles";

const initial: SubmitFeedbackResult = {};

export function FeedbackButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageName, setImageName] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const [pageUrl, setPageUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [viewport, setViewport] = useState("");
  const [state, formAction, pending] = useActionState(
    submitProductFeedback,
    initial,
  );

  useEffect(() => {
    setPageUrl(window.location.href);
    setUserAgent(navigator.userAgent);
    setViewport(`${window.innerWidth}×${window.innerHeight}`);
  }, [pathname, open]);

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    setSent(true);
    setTitle("");
    setDescription("");
    setImageName(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageError(null);
    if (imageRef.current) imageRef.current.value = "";
    const timer = window.setTimeout(() => setSent(false), 2800);
    return () => window.clearTimeout(timer);
  }, [state.success, state.submittedAt]);

  if (pathname === "/feedback") return null;

  async function handleImageChange(file: File | undefined) {
    setImageError(null);
    setImageName(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (!file) return;

    setCompressing(true);
    try {
      const compressed = await compressFeedbackImage(file);
      const transfer = new DataTransfer();
      transfer.items.add(compressed);
      if (imageRef.current) imageRef.current.files = transfer.files;
      setImageName(compressed.name);
      setImagePreview(URL.createObjectURL(compressed));
    } catch (error) {
      if (imageRef.current) imageRef.current.value = "";
      setImageError(
        error instanceof Error ? error.message : "Could not attach the image.",
      );
    } finally {
      setCompressing(false);
    }
  }

  function close() {
    if (pending) return;
    setOpen(false);
  }

  function clearImage() {
    if (imageRef.current) imageRef.current.value = "";
    setImageName(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setImageError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setPageUrl(window.location.href);
          setUserAgent(navigator.userAgent);
          setViewport(`${window.innerWidth}×${window.innerHeight}`);
          setOpen(true);
        }}
        className={[
          "fixed right-0 top-1/2 z-40 -translate-y-1/2 print:hidden",
          "flex flex-row flex-nowrap items-center gap-2 whitespace-nowrap border border-r-0 px-2.5 py-3",
          "[writing-mode:vertical-rl] [text-orientation:mixed]",
          "font-display text-[10px] font-bold uppercase tracking-[0.18em]",
          "transition-colors",
          sent
            ? "border-bbb bg-bbb text-background"
            : "border-border-strong bg-surface-input text-muted hover:border-foreground hover:bg-foreground hover:text-background",
        ].join(" ")}
        aria-label={sent ? "Feedback sent" : "Send feedback"}
        title={sent ? "Feedback sent" : "Send feedback"}
      >
        {sent ? (
          <Check className="size-3.5 shrink-0 rotate-90" />
        ) : (
          <MessageSquare className="size-3.5 shrink-0 rotate-90" />
        )}
        <span className="hidden sm:inline">{sent ? "Sent" : "Feedback"}</span>
      </button>

      <Modal
        open={open}
        onClose={close}
        title="Report an issue"
        size="lg"
        actions={
          <>
            <ModalButton onClick={close} disabled={pending}>
              Cancel
            </ModalButton>
            <ModalButton
              type="submit"
              variant="primary"
              disabled={pending || compressing}
              form="feedback-form"
            >
              {pending ? "Sending…" : "Send feedback"}
            </ModalButton>
          </>
        }
      >
        <form id="feedback-form" action={formAction} className="space-y-4">
          <input type="hidden" name="pagePath" value={pathname} />
          <input type="hidden" name="pageUrl" value={pageUrl} />
          <input type="hidden" name="userAgent" value={userAgent} />
          <input type="hidden" name="viewport" value={viewport} />

          <p className="text-sm leading-relaxed text-muted">
            Tell us what went wrong. We already attach the page you were on —
            add a title, steps, and an optional screenshot.
          </p>

          <div className="flex flex-wrap gap-2">
            <ContextChip label="Page" value={pathname} />
            {viewport ? <ContextChip label="Viewport" value={viewport} /> : null}
          </div>

          <label className="block">
            <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Title
            </span>
            <input
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={FEEDBACK_FIELD_LIMITS.title.max}
              required
              className={inputClass}
              placeholder="Short summary of the issue"
            />
            <CharCount
              value={title}
              min={FEEDBACK_FIELD_LIMITS.title.min}
              max={FEEDBACK_FIELD_LIMITS.title.max}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Description / steps to reproduce
            </span>
            <textarea
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={FEEDBACK_FIELD_LIMITS.description.max}
              required
              rows={5}
              className={`${inputClass} resize-y min-h-[120px]`}
              placeholder="What did you expect, what happened, and how can we reproduce it?"
            />
            <CharCount
              value={description}
              min={FEEDBACK_FIELD_LIMITS.description.min}
              max={FEEDBACK_FIELD_LIMITS.description.max}
            />
          </label>

          <div>
            <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Screenshot{" "}
              <span className="font-medium tracking-normal text-muted/70">
                optional
              </span>
            </span>
            <input
              ref={imageRef}
              type="file"
              name="image"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => handleImageChange(e.target.files?.[0])}
            />
            {imagePreview ? (
              <div className="relative border border-border bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Screenshot preview"
                  className="max-h-48 w-full object-contain"
                />
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <p className="truncate text-xs text-muted">{imageName}</p>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="flex size-7 items-center justify-center border border-transparent text-muted hover:border-border hover:text-foreground"
                    aria-label="Remove screenshot"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageRef.current?.click()}
                disabled={compressing}
                className="flex w-full items-center justify-center gap-2 border border-dashed border-border px-3 py-4 text-sm text-muted transition-colors hover:border-border-strong hover:text-foreground"
              >
                <ImagePlus className="size-4" />
                {compressing ? "Preparing image…" : "Attach a screenshot"}
              </button>
            )}
            {imageError ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-btr">
                <AlertCircle className="size-3.5" />
                {imageError}
              </p>
            ) : null}
          </div>

          {state.error ? (
            <p className="flex items-center gap-1.5 text-sm text-btr">
              <AlertCircle className="size-4" />
              {state.error}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}

function ContextChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 border border-border bg-surface px-2 py-1 text-[10px] uppercase tracking-wide text-muted">
      <span className="font-display font-bold">{label}</span>
      <span className="truncate normal-case tracking-normal text-foreground">
        {value}
      </span>
    </span>
  );
}
