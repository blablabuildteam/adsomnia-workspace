import { LayoutDashboard } from "lucide-react";
import { WORKSPACE_SYSTEM } from "@/data/workflow";

type WorkspaceChipProps = {
  label?: string;
  className?: string;
  showIcon?: boolean;
};

export function WorkspaceChip({
  label = WORKSPACE_SYSTEM,
  className = "",
  showIcon = true,
}: WorkspaceChipProps) {
  return (
    <span
      className={[
        "mx-0.5 inline-flex max-w-full items-center gap-1 rounded-full border border-foreground/35 bg-white/10 px-2 py-0.5 align-middle font-display text-[10px] font-bold uppercase tracking-[0.08em] text-foreground",
        className,
      ].join(" ")}
    >
      {showIcon && <LayoutDashboard className="size-2.5 shrink-0 opacity-80" />}
      <span className="truncate">{label}</span>
    </span>
  );
}
