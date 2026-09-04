import { PRIORITY_META } from "@/lib/validation-data";

type Props = {
  value?: string;
  compact?: boolean;
};

export function ConsensusPriorityChip({ value, compact = false }: Props) {
  const assigned = value?.trim() || undefined;
  const meta = assigned ? PRIORITY_META[assigned] : undefined;
  const color = meta?.color;

  return (
    <span
      className={[
        "inline-flex items-center border font-display font-bold uppercase tracking-wide",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
        color ? "" : "border-border text-muted/50",
      ].join(" ")}
      style={
        color
          ? {
              borderColor: `${color}66`,
              backgroundColor: `${color}1A`,
              color,
            }
          : undefined
      }
      title={meta?.hint ?? "Consensus priority not set in Scoping"}
    >
      {assigned ?? "TBD"}
    </span>
  );
}
