import type { ReactNode } from "react";
import { Check, Loader2 } from "lucide-react";
import { inputClass } from "@/lib/form-styles";

type Props = {
  create?: {
    label: string;
    busyLabel?: string;
    busy?: boolean;
    disabled?: boolean;
    icon?: ReactNode;
    onClick: () => void;
  };
  urlLabel: string;
  urlValue: string;
  urlPlaceholder: string;
  urlDisabled?: boolean;
  onUrlChange: (value: string) => void;
  saveLabel: string;
  saveDisabled?: boolean;
  onSave: () => void;
  extra?: ReactNode;
};

export function SetupCreateOrLinkRow({
  create,
  urlLabel,
  urlValue,
  urlPlaceholder,
  urlDisabled,
  onUrlChange,
  saveLabel,
  saveDisabled,
  onSave,
  extra,
}: Props) {
  return (
    <div className="flex flex-wrap items-stretch gap-2">
      {create ? (
        <>
          <button
            type="button"
            onClick={create.onClick}
            disabled={create.busy || create.disabled}
            className="inline-flex shrink-0 items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
          >
            {create.busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              create.icon
            )}
            {create.busy ? (create.busyLabel ?? "Creating…") : create.label}
          </button>
          <span className="flex items-center px-1 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            or
          </span>
        </>
      ) : null}
      <label className="min-w-[14rem] flex-1">
        <span className="sr-only">{urlLabel}</span>
        <input
          type="url"
          value={urlValue}
          onChange={(e) => onUrlChange(e.target.value)}
          className={`${inputClass} h-full py-2.5`}
          placeholder={urlPlaceholder}
          disabled={urlDisabled}
        />
      </label>
      <button
        type="button"
        onClick={onSave}
        disabled={saveDisabled}
        className="inline-flex shrink-0 items-center gap-2 border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-40"
      >
        <Check className="size-3.5" />
        {saveLabel}
      </button>
      {extra}
    </div>
  );
}
