"use server";

import { and, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { initiatives, users } from "@/db/schema";
import { analyzeIdea } from "@/lib/ai";
import {
  toExistingWorkItem,
  type IdeaAnalysisResult,
  type IdeaInput,
  type WorkCatalogRow,
} from "@/lib/idea-analysis";
import { getCurrentUser } from "@/lib/session";
import type { SetupData, ValidationData } from "@/lib/validation-data";

export type AnalyzeIdeaInput = {
  title: string;
  problemStatement: string;
  opportunitySolution: string;
  expectedImpact: string;
  targetAudience: string;
};

export type AnalyzeIdeaResult = {
  success: boolean;
  analysis?: IdeaAnalysisResult;
  error?: string;
};

export async function analyzeIdeaSubmission(
  input: AnalyzeIdeaInput,
): Promise<AnalyzeIdeaResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be logged in." };
  }

  try {
    const existingWork = await loadActiveWorkCatalog();

    const ideaInput: IdeaInput = {
      title: input.title,
      problemStatement: input.problemStatement,
      opportunitySolution: input.opportunitySolution,
      expectedImpact: input.expectedImpact,
      targetAudience: input.targetAudience,
    };

    const analysis = await analyzeIdea(ideaInput, existingWork);

    return {
      success: true,
      analysis,
    };
  } catch (error) {
    console.error("Initiative analysis failed:", error);
    return {
      success: false,
      error: "Failed to analyze initiative. Proceeding without AI validation.",
    };
  }
}

async function loadActiveWorkCatalog() {
  const rows = await db
    .select({
      id: initiatives.id,
      ticketId: initiatives.ticketId,
      title: initiatives.title,
      description: initiatives.description,
      problemStatement: initiatives.problemStatement,
      opportunitySolution: initiatives.opportunitySolution,
      expectedImpact: initiatives.expectedImpact,
      targetAudience: initiatives.targetAudience,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
      validationData: initiatives.validationData,
      setupData: initiatives.setupData,
      submitterId: initiatives.submitterId,
      sponsorId: initiatives.sponsorId,
    })
    .from(initiatives)
    .where(
      and(isNull(initiatives.archivedAt), ne(initiatives.status, "rejected")),
    );

  const userIds = [
    ...new Set(rows.flatMap((row) => [row.submitterId, row.sponsorId])),
  ];
  const userRows =
    userIds.length === 0
      ? []
      : await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, userIds));
  const userMap = new Map(userRows.map((row) => [row.id, row.name]));

  return rows.map((row) => {
    const validation = (row.validationData as ValidationData | null) ?? null;
    const setup = (row.setupData as SetupData | null) ?? null;
    const catalogRow: WorkCatalogRow = {
      id: row.id,
      ticketId: row.ticketId,
      title: row.title,
      description: row.description,
      problemStatement: row.problemStatement,
      opportunitySolution: row.opportunitySolution,
      expectedImpact: row.expectedImpact,
      targetAudience: row.targetAudience,
      currentStage: row.currentStage,
      status: row.status,
      solutionDirection: validation?.solutionDirection ?? null,
      jiraProjectName: setup?.jira?.projectName ?? null,
      leadPartyRaw: validation?.leadProductionParty ?? null,
      sponsorName: userMap.get(row.sponsorId) ?? null,
      submitterName: userMap.get(row.submitterId) ?? null,
    };
    return toExistingWorkItem(catalogRow);
  });
}
