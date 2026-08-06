/**
 * Routes that remain in the codebase for later, but are not yet
 * available to clients in the concept preview.
 */
export const LOCKED_PREVIEW_ROUTES = [
  "/dashboard",
  "/ideas/new",
  "/initiatives",
] as const;

export function isPreviewLocked(pathname: string): boolean {
  return LOCKED_PREVIEW_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
