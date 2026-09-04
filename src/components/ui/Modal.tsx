"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: "md" | "lg";
};

export function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className={[
          "workspace-content relative z-10 w-full border border-border-strong bg-surface-elevated shadow-[0_16px_48px_rgba(0,0,0,0.8)] animate-fade-in",
          size === "lg" ? "max-w-xl" : "max-w-lg",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2
            id="modal-title"
            className="font-display text-sm font-bold uppercase tracking-wide text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center border border-transparent text-muted transition-colors hover:border-border hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5">{children}</div>

        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

type ModalButtonProps = {
  variant?: "primary" | "secondary" | "warning";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
};

export function ModalButton({
  variant = "secondary",
  onClick,
  disabled,
  type = "button",
  children,
}: ModalButtonProps) {
  const baseClass =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide transition-opacity disabled:opacity-50";

  const variantClass = {
    primary: "border border-foreground bg-foreground text-background hover:opacity-90",
    secondary: "border border-border text-muted hover:border-border-strong hover:text-foreground",
    warning: "border border-bbb bg-bbb text-background hover:opacity-90",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${variantClass}`}
    >
      {children}
    </button>
  );
}
