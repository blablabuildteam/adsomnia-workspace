import { JiraChip, JIRA_LABEL } from "@/components/JiraChip";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import { WORKSPACE_SYSTEM } from "@/data/workflow";

type HighlightedTextProps = {
  text: string;
  className?: string;
};

/** Renders Workspace System and Jira mentions as inline chips. */
export function HighlightedText({ text, className }: HighlightedTextProps) {
  const parts = text.split(
    new RegExp(
      `(${escapeRegExp(WORKSPACE_SYSTEM)}|Adsomnia Workspace|JIRA|Jira)`,
      "g",
    ),
  );

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part === WORKSPACE_SYSTEM || part === "Adsomnia Workspace") {
          return <WorkspaceChip key={`${part}-${i}`} label={part} />;
        }
        if (part === "Jira" || part === "JIRA") {
          return <JiraChip key={`${part}-${i}`} label={JIRA_LABEL} />;
        }
        return <span key={`${part}-${i}`}>{part}</span>;
      })}
    </span>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
