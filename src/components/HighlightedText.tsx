import { JiraChip, JIRA_LABEL } from "@/components/JiraChip";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import { WORKSPACE_SYSTEM } from "@/data/workflow";

type HighlightedTextProps = {
  text: string;
  className?: string;
  /**
   * When true, bold the label before " — " and keep the description regular weight.
   * Example: **Title & Short Description** — state the core initiative…
   */
  boldLabel?: boolean;
};

/** Renders Workspace System and Jira mentions as inline chips. */
export function HighlightedText({
  text,
  className,
  boldLabel = false,
}: HighlightedTextProps) {
  if (boldLabel) {
    const separator = " — ";
    const sepIndex = text.indexOf(separator);
    if (sepIndex !== -1) {
      const label = text.slice(0, sepIndex);
      const description = text.slice(sepIndex + separator.length);
      return (
        <span className={className}>
          <strong className="font-semibold text-foreground">{label}</strong>
          {separator}
          <span className="font-normal text-foreground/85">
            <ChipText text={description} />
          </span>
        </span>
      );
    }
  }

  return (
    <span className={className}>
      <ChipText text={text} />
    </span>
  );
}

function ChipText({ text }: { text: string }) {
  const parts = text.split(
    new RegExp(
      `(${escapeRegExp(WORKSPACE_SYSTEM)}|Adsomnia Workspace|JIRA|Jira|Business Case)`,
      "g",
    ),
  );

  return (
    <>
      {parts.map((part, i) => {
        if (part === WORKSPACE_SYSTEM || part === "Adsomnia Workspace") {
          return <WorkspaceChip key={`${part}-${i}`} label={part} />;
        }
        if (part === "Jira" || part === "JIRA") {
          return <JiraChip key={`${part}-${i}`} label={JIRA_LABEL} />;
        }
        if (part === "Business Case") {
          return (
            <span key={`${part}-${i}`} className="underline underline-offset-2">
              Business Case
            </span>
          );
        }
        return <span key={`${part}-${i}`}>{part}</span>;
      })}
    </>
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
