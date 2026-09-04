import { FAST_TRACK, PARTIES, STAGES } from "@/data/workflow";
import { normalizeLeadParty } from "@/lib/production/health";

export const SIMILARITY_THRESHOLD = 0.6;
export const MAX_SIMILARITY_MATCHES = 3;
const CLIP = 280;

export type IdeaInput = {
  title: string;
  problemStatement: string;
  opportunitySolution: string;
  expectedImpact: string;
  targetAudience: string;
};

export type WorkLocation = "funnel" | "production";

export type ExistingWorkItem = {
  id: number;
  ticketId: string;
  title: string;
  location: WorkLocation;
  stageId: string;
  stageLabel: string;
  status: string;
  summary: string;
  leadPartyLabel: string | null;
  sponsorName: string | null;
  submitterName: string | null;
  problemStatement: string | null;
  opportunitySolution: string | null;
  expectedImpact: string | null;
  targetAudience: string | null;
};

export type WorkCatalogRow = {
  id: number;
  ticketId: string;
  title: string;
  description: string | null;
  problemStatement: string | null;
  opportunitySolution: string | null;
  expectedImpact: string | null;
  targetAudience: string | null;
  currentStage: string;
  status: string;
  isFastTrack?: boolean;
  solutionDirection?: string | null;
  jiraProjectName?: string | null;
  leadPartyRaw?: string | null;
  sponsorName: string | null;
  submitterName: string | null;
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
  location: WorkLocation;
  stageId: string;
  stageLabel: string;
  status: string;
  summary: string;
  leadPartyLabel: string | null;
  sponsorName: string | null;
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

export function clipText(value: string | null | undefined, max = CLIP): string {
  const text = value?.replace(/\s+/g, " ").trim() ?? "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function leadPartyLabel(raw: string | null | undefined): string | null {
  const id = normalizeLeadParty(raw);
  if (!id) return null;
  return PARTIES.find((party) => party.id === id)?.label ?? null;
}

export function toExistingWorkItem(row: WorkCatalogRow): ExistingWorkItem {
  const isProduction =
    Boolean(row.isFastTrack) || row.currentStage === "production";
  const stageId = row.isFastTrack ? FAST_TRACK.id : row.currentStage;
  const stageLabel = row.isFastTrack
    ? FAST_TRACK.name
    : (STAGES.find((stage) => stage.id === row.currentStage)?.name ??
      row.currentStage);

  const summary = clipText(
    [
      row.problemStatement,
      row.opportunitySolution,
      row.solutionDirection,
      row.jiraProjectName ? `Jira ${row.jiraProjectName}` : null,
      row.description && row.description !== row.title ? row.description : null,
    ]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(" · ") || row.title,
  );

  return {
    id: row.id,
    ticketId: row.ticketId,
    title: row.title,
    location: isProduction ? "production" : "funnel",
    stageId,
    stageLabel,
    status: row.status,
    summary,
    leadPartyLabel: leadPartyLabel(row.leadPartyRaw),
    sponsorName: row.sponsorName,
    submitterName: row.submitterName,
    problemStatement: row.problemStatement,
    opportunitySolution: row.opportunitySolution,
    expectedImpact: row.expectedImpact,
    targetAudience: row.targetAudience,
  };
}
