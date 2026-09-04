import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  clipText,
  MAX_SIMILARITY_MATCHES,
  SIMILARITY_THRESHOLD,
  type ExistingWorkItem,
  type FastTrackAnalysis,
  type IdeaAnalysisResult,
  type IdeaInput,
  type SimilarityAnalysis,
  type SimilarityMatch,
} from "@/lib/idea-analysis";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/** Fast classifier — keep this cheap; the submitter is waiting on the modal. */
const GEMINI_MODEL = "gemini-3.5-flash";

export type {
  ExistingWorkItem,
  FastTrackAnalysis,
  IdeaAnalysisResult,
  IdeaInput,
  SimilarityAnalysis,
  SimilarityMatch,
} from "@/lib/idea-analysis";

export async function analyzeIdea(
  idea: IdeaInput,
  existingWork: ExistingWorkItem[],
): Promise<IdeaAnalysisResult> {
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: "application/json" },
  });

  const [fastTrackResult, similarityResult] = await Promise.all([
    analyzeFastTrack(model, idea),
    analyzeSimilarity(model, idea, existingWork),
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

type RawSimilarityMatch = {
  id?: number;
  ticketId?: string;
  similarityScore?: number;
  reason?: string;
};

type RawSimilarityAnalysis = {
  hasSimilarInitiatives?: boolean;
  matches?: RawSimilarityMatch[];
};

function findCatalogItem(
  match: RawSimilarityMatch,
  catalog: ExistingWorkItem[],
): ExistingWorkItem | undefined {
  if (typeof match.id === "number") {
    const byId = catalog.find((item) => item.id === match.id);
    if (byId) return byId;
  }
  if (match.ticketId) {
    return catalog.find((item) => item.ticketId === match.ticketId);
  }
  return undefined;
}

function hydrateMatches(
  parsed: RawSimilarityAnalysis,
  catalog: ExistingWorkItem[],
): SimilarityMatch[] {
  const seen = new Set<number>();
  const matches: SimilarityMatch[] = [];

  for (const raw of parsed.matches ?? []) {
    const score = raw.similarityScore;
    if (typeof score !== "number" || score < SIMILARITY_THRESHOLD) continue;
    const item = findCatalogItem(raw, catalog);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    matches.push({
      id: item.id,
      ticketId: item.ticketId,
      title: item.title,
      location: item.location,
      stageId: item.stageId,
      stageLabel: item.stageLabel,
      status: item.status,
      summary: item.summary,
      leadPartyLabel: item.leadPartyLabel,
      sponsorName: item.sponsorName,
      similarityScore: score,
      reason:
        clipText(raw.reason, 200) ||
        "Overlaps in problem, audience, or solution.",
    });
  }

  const ranked = matches.sort((a, b) => b.similarityScore - a.similarityScore);
  if (ranked.length <= MAX_SIMILARITY_MATCHES) return ranked;

  const picked: SimilarityMatch[] = [ranked[0]];
  const otherLane = ranked.find((match) => match.location !== ranked[0].location);
  if (otherLane) picked.push(otherLane);
  for (const match of ranked) {
    if (picked.length >= MAX_SIMILARITY_MATCHES) break;
    if (!picked.includes(match)) picked.push(match);
  }
  return picked;
}

async function analyzeSimilarity(
  model: ReturnType<typeof genAI.getGenerativeModel>,
  idea: IdeaInput,
  existingWork: ExistingWorkItem[],
): Promise<SimilarityAnalysis> {
  if (existingWork.length === 0) {
    return { hasSimilarInitiatives: false, matches: [] };
  }

  const workList = existingWork
    .map((item) =>
      [
        `ID: ${item.id}`,
        `TICKET: ${item.ticketId}`,
        `WHERE: ${item.location === "production" ? "production" : "funnel"}`,
        `STAGE: ${item.stageLabel}`,
        `TITLE: ${item.title}`,
        `SUMMARY: ${item.summary}`,
        `PROBLEM: ${clipText(item.problemStatement) || "N/A"}`,
        `SOLUTION: ${clipText(item.opportunitySolution) || "N/A"}`,
        `IMPACT: ${clipText(item.expectedImpact) || "N/A"}`,
        `AUDIENCE: ${clipText(item.targetAudience, 120) || "N/A"}`,
      ].join(" | "),
    )
    .join("\n\n");

  const prompt = `You are an expert project analyst at Adsomnia. Compare a new initiative to work that is already in the funnel (Initiative through Onboarding) or already in production (including Fast-Track).

Flag a match only when the new submission is likely the same effort, a near-duplicate, or would substantially overlap scope or deliverables. Shared audience alone is not enough. Vague thematic similarity is not enough.

NEW INITIATIVE SUBMISSION:
TITLE: ${idea.title}
PROBLEM STATEMENT: ${idea.problemStatement}
OPPORTUNITY / SOLUTION: ${idea.opportunitySolution}
EXPECTED IMPACT: ${idea.expectedImpact}
TARGET AUDIENCE: ${idea.targetAudience}

EXISTING WORK (funnel + production):
${workList}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "hasSimilarInitiatives": boolean,
  "matches": [
    {
      "id": number,
      "ticketId": "string",
      "similarityScore": number between 0 and 1,
      "reason": "one sentence on what overlaps"
    }
  ]
}

Use only IDs from the list above. Only include matches with similarityScore >= ${SIMILARITY_THRESHOLD}. Return an empty matches array if nothing is a real overlap.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { hasSimilarInitiatives: false, matches: [] };
    }
    const parsed = JSON.parse(jsonMatch[0]) as RawSimilarityAnalysis;
    const matches = hydrateMatches(parsed, existingWork);
    return {
      hasSimilarInitiatives: matches.length > 0,
      matches,
    };
  } catch {
    return { hasSimilarInitiatives: false, matches: [] };
  }
}
