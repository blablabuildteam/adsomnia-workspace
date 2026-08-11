import { Fragment } from "react";

/**
 * Blueprint-style corner tick marks for framed panels and cards.
 * Parent must be `relative`. `complete` switches ticks to success green;
 * `className` is appended to every tick (e.g. for hover-reveal via `group-hover:`).
 */
export function CornerTicks({
  complete = false,
  className = "",
}: {
  complete?: boolean;
  className?: string;
}) {
  const tickColor = complete ? "border-success" : "border-foreground/60";
  const base = `pointer-events-none absolute size-3 border-solid transition-colors duration-500 ${tickColor} ${className}`;

  return (
    <Fragment>
      <span aria-hidden className={`${base} -left-px -top-px border-l-2 border-t-2`} />
      <span aria-hidden className={`${base} -right-px -top-px border-r-2 border-t-2`} />
      <span aria-hidden className={`${base} -bottom-px -left-px border-b-2 border-l-2`} />
      <span aria-hidden className={`${base} -bottom-px -right-px border-b-2 border-r-2`} />
    </Fragment>
  );
}
