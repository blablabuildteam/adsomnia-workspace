"use client";

import { AlertCircle } from "lucide-react";
import type { Ref } from "react";

export type MissingRequirement = {
  /** DOM id of the section this item should scroll to. */
  targetId: string;
  message: string;
};

export function MissingRequirementsNotice({
  items,
  noticeRef,
}: {
  items: MissingRequirement[];
  noticeRef?: Ref<HTMLDivElement>;
}) {
  if (items.length === 0) return null;

  return (
    <div
      ref={noticeRef}
      role="alert"
      className="scroll-mt-24 border border-btr/40 bg-btr/10 px-3 py-2.5 text-xs text-btr"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide">
            Still needed to continue
          </p>
          <ul className="mt-1.5 space-y-1">
            {items.map((item, index) => (
              <li key={`${item.targetId}-${index}`}>
                <button
                  type="button"
                  onClick={() => focusRequirement(item.targetId)}
                  className="text-left text-foreground underline decoration-btr/60 underline-offset-2 hover:decoration-btr"
                >
                  {item.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function focusRequirement(targetId: string) {
  const section = document.getElementById(targetId);
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "center" });
  const field = section.querySelector<HTMLElement>(
    "input:not([type='hidden']), textarea, select",
  );
  field?.focus({ preventScroll: true });
}
