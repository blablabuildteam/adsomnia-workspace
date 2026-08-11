/**
 * Toned-down brand photograph (glitch/scanline) blended into the black chrome.
 * Render inside a `relative` container; content should sit in a sibling with
 * `relative z-10` (or higher) so the texture stays behind it.
 */
export function BrandTexture({
  variant = "hero",
  className = "",
}: {
  /** `hero` = header streak fading toward content; `page` = full-bleed atmosphere. */
  variant?: "hero" | "page";
  className?: string;
}) {
  return (
    <div aria-hidden className={`brand-texture brand-texture--${variant} ${className}`} />
  );
}
