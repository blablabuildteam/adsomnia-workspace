"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, initiatives } from "@/db/schema";
import {
  getInstanceLabel,
  getJiraProject,
  resolveJiraSpaceForLeadParty,
} from "@/lib/integrations/jira";
import { isTrackedLeadParty } from "@/lib/production/health";
import {
  getProductionJourney,
  type JourneyStage,
} from "@/lib/production/load";
import {
  canAddProductionProject,
  canAdjustProductionPriority,
  canManageOnboarding,
  getCurrentUser,
} from "@/lib/session";
import {
  createManualProductionSetupData,
  normalizeUrl,
  PRIORITY_LEVELS,
  type PriorityLevel,
  type ScopingData,
} from "@/lib/validation-data";

export async function refreshProductionOverview() {
  const user = await getCurrentUser();
  if (!user) return;
  revalidatePath("/pipeline/production");
  revalidatePath("/report");
}

export async function loadProductionJourney(
  initiativeId: number,
): Promise<JourneyStage[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getProductionJourney(initiativeId);
}

export type ArchiveResult = { error?: string; success?: boolean };

export async function setProductionArchived(
  initiativeId: number,
  archived: boolean,
): Promise<ArchiveResult> {
  const user = await getCurrentUser();
  if (!user || !canManageOnboarding(user)) {
    return { error: "Only the Head of Production can archive projects." };
  }

  const [row] = await db
    .select({
      id: initiatives.id,
      currentStage: initiatives.currentStage,
      title: initiatives.title,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row || row.currentStage !== "production") {
    return { error: "Only Production workstreams can be archived." };
  }

  await db
    .update(initiatives)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: archived ? "production_archived" : "production_restored",
    details: {
      title: row.title,
      by: user.name,
    },
  });

  revalidatePath("/pipeline/production");
  revalidatePath("/report");
  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/overview");
  revalidatePath("/dashboard");
  return { success: true };
}

export type PriorityResult = { error?: string; success?: boolean };

export async function updateProductionConsensusPriority(
  initiativeId: number,
  priority: string,
): Promise<PriorityResult> {
  const user = await getCurrentUser();
  if (!user || !canAdjustProductionPriority(user)) {
    return { error: "Only leadership can update production priority." };
  }

  const next = priority.trim();
  if (!PRIORITY_LEVELS.includes(next as PriorityLevel)) {
    return { error: "Choose Now, Near, Later, or Backlog." };
  }

  const [row] = await db
    .select({
      id: initiatives.id,
      currentStage: initiatives.currentStage,
      title: initiatives.title,
      scopingData: initiatives.scopingData,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row || row.currentStage !== "production") {
    return { error: "Priority can only be updated on Production projects." };
  }

  const existing = (row.scopingData as ScopingData | null) ?? {};
  const previous = existing.consensusPriority?.trim() || null;

  await db
    .update(initiatives)
    .set({
      scopingData: { ...existing, consensusPriority: next },
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "production_priority_updated",
    details: {
      title: row.title,
      by: user.name,
      from: previous,
      to: next,
    },
  });

  revalidatePath("/pipeline/production");
  revalidatePath("/report");
  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/overview");
  revalidatePath("/dashboard");
  return { success: true };
}

export type ManualProductionInput = {
  title: string;
  consensusPriority: string;
  leadParty: string;
  jiraUrl: string;
  driveUrl?: string;
  slackChannel?: string;
};

export type ManualProductionResult = {
  error?: string;
  id?: number;
};

function normalizeSlackChannelName(raw: string): string {
  return raw.trim().replace(/^#/, "").trim();
}

export async function createManualProductionProject(
  input: ManualProductionInput,
): Promise<ManualProductionResult> {
  const user = await getCurrentUser();
  if (!user || !canAddProductionProject(user)) {
    return { error: "Only leadership can add a project from Production." };
  }

  const title = input.title.trim();
  if (!title) {
    return { error: "Title is required." };
  }
  if (title.length > 160) {
    return { error: "Title must be 160 characters or fewer." };
  }

  const priority = input.consensusPriority.trim();
  if (!PRIORITY_LEVELS.includes(priority as PriorityLevel)) {
    return { error: "Choose Now, Near, Later, or Backlog." };
  }

  const leadParty = input.leadParty.trim().toLowerCase();
  if (!isTrackedLeadParty(leadParty)) {
    return { error: "Choose Adsomnia, BTR, or Harlem Next as the lead party." };
  }

  const jiraUrl = normalizeUrl(input.jiraUrl);
  if (!jiraUrl) {
    return { error: "A valid Jira space URL is required." };
  }

  const resolved = resolveJiraSpaceForLeadParty(jiraUrl, leadParty);
  if (!resolved.ok) {
    return { error: resolved.error };
  }

  let projectMeta: { id: string; key: string; name: string };
  try {
    projectMeta = await getJiraProject(resolved.instance, resolved.projectKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/404|not found|does not exist/i.test(message)) {
      return {
        error: `Jira space ${resolved.projectKey} was not found on the ${getInstanceLabel(resolved.instance)} site.`,
      };
    }
    return {
      error:
        message ||
        `Could not open Jira space ${resolved.projectKey} on the ${getInstanceLabel(resolved.instance)} site.`,
    };
  }

  const driveRaw = input.driveUrl?.trim() ?? "";
  let driveUrl: string | undefined;
  if (driveRaw) {
    const normalized = normalizeUrl(driveRaw);
    if (!normalized) {
      return { error: "Drive must be a valid URL, or left blank." };
    }
    driveUrl = normalized;
  }

  const slackChannel = normalizeSlackChannelName(input.slackChannel ?? "");
  if ((input.slackChannel ?? "").trim() && !slackChannel) {
    return { error: "Slack channel name cannot be only #." };
  }

  const addedAt = new Date();
  const addedAtIso = addedAt.toISOString();

  const [{ nextVal }] = await db
    .select({ nextVal: sql<number>`coalesce(max(${initiatives.id}), 999) + 1` })
    .from(initiatives);

  const ticketId = `WS-${nextVal + 1000}`;
  const setupData = createManualProductionSetupData({
    ticketId,
    title,
    addedAt: addedAtIso,
    jira: {
      boardUrl: resolved.boardUrl,
      workspace: resolved.instance,
      projectKey: projectMeta.key,
      projectName: projectMeta.name,
      projectId: projectMeta.id || undefined,
    },
    driveUrl,
    slackChannelName: slackChannel || undefined,
  });

  const [created] = await db
    .insert(initiatives)
    .values({
      ticketId,
      title,
      description: title,
      submitterId: user.id,
      sponsorId: user.id,
      validationData: { leadProductionParty: leadParty },
      scopingData: { consensusPriority: priority },
      setupData,
      currentStage: "production",
      status: "approved",
      createdAt: addedAt,
      updatedAt: addedAt,
    })
    .returning({ id: initiatives.id });

  await db.insert(activityLog).values({
    initiativeId: created.id,
    userId: user.id,
    action: "production_added_manually",
    details: {
      title,
      by: user.name,
      leadParty,
      consensusPriority: priority,
      jiraKey: projectMeta.key,
    },
  });

  revalidatePath("/pipeline/production");
  revalidatePath("/report");
  revalidatePath(`/workstreams/${created.id}`);
  revalidatePath("/overview");
  revalidatePath("/dashboard");
  return { id: created.id };
}
