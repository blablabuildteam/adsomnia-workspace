import { WorkspaceChip } from "@/components/WorkspaceChip";
import { WORKSPACE_SYSTEM } from "@/data/workflow";

type HighlightedTextProps = {
  text: string;
  className?: string;
};

/** Renders “Adsomnia Workspace System” mentions as inline chips. */
export function HighlightedText({ text, className }: HighlightedTextProps) {
  const parts = text.split(
    new RegExp(`(${escapeRegExp(WORKSPACE_SYSTEM)}|Adsomnia Workspace)`, "g"),
  );

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part === WORKSPACE_SYSTEM || part === "Adsomnia Workspace") {
          return <WorkspaceChip key={`${part}-${i}`} label={part} />;
        }
        return <span key={`${part}-${i}`}>{part}</span>;
      })}
    </span>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
