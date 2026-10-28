/**
 * Archiving parks a workstream On Hold in its phase, but a rejection is a final
 * decision and keeps showing as Rejected even after the workstream is archived.
 */
export function isParkedOnHold(item: {
  status: string;
  archivedAt: Date | string | null | undefined;
}): boolean {
  return Boolean(item.archivedAt) && item.status !== "rejected";
}

/**
 * The "All" filter on a pipeline stage leaves out rejected workstreams; they
 * stay reachable through the stage's Rejected filter.
 */
export function withoutRejected<T extends { status: string }>(items: T[]): T[] {
  return items.filter((item) => item.status !== "rejected");
}
