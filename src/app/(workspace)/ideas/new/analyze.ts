"use server";

import { db } from "@/db";
import { initiatives } from "@/db/schema";
import { analyzeIdea, type IdeaAnalysisResult, type IdeaInput } from "@/lib/ai";

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
  try {
    const existingInitiatives = await db
      .select({
        id: initiatives.id,
        ticketId: initiatives.ticketId,
        title: initiatives.title,
        problemStatement: initiatives.problemStatement,
        opportunitySolution: initiatives.opportunitySolution,
        expectedImpact: initiatives.expectedImpact,
        targetAudience: initiatives.targetAudience,
        currentStage: initiatives.currentStage,
        status: initiatives.status,
      })
      .from(initiatives);

    const ideaInput: IdeaInput = {
      title: input.title,
      problemStatement: input.problemStatement,
      opportunitySolution: input.opportunitySolution,
      expectedImpact: input.expectedImpact,
      targetAudience: input.targetAudience,
    };

    const analysis = await analyzeIdea(ideaInput, existingInitiatives);

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
