import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export type IdeaInput = {
  title: string;
  problemStatement: string;
  opportunitySolution: string;
  expectedImpact: string;
  targetAudience: string;
};

export type ExistingInitiative = {
  id: number;
  ticketId: string;
  title: string;
  problemStatement: string | null;
  opportunitySolution: string | null;
  expectedImpact: string | null;
  targetAudience: string | null;
  currentStage: string;
  status: string;
};

export type FastTrackAnalysis = {
  isFastTrack: boolean;
  confidence: number;
  reasoning: string;
};

export type SimilarityMatch = {
  id: number;
  ticketId: string;
  title: string;
  similarityScore: number;
  reason: string;
};

export type SimilarityAnalysis = {
  hasSimilarInitiatives: boolean;
  matches: SimilarityMatch[];
};

export type IdeaAnalysisResult = {
  fastTrack: FastTrackAnalysis;
  similarity: SimilarityAnalysis;
};

export async function analyzeIdea(
  idea: IdeaInput,
  existingInitiatives: ExistingInitiative[],
): Promise<IdeaAnalysisResult> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const [fastTrackResult, similarityResult] = await Promise.all([
    analyzeFastTrack(model, idea),
    analyzeSimilarity(model, idea, existingInitiatives),
  ]);

  return {
    fastTrack: fastTrackResult,
    similarity: similarityResult,
  };
}

async function analyzeFastTrack(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  idea: IdeaInput,
): Promise<FastTrackAnalysis> {
  const prompt = `You are an expert project analyst at Adsomnia, a digital marketing agency. Your task is to determine if a submitted initiative should be handled as a "Fast-Track" request.

A Fast-Track request is a quick task that can be completed in approximately 4 hours or less. These are typically:
- Simple configuration changes
- Minor bug fixes
- Small content updates
- Quick integrations
- One-off data exports or reports
- Simple automations with existing tools

A regular initiative requires more planning, multiple stakeholders, or significant development effort.

Analyze this initiative submission:

TITLE: ${idea.title}

PROBLEM STATEMENT: ${idea.problemStatement}

OPPORTUNITY / SOLUTION: ${idea.opportunitySolution}

EXPECTED IMPACT: ${idea.expectedImpact}

TARGET AUDIENCE: ${idea.targetAudience}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "isFastTrack": boolean,
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation in 1-2 sentences"
}

Only set isFastTrack to true if you are highly confident (0.85+) this is a quick task. When in doubt, lean toward false.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { isFastTrack: false, confidence: 0, reasoning: "Unable to analyze" };
    }
    const parsed = JSON.parse(jsonMatch[0]) as FastTrackAnalysis;
    return {
      isFastTrack: parsed.isFastTrack && parsed.confidence >= 0.85,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    };
  } catch {
    return { isFastTrack: false, confidence: 0, reasoning: "Analysis failed" };
  }
}

async function analyzeSimilarity(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  idea: IdeaInput,
  existingInitiatives: ExistingInitiative[],
): Promise<SimilarityAnalysis> {
  if (existingInitiatives.length === 0) {
    return { hasSimilarInitiatives: false, matches: [] };
  }

  const activeInitiatives = existingInitiatives.filter(
    (i) => i.status !== "rejected",
  );

  if (activeInitiatives.length === 0) {
    return { hasSimilarInitiatives: false, matches: [] };
  }

  const initiativesList = activeInitiatives
    .map(
      (i) =>
        `ID: ${i.id} | TICKET: ${i.ticketId} | TITLE: ${i.title} | PROBLEM: ${i.problemStatement ?? "N/A"} | OPPORTUNITY: ${i.opportunitySolution ?? "N/A"} | STAGE: ${i.currentStage} | STATUS: ${i.status}`,
    )
    .join("\n\n");

  const prompt = `You are an expert project analyst at Adsomnia. Your task is to identify if a new initiative submission is similar to or duplicates any existing initiatives.

NEW INITIATIVE SUBMISSION:
TITLE: ${idea.title}
PROBLEM STATEMENT: ${idea.problemStatement}
OPPORTUNITY / SOLUTION: ${idea.opportunitySolution}
EXPECTED IMPACT: ${idea.expectedImpact}
TARGET AUDIENCE: ${idea.targetAudience}

EXISTING INITIATIVES:
${initiativesList}

Identify any existing initiatives that:
- Address the same problem or opportunity
- Target the same audience with similar solutions
- Would overlap significantly in scope or deliverables
- Are essentially the same request worded differently

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "hasSimilarInitiatives": boolean,
  "matches": [
    {
      "id": number,
      "ticketId": "string",
      "title": "string",
      "similarityScore": number between 0 and 1,
      "reason": "brief explanation of why this is similar"
    }
  ]
}

Only include matches with similarityScore >= 0.6. Return empty matches array if no significant similarities found.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { hasSimilarInitiatives: false, matches: [] };
    }
    const parsed = JSON.parse(jsonMatch[0]) as SimilarityAnalysis;
    const validMatches = parsed.matches.filter((m) => m.similarityScore >= 0.6);
    return {
      hasSimilarInitiatives: validMatches.length > 0,
      matches: validMatches,
    };
  } catch {
    return { hasSimilarInitiatives: false, matches: [] };
  }
}
