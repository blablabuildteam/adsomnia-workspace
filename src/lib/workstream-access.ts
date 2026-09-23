import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { initiatives, users, workstreamAccess } from "@/db/schema";
import {
  canEditIdeaDetails,
  canEditScoping,
  canEditValidation,
  isCreator,
  seesAllWorkstreams,
  type InitiativeAccess,
  type PermissionUser,
  type WorkstreamAccessLevel,
  type WorkspaceRole,
} from "@/lib/permissions";
import { displayName } from "@/lib/session";

export type WorkstreamAccessKind = "owner" | "leadership" | "assistant" | "grant";

export type WorkstreamAccessEntry = {
  userId: string;
  name: string;
  jobTitle: string | null;
  email: string;
  level: WorkstreamAccessLevel;
  kind: WorkstreamAccessKind;
};

export type WorkstreamAccessCandidate = {
  id: string;
  handle: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  email: string;
};

export type WorkstreamAccessPanel = {
  entries: WorkstreamAccessEntry[];
  candidates: WorkstreamAccessCandidate[];
};

type DirectoryUser = {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  email: string;
  role: WorkspaceRole;
};

export async function getWorkstreamAccessLevel(
  userId: string,
  initiativeId: number,
): Promise<WorkstreamAccessLevel | null> {
  const [row] = await db
    .select({ level: workstreamAccess.level })
    .from(workstreamAccess)
    .where(
      and(
        eq(workstreamAccess.userId, userId),
        eq(workstreamAccess.initiativeId, initiativeId),
      ),
    )
    .limit(1);

  return row?.level ?? null;
}

/** Attach an explicit grant when role and ownership do not already decide access. */
export async function loadInitiativeAccess(
  user: PermissionUser,
  initiativeId: number,
  existing: {
    submitterId: string;
    currentStage?: string;
    status?: string;
  },
): Promise<InitiativeAccess> {
  const access: InitiativeAccess = {
    submitterId: existing.submitterId,
    currentStage: existing.currentStage ?? "",
    status: existing.status ?? "",
  };
  if (isCreator(user, access) || seesAllWorkstreams(user)) {
    return access;
  }
  access.memberAccess = await getWorkstreamAccessLevel(user.id, initiativeId);
  return access;
}

export async function listUserWorkstreamGrants(
  userId: string,
): Promise<{ initiativeId: number; level: WorkstreamAccessLevel }[]> {
  return db
    .select({
      initiativeId: workstreamAccess.initiativeId,
      level: workstreamAccess.level,
    })
    .from(workstreamAccess)
    .where(eq(workstreamAccess.userId, userId));
}

function contentLevel(
  person: PermissionUser,
  initiative: InitiativeAccess,
): WorkstreamAccessLevel {
  if (person.role === "leadership") return "edit";
  if (person.role === "assistant") return "view";
  if (
    canEditIdeaDetails(person, initiative) ||
    canEditValidation(person, initiative) ||
    canEditScoping(person, initiative)
  ) {
    return "edit";
  }
  return "view";
}

function toEntry(
  person: DirectoryUser,
  level: WorkstreamAccessLevel,
  kind: WorkstreamAccessKind,
): WorkstreamAccessEntry {
  return {
    userId: person.id,
    name: displayName(person),
    jobTitle: person.jobTitle,
    email: person.email,
    level,
    kind,
  };
}

export async function getWorkstreamAccessPanel(
  initiativeId: number,
): Promise<WorkstreamAccessPanel | null> {
  const [initiative] = await db
    .select({
      submitterId: initiatives.submitterId,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!initiative) return null;

  const [directory, grants] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        jobTitle: users.jobTitle,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .orderBy(asc(users.name)),
    db
      .select({
        userId: workstreamAccess.userId,
        level: workstreamAccess.level,
      })
      .from(workstreamAccess)
      .where(eq(workstreamAccess.initiativeId, initiativeId)),
  ]);

  const byId = new Map(directory.map((person) => [person.id, person]));
  const listed = new Set<string>();
  const entries: WorkstreamAccessEntry[] = [];
  const access: InitiativeAccess = {
    submitterId: initiative.submitterId,
    currentStage: initiative.currentStage,
    status: initiative.status,
  };

  const owner = byId.get(initiative.submitterId);
  if (owner) {
    listed.add(owner.id);
    entries.push(toEntry(owner, contentLevel(owner, access), "owner"));
  }

  for (const person of directory) {
    if (person.role !== "leadership" || listed.has(person.id)) continue;
    listed.add(person.id);
    entries.push(toEntry(person, "edit", "leadership"));
  }

  for (const person of directory) {
    if (person.role !== "assistant" || listed.has(person.id)) continue;
    listed.add(person.id);
    entries.push(toEntry(person, "view", "assistant"));
  }

  const grantEntries = grants
    .map((grant) => {
      const person = byId.get(grant.userId);
      if (!person || listed.has(person.id)) return null;
      listed.add(person.id);
      return toEntry(person, grant.level, "grant");
    })
    .filter((entry): entry is WorkstreamAccessEntry => entry != null)
    .sort((a, b) => a.name.localeCompare(b.name, "en"));

  entries.push(...grantEntries);

  const candidates = directory
    .filter((person) => !listed.has(person.id))
    .map((person) => ({
      id: person.id,
      handle: displayName(person),
      firstName: person.firstName,
      lastName: person.lastName,
      jobTitle: person.jobTitle,
      email: person.email,
    }))
    .filter((person) => person.handle.length > 0)
    .sort((a, b) => a.handle.localeCompare(b.handle, "en"));

  return { entries, candidates };
}
