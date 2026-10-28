"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { initiatives, workstreamTodos } from "@/db/schema";
import { canViewInitiative } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/session";
import { loadInitiativeAccess } from "@/lib/workstream-access";
import { TODO_BODY_MAX } from "@/lib/field-limits";

export type TodoResult = { error?: string; success?: boolean };

/** Anyone who can open the workstream can keep their own to-dos on it. */
async function authorize(initiativeId: number) {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." } as const;

  const [workstream] = await db
    .select({
      submitterId: initiatives.submitterId,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);
  if (!workstream) return { error: "Workstream not found." } as const;

  const access = await loadInitiativeAccess(user, initiativeId, workstream);
  if (!canViewInitiative(user, access)) {
    return { error: "Workstream not found." } as const;
  }
  return { user, workstream };
}

function readBody(raw: string): { body: string } | { error: string } {
  const body = raw.trim();
  if (!body) return { error: "To-do cannot be empty." };
  if (body.length > TODO_BODY_MAX) {
    return { error: `To-do must be ${TODO_BODY_MAX} characters or fewer.` };
  }
  return { body };
}

/** Only ever touches the signed-in user's own rows. */
function ownTodo(initiativeId: number, userId: string, todoId: number) {
  return and(
    eq(workstreamTodos.id, todoId),
    eq(workstreamTodos.initiativeId, initiativeId),
    eq(workstreamTodos.userId, userId),
  );
}

export async function addTodo(
  initiativeId: number,
  rawBody: string,
): Promise<TodoResult> {
  const parsed = readBody(rawBody);
  if ("error" in parsed) return parsed;

  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;

  await db.insert(workstreamTodos).values({
    initiativeId,
    userId: loaded.user.id,
    body: parsed.body,
    stage: loaded.workstream.currentStage,
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  return { success: true };
}

export async function editTodo(
  initiativeId: number,
  todoId: number,
  rawBody: string,
): Promise<TodoResult> {
  const parsed = readBody(rawBody);
  if ("error" in parsed) return parsed;

  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;

  await db
    .update(workstreamTodos)
    .set({ body: parsed.body })
    .where(ownTodo(initiativeId, loaded.user.id, todoId));

  revalidatePath(`/workstreams/${initiativeId}`);
  return { success: true };
}

export async function setTodoDone(
  initiativeId: number,
  todoId: number,
  done: boolean,
): Promise<TodoResult> {
  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;

  await db
    .update(workstreamTodos)
    .set({ doneAt: done ? new Date() : null })
    .where(ownTodo(initiativeId, loaded.user.id, todoId));

  revalidatePath(`/workstreams/${initiativeId}`);
  return { success: true };
}

export async function deleteTodo(
  initiativeId: number,
  todoId: number,
): Promise<TodoResult> {
  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;

  await db
    .delete(workstreamTodos)
    .where(ownTodo(initiativeId, loaded.user.id, todoId));

  revalidatePath(`/workstreams/${initiativeId}`);
  return { success: true };
}
