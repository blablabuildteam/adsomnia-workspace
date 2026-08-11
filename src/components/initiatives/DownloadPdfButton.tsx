"use client";

import { Download } from "lucide-react";

export function DownloadPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 border border-border px-3 py-2 text-muted transition-colors hover:border-foreground hover:text-foreground print:hidden"
      title="Download as PDF"
    >
      <Download className="size-4" />
      <span className="font-display text-[10px] font-bold uppercase tracking-wide">
        PDF
      </span>
    </button>
  );
}
