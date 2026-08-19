"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  Loader2,
  Lock,
  SkipForward,
  AlertTriangle,
} from "lucide-react";
import type { SetupTaskStatus } from "@/lib/validation-data";

const STATUS_ICON: Record<
  SetupTaskStatus,
  { icon: typeof Check; color: string; bgColor: string }
> = {
  pending: { icon: Circle, color: "text-muted/40", bgColor: "bg-transparent" },
  "in-progress": {
    icon: Loader2,
    color: "text-[#EAB308]",
    bgColor: "bg-[#EAB308]/10",
  },
  completed: {
    icon: Check,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  skipped: {
    icon: SkipForward,
    color: "text-muted/60",
    bgColor: "bg-muted/10",
  },
  error: {
    icon: AlertTriangle,
    color: "text-btr",
    bgColor: "bg-btr/10",
  },
};

type Props = {
  number: number;
  label: string;
  status: SetupTaskStatus;
  optional?: boolean;
  forceOpen?: number;
  locked?: boolean;
  lockHint?: string | null;
  readOnly?: boolean;
  completing?: boolean;
  /** Keep the card expanded after it is marked complete. */
  stayOpenOnComplete?: boolean;
  logo?: string;
  onMarkComplete?: () => void;
  onUndo?: () => void;
  children: ReactNode;
};

export function SetupTaskCard({
  number,
  label,
  status,
  optional,
  forceOpen,
  locked = false,
  lockHint,
  readOnly,
  completing,
  stayOpenOnComplete,
  logo,
  onMarkComplete,
  onUndo,
  children,
}: Props) {
  const isDone = status === "completed" || status === "skipped";
  const blocked = locked || readOnly;
  const canUndo = isDone && !blocked && !completing && !!onUndo;
  const [open, setOpen] = useState(Boolean(stayOpenOnComplete && isDone));
  const wasDone = useRef(isDone);
  const meta = STATUS_ICON[status];
  const Icon = completing ? Loader2 : locked ? Lock : meta.icon;

  useEffect(() => {
    if (forceOpen != null && !locked) setOpen(true);
  }, [forceOpen, locked]);

  useEffect(() => {
    if (locked) setOpen(false);
  }, [locked]);

  useEffect(() => {
    if (isDone && !wasDone.current && !stayOpenOnComplete) setOpen(false);
    wasDone.current = isDone;
  }, [isDone, stayOpenOnComplete]);

  return (
    <div
      className={[
        "group/step border border-border transition-colors duration-200",
        locked
          ? "opacity-45"
          : "hover:border-border-strong hover:bg-white/[0.03]",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex w-full items-center gap-3 px-4 py-3 transition-colors duration-200",
          isDone ? "bg-surface opacity-70" : "bg-surface",
          locked ? "" : "group-hover/step:bg-surface-elevated",
        ].join(" ")}
      >
        <button
          type="button"
          disabled={locked}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
          onClick={() => setOpen((current) => !current)}
          className="absolute inset-0 z-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={blocked || completing || (isDone ? !onUndo : !onMarkComplete)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (canUndo) {
              onUndo?.();
            } else {
              onMarkComplete?.();
            }
          }}
          aria-label={
            locked
              ? `${label} locked`
              : isDone
                ? `Undo ${label}`
                : `Mark ${label} complete`
          }
          title={
            locked
              ? (lockHint ?? "Locked")
              : readOnly
                ? "Only the Head of Production can manage setup tasks"
                : isDone
                  ? "Click to undo"
                  : undefined
          }
          className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded border transition-colors ${
            locked ? "text-muted/50" : meta.bgColor
          } ${locked ? "" : meta.color} ${
            blocked || completing || (isDone ? !onUndo : !onMarkComplete)
              ? "cursor-not-allowed opacity-60"
              : isDone
                ? "cursor-pointer hover:border-btr hover:bg-btr/20 hover:text-btr"
                : "cursor-pointer hover:border-success hover:bg-success/20 hover:text-success"
          }`}
          style={
            locked
              ? { borderColor: "rgb(255 255 255 / 0.08)" }
              : status === "completed"
                ? { borderColor: "rgb(34 197 94 / 0.4)" }
                : status === "error"
                  ? { borderColor: "rgb(255 59 31 / 0.4)" }
                  : { borderColor: "rgb(255 255 255 / 0.12)" }
          }
        >
          <Icon
            className={`size-4 pointer-events-none ${completing || status === "in-progress" ? "animate-spin" : ""}`}
          />
        </button>
        <div className="pointer-events-none relative z-10 flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={[
                "font-display text-xs font-bold uppercase tracking-wide transition-colors duration-200",
                isDone ? "text-muted line-through" : "group-hover/step:text-foreground",
              ].join(" ")}
            >
              {String(number).padStart(2, "0")}. {label}
            </span>
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="size-4 shrink-0 object-contain"
              />
            )}
            {optional && (
              <span className="text-[9px] font-normal uppercase tracking-wide text-muted/50">
                Optional
              </span>
            )}
          </span>
          <span
            className={
              open
                ? "inline-flex group-hover/step:animate-[chevron-hint-up_480ms_ease-in-out]"
                : "inline-flex group-hover/step:animate-[chevron-hint-down_480ms_ease-in-out]"
            }
          >
            <ChevronDown
              className={`size-3.5 shrink-0 text-muted transition-transform duration-300 ease-out group-hover/step:text-foreground ${open ? "rotate-180" : ""}`}
            />
          </span>
        </div>
      </div>
      <div
        className={[
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div
            className={[
              "border-t border-border px-4 py-4 transition-opacity duration-300 ease-out sm:px-5",
              open ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
