import { and, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";

import { db } from "@/db";
import { initiatives, workstreamLinks } from "@/db/schema";
import type { PermissionUser } from "@/lib/permissions";
import { whereVisible } from "@/lib/queries";

/** How the other workstream relates to the one being viewed. */
export type WorkstreamRelation = "related" | "depends-on" | "blocks";

export type LinkedWorkstream = {
  linkId: number;
  id: number;
  ticketId: string;
  title: string;
  currentStage: string;
  status: string;
  archived: boolean;
  relation: WorkstreamRelation;
};

export type WorkstreamLinkCandidate = {
  id: number;
  ticketId: string;
  title: string;
  currentStage: string;
  status: string;
  alreadyLinked: boolean;
};

export type WorkstreamLinksPanel = {
  links: LinkedWorkstream[];
  /** Linked workstreams this viewer is not allowed to open. */
  hiddenCount: number;
};

const SEARCH_LIMIT = 8;

/** Links touching one workstream, seen from that workstream's side. */
async function listLinksFor(initiativeId: number) {
  const rows = await db
    .select({
      id: workstreamLinks.id,
      fromId: workstreamLinks.fromInitiativeId,
      toId: workstreamLinks.toInitiativeId,
      kind: workstreamLinks.kind,
    })
    .from(workstreamLinks)
    .where(
      or(
        eq(workstreamLinks.fromInitiativeId, initiativeId),
        eq(workstreamLinks.toInitiativeId, initiativeId),
      ),
    );

  return rows.map((row) => {
    const outgoing = row.fromId === initiativeId;
    const relation: WorkstreamRelation =
      row.kind === "related" ? "related" : outgoing ? "depends-on" : "blocks";
    return {
      linkId: row.id,
      otherId: outgoing ? row.toId : row.fromId,
      relation,
    };
  });
}

export async function getWorkstreamLinksPanel(
  user: PermissionUser,
  initiativeId: number,
): Promise<WorkstreamLinksPanel> {
  const links = await listLinksFor(initiativeId);
  if (links.length === 0) return { links: [], hiddenCount: 0 };

  const visible = await db
    .select({
      id: initiatives.id,
      ticketId: initiatives.ticketId,
      title: initiatives.title,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
      archivedAt: initiatives.archivedAt,
    })
    .from(initiatives)
    .where(
      whereVisible(
        user,
        inArray(
          initiatives.id,
          links.map((link) => link.otherId),
        ),
      ),
    );
  const byId = new Map(visible.map((row) => [row.id, row]));

  const shown: LinkedWorkstream[] = [];
  for (const link of links) {
    const other = byId.get(link.otherId);
    if (!other) continue;
    shown.push({
      linkId: link.linkId,
      id: other.id,
      ticketId: other.ticketId,
      title: other.title,
      currentStage: other.currentStage,
      status: other.status,
      archived: Boolean(other.archivedAt),
      relation: link.relation,
    });
  }

  const relationOrder: Record<WorkstreamRelation, number> = {
    "depends-on": 0,
    blocks: 1,
    related: 2,
  };
  shown.sort(
    (a, b) =>
      relationOrder[a.relation] - relationOrder[b.relation] ||
      a.ticketId.localeCompare(b.ticketId, "en", { numeric: true }),
  );

  return { links: shown, hiddenCount: links.length - shown.length };
}

/** Linked workstream ids for each of `initiativeIds`, limited to pairs inside that set. */
export async function getWorkstreamLinkMap(
  initiativeIds: number[],
): Promise<Record<number, number[]>> {
  if (initiativeIds.length === 0) return {};
  const rows = await db
    .select({
      fromId: workstreamLinks.fromInitiativeId,
      toId: workstreamLinks.toInitiativeId,
    })
    .from(workstreamLinks)
    .where(
      and(
        inArray(workstreamLinks.fromInitiativeId, initiativeIds),
        inArray(workstreamLinks.toInitiativeId, initiativeIds),
      ),
    );

  const map: Record<number, number[]> = {};
  for (const { fromId, toId } of rows) {
    (map[fromId] ??= []).push(toId);
    (map[toId] ??= []).push(fromId);
  }
  return map;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Title search, or ticket-number search when the query is a number with or
 * without the WS prefix ("WS-1042", "ws1042", "1042", "104").
 */
export async function searchLinkCandidates(
  user: PermissionUser,
  initiativeId: number,
  rawQuery: string,
): Promise<WorkstreamLinkCandidate[]> {
  const query = rawQuery.replace(/\s+/g, " ").trim();
  if (!query) return [];

  const number = query.match(/^#?(?:ws)?[\s#-]*(\d+)$/i)?.[1];
  const match = number
    ? ilike(initiatives.ticketId, `WS-${number}%`)
    : ilike(initiatives.title, `%${escapeLike(query)}%`);

  const [rows, links] = await Promise.all([
    db
      .select({
        id: initiatives.id,
        ticketId: initiatives.ticketId,
        title: initiatives.title,
        currentStage: initiatives.currentStage,
        status: initiatives.status,
      })
      .from(initiatives)
      .where(whereVisible(user, ne(initiatives.id, initiativeId), match))
      .orderBy(desc(initiatives.updatedAt))
      .limit(SEARCH_LIMIT),
    listLinksFor(initiativeId),
  ]);

  const linked = new Set(links.map((link) => link.otherId));
  return rows.map((row) => ({ ...row, alreadyLinked: linked.has(row.id) }));
}
