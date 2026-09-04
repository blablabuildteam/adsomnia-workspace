"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { initiatives, activityLog, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/session";
import { canSubmitInitiative } from "@/lib/permissions";
import { readIdeaFields, validateIdeaFields } from "@/lib/field-limits";

export type SubmitIdeaResult = {
  error?: string;
};

export async function submitIdea(
  _prev: SubmitIdeaResult,
  formData: FormData,
): Promise<SubmitIdeaResult> {
  const user = await getCurrentUser();
  if (!user || !canSubmitInitiative(user)) {
    return { error: "You must be logged in to submit an initiative." };
  }

  const {
    title,
    problemStatement,
    opportunitySolution,
    expectedImpact,
    targetAudience,
  } = readIdeaFields(formData);
  const sponsorName = (formData.get("sponsor") as string)?.trim();

  if (!sponsorName) {
    return { error: "All required fields must be filled in." };
  }

  const limitError = validateIdeaFields({
    title,
    problemStatement,
    opportunitySolution,
    expectedImpact,
    targetAudience,
  });
  if (limitError) {
    return { error: limitError };
  }

  const [sponsor] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.name, sponsorName))
    .limit(1);

  if (!sponsor) {
    return { error: `Sponsor "${sponsorName}" not found in the system.` };
  }

  const [{ nextVal }] = await db
    .select({ nextVal: sql<number>`coalesce(max(${initiatives.id}), 999) + 1` })
    .from(initiatives);

  const ticketId = `WS-${nextVal + 1000}`;

  const [created] = await db
    .insert(initiatives)
    .values({
      ticketId,
      title,
      description: title,
      problemStatement,
      opportunitySolution,
      expectedImpact,
      targetAudience,
      submitterId: user.id,
      sponsorId: sponsor.id,
      currentStage: "idea",
      status: "submitted",
    })
    .returning({ id: initiatives.id, ticketId: initiatives.ticketId });

  await db.insert(activityLog).values({
    initiativeId: created.id,
    userId: user.id,
    action: "idea_submitted",
    details: { title, sponsor: sponsorName },
  });

  redirect(`/workstreams/${created.id}`);
}
