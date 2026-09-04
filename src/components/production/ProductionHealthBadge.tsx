import { HEALTH_META, type ProductionHealth } from "@/lib/production/health";

type Props = {
  health: ProductionHealth;
  compact?: boolean;
};

export function ProductionHealthBadge({ health, compact = false }: Props) {
  const meta = HEALTH_META[health];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 border font-display font-bold uppercase tracking-wide",
        compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
      ].join(" ")}
      style={{
        borderColor: `${meta.color}66`,
        backgroundColor: `${meta.color}1A`,
        color: meta.color,
      }}
    >
      <span
        className={compact ? "size-1.5" : "size-2"}
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}
