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
