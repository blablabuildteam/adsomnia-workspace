import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { workstreamTodos } from "@/db/schema";

export type WorkstreamTodo = {
  id: number;
  body: string;
  /** Phase the to-do was written in. */
  stage: string;
  doneAt: Date | null;
  createdAt: Date;
};

/** One person's to-dos on a workstream, oldest first. */
export async function listWorkstreamTodos(
  initiativeId: number,
  userId: string,
): Promise<WorkstreamTodo[]> {
  return db
    .select({
      id: workstreamTodos.id,
      body: workstreamTodos.body,
      stage: workstreamTodos.stage,
      doneAt: workstreamTodos.doneAt,
      createdAt: workstreamTodos.createdAt,
    })
    .from(workstreamTodos)
    .where(
      and(
        eq(workstreamTodos.initiativeId, initiativeId),
        eq(workstreamTodos.userId, userId),
      ),
    )
    .orderBy(asc(workstreamTodos.createdAt), asc(workstreamTodos.id));
}
