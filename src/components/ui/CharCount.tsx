import { fieldLength } from "@/lib/field-limits";

type Props = {
  value: string;
  min?: number;
  max: number;
  /** Min only applies once the field has content. */
  optional?: boolean;
};

export function CharCount({ value, min = 0, max, optional = false }: Props) {
  const n = fieldLength(value);
  const minApplies = min > 0 && (!optional || n > 0);
  const under = minApplies && n < min;
  const atMax = n >= max;
  const warn = (under && n > 0) || atMax;

  return (
    <p
      className={[
        "mt-1 text-right text-[10px] tabular-nums",
        warn ? "text-btr" : "text-muted",
      ].join(" ")}
    >
      {under ? `${n} / ${min} min` : `${n} / ${max}`}
    </p>
  );
}
