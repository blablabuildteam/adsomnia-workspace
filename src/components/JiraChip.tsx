import Image from "next/image";

export const JIRA_LABEL = "Jira";

type JiraChipProps = {
  label?: string;
  className?: string;
};

export function JiraChip({
  label = JIRA_LABEL,
  className = "",
}: JiraChipProps) {
  return (
    <span
      className={[
        "mx-0.5 inline-flex max-w-full items-center gap-1 rounded-full border border-[#2684FF]/55 bg-[#2684FF]/15 px-2 py-0.5 align-middle font-display text-[10px] font-bold uppercase tracking-[0.08em] text-[#8AB4FF]",
        className,
      ].join(" ")}
    >
      <Image
        src="/brand/jira.png"
        alt=""
        width={12}
        height={12}
        className="size-2.5 shrink-0"
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
