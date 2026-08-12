import { Fragment } from "react";

/**
 * Blueprint-style corner tick marks for framed panels and cards.
 * Parent must be `relative`. `complete` switches ticks to success green;
 * `className` is appended to every tick (e.g. for hover-reveal via `group-hover:`).
 * `pulse` syncs each tick to light up as a rotating border reaches that corner.
 */
export function CornerTicks({
  complete = false,
  pulse = false,
  className = "",
}: {
  complete?: boolean;
  pulse?: boolean;
  className?: string;
}) {
  const tickColor = complete ? "border-success" : "border-foreground/60";
  const base = `pointer-events-none absolute size-3 border-solid transition-colors duration-500 ${tickColor} ${className}`;

  if (pulse) {
    const pulseBase =
      "pointer-events-none absolute size-3 border-solid";
    return (
      <Fragment>
        <span
          aria-hidden
          className={`${pulseBase} corner-tick-glow corner-tick-glow--tl -left-px -top-px border-l-2 border-t-2`}
        />
        <span
          aria-hidden
          className={`${pulseBase} corner-tick-glow corner-tick-glow--tr -right-px -top-px border-r-2 border-t-2`}
        />
        <span
          aria-hidden
          className={`${pulseBase} corner-tick-glow corner-tick-glow--bl -bottom-px -left-px border-b-2 border-l-2`}
        />
        <span
          aria-hidden
          className={`${pulseBase} corner-tick-glow corner-tick-glow--br -bottom-px -right-px border-b-2 border-r-2`}
        />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <span aria-hidden className={`${base} -left-px -top-px border-l-2 border-t-2`} />
      <span aria-hidden className={`${base} -right-px -top-px border-r-2 border-t-2`} />
      <span aria-hidden className={`${base} -bottom-px -left-px border-b-2 border-l-2`} />
      <span aria-hidden className={`${base} -bottom-px -right-px border-b-2 border-r-2`} />
    </Fragment>
  );
}
