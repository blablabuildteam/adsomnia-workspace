import type { ReactNode } from "react";

/** Vertical stack for phase section cards. Use in Validation, Scoping, and later stages. */
export function PhaseSectionStack({ children }: { children: ReactNode }) {
  return <div className="space-y-8">{children}</div>;
}

/** Bordered group for a phase form/read-only section. */
export function PhaseSectionCard({
  header,
  children,
  bodyClassName = "space-y-3 p-4",
}: {
  header: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="border border-border bg-white/[0.02]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-white/[0.03] px-4 py-2.5">
        {header}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
