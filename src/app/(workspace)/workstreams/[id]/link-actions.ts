"use server";

import { revalidatePath } from "next/cache";
import { and, eq, or } from "drizzle-orm";

import { db } from "@/db";
import { activityLog, initiatives, workstreamLinks } from "@/db/schema";
import { canModifyWorkstream, canViewInitiative } from "@/lib/permissions";
import { displayName, getCurrentUser } from "@/lib/session";
import { loadInitiativeAccess } from "@/lib/workstream-access";
import {
  searchLinkCandidates,
  type WorkstreamLinkCandidate,
  type WorkstreamRelation,
} from "@/lib/workstream-links";

export type WorkstreamLinkResult = { error?: string; success?: boolean };

const RELATIONS: WorkstreamRelation[] = ["related", "depends-on", "blocks"];

function revalidateLinks(...initiativeIds: number[]) {
  for (const id of initiativeIds) revalidatePath(`/workstreams/${id}`);
  revalidatePath("/overview");
  revalidatePath("/dashboard");
}

async function loadWorkstream(initiativeId: number) {
  const [row] = await db
    .select({
      id: initiatives.id,
      ticketId: initiatives.ticketId,
      title: initiatives.title,
      submitterId: initiatives.submitterId,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);
  return row ?? null;
}

/** Signed-in user who can change this workstream (creator, leadership, edit grant). */
async function authorize(initiativeId: number) {
  const actor = await getCurrentUser();
  if (!actor) return { error: "You must be logged in." } as const;

  const source = await loadWorkstream(initiativeId);
  if (!source) return { error: "Workstream not found." } as const;

  const access = await loadInitiativeAccess(actor, initiativeId, source);
  if (!canViewInitiative(actor, access)) {
    return { error: "Workstream not found." } as const;
  }
  if (!canModifyWorkstream(actor, access)) {
    return { error: "You need edit access to link workstreams." } as const;
  }
  return { actor, source };
}

export async function searchWorkstreamsToLink(
  initiativeId: number,
  query: string,
): Promise<{ results: WorkstreamLinkCandidate[]; error?: string }> {
  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return { results: [], error: loaded.error };
  return {
    results: await searchLinkCandidates(loaded.actor, initiativeId, query),
  };
}

export async function linkWorkstreams(
  initiativeId: number,
  targetId: number,
  relation: WorkstreamRelation,
): Promise<WorkstreamLinkResult> {
  if (!RELATIONS.includes(relation)) {
    return { error: "Choose how the workstreams relate." };
  }
  if (initiativeId === targetId) {
    return { error: "A workstream can't be linked to itself." };
  }

  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;
  const { actor, source } = loaded;

  const target = await loadWorkstream(targetId);
  if (
    !target ||
    !canViewInitiative(actor, await loadInitiativeAccess(actor, targetId, target))
  ) {
    return { error: "That workstream was not found." };
  }

  const [existing] = await db
    .select({ id: workstreamLinks.id })
    .from(workstreamLinks)
    .where(
      or(
        and(
          eq(workstreamLinks.fromInitiativeId, initiativeId),
          eq(workstreamLinks.toInitiativeId, targetId),
        ),
        and(
          eq(workstreamLinks.fromInitiativeId, targetId),
          eq(workstreamLinks.toInitiativeId, initiativeId),
        ),
      ),
    )
    .limit(1);
  if (existing) {
    return { error: `${target.ticketId} is already linked to this workstream.` };
  }

  // Related pairs are stored lowest id first; dependencies point at the one waited on.
  const [fromId, toId] =
    relation === "related"
      ? [Math.min(initiativeId, targetId), Math.max(initiativeId, targetId)]
      : relation === "depends-on"
        ? [initiativeId, targetId]
        : [targetId, initiativeId];

  await db.insert(workstreamLinks).values({
    fromInitiativeId: fromId,
    toInitiativeId: toId,
    kind: relation === "related" ? "related" : "depends-on",
    createdById: actor.id,
  });

  const by = displayName(actor);
  const mirrored: Record<WorkstreamRelation, WorkstreamRelation> = {
    related: "related",
    "depends-on": "blocks",
    blocks: "depends-on",
  };
  await db.insert(activityLog).values([
    {
      initiativeId,
      userId: actor.id,
      action: "workstream_linked",
      details: { otherTicketId: target.ticketId, otherTitle: target.title, relation, by },
    },
    {
      initiativeId: targetId,
      userId: actor.id,
      action: "workstream_linked",
      details: {
        otherTicketId: source.ticketId,
        otherTitle: source.title,
        relation: mirrored[relation],
        by,
      },
    },
  ]);

  revalidateLinks(initiativeId, targetId);
  return { success: true };
}

export async function unlinkWorkstreams(
  initiativeId: number,
  linkId: number,
): Promise<WorkstreamLinkResult> {
  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;
  const { actor, source } = loaded;

  const [removed] = await db
    .delete(workstreamLinks)
    .where(
      and(
        eq(workstreamLinks.id, linkId),
        or(
          eq(workstreamLinks.fromInitiativeId, initiativeId),
          eq(workstreamLinks.toInitiativeId, initiativeId),
        ),
      ),
    )
    .returning({
      fromId: workstreamLinks.fromInitiativeId,
      toId: workstreamLinks.toInitiativeId,
    });
  if (!removed) return { error: "That link no longer exists." };

  const otherId = removed.fromId === initiativeId ? removed.toId : removed.fromId;
  const other = await loadWorkstream(otherId);
  const by = displayName(actor);
  await db.insert(activityLog).values([
    {
      initiativeId,
      userId: actor.id,
      action: "workstream_unlinked",
      details: { otherTicketId: other?.ticketId, otherTitle: other?.title, by },
    },
    {
      initiativeId: otherId,
      userId: actor.id,
      action: "workstream_unlinked",
      details: { otherTicketId: source.ticketId, otherTitle: source.title, by },
    },
  ]);

  revalidateLinks(initiativeId, otherId);
  return { success: true };
}
