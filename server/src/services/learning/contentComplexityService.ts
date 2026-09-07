import {
  COMPLEXITY_WEIGHTS,
  type LearningModeCode,
} from "../../config/learningModes.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { PublicComplexity } from "../../types/learning.js";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function ratio(value: number, norm: number): number {
  if (norm <= 0) return 0;
  return clamp01(value / norm);
}

export function scoreContentComplexity(input: {
  conceptCount: number;
  relationshipCount: number;
  wordCount: number;
  sectionCount: number;
  hasDiagram: boolean;
  hasTable: boolean;
  analysisReady: boolean;
}): PublicComplexity {
  if (!input.analysisReady && input.wordCount === 0 && input.conceptCount === 0) {
    return {
      score: 0,
      level: "unknown",
      signals: {
        conceptCount: input.conceptCount,
        relationshipCount: input.relationshipCount,
        wordCount: input.wordCount,
        hasDiagram: input.hasDiagram,
        hasTable: input.hasTable,
        sectionCount: input.sectionCount,
        analysisReady: false,
      },
    };
  }

  const raw =
    ratio(input.conceptCount, COMPLEXITY_WEIGHTS.conceptNorm) * COMPLEXITY_WEIGHTS.conceptShare +
    ratio(input.relationshipCount, COMPLEXITY_WEIGHTS.relationshipNorm) *
      COMPLEXITY_WEIGHTS.relationshipShare +
    ratio(input.wordCount, COMPLEXITY_WEIGHTS.wordNorm) * COMPLEXITY_WEIGHTS.wordShare +
    ratio(input.sectionCount, COMPLEXITY_WEIGHTS.sectionNorm) * COMPLEXITY_WEIGHTS.sectionShare +
    (input.hasDiagram ? COMPLEXITY_WEIGHTS.diagramBoost : 0) +
    (input.hasTable ? COMPLEXITY_WEIGHTS.tableBoost : 0);

  const score = Math.round(clamp01(raw) * 100) / 100;
  const level =
    score <= COMPLEXITY_WEIGHTS.lowMax
      ? "low"
      : score <= COMPLEXITY_WEIGHTS.mediumMax
        ? "medium"
        : "high";

  return {
    score,
    level,
    signals: {
      conceptCount: input.conceptCount,
      relationshipCount: input.relationshipCount,
      wordCount: input.wordCount,
      hasDiagram: input.hasDiagram,
      hasTable: input.hasTable,
      sectionCount: input.sectionCount,
      analysisReady: input.analysisReady,
    },
  };
}

export const contentComplexityService = {
  fromAnalysis(analysis: AnalysisDto): PublicComplexity {
    const visualTypes = analysis.vision?.elements.map((item) => item.type.toLowerCase()) ?? [];
    const hasDiagram =
      analysis.structure.sections.some(
        (section) => section.type === "diagram" || section.type === "image",
      ) || visualTypes.some((type) => /diagram|image|رسم|شكل/.test(type));
    const hasTable =
      (analysis.vision?.tables.length ?? 0) > 0 ||
      analysis.structure.sections.some((section) => section.type === "table");

    return scoreContentComplexity({
      conceptCount: analysis.concepts.length,
      relationshipCount: analysis.relationships.length,
      wordCount: analysis.wordCount,
      sectionCount: analysis.structure.sections.length,
      hasDiagram,
      hasTable,
      analysisReady: analysis.status === "completed",
    });
  },
};

export function explicitPreferenceFromAccess(input: {
  blindSupport: boolean;
  dyslexiaSupport: boolean;
  simplifiedLanguage: boolean;
  focusSupport: boolean;
  audioSupport: boolean;
}): LearningModeCode | null {
  if (input.blindSupport) return "blind";
  if (input.dyslexiaSupport || input.simplifiedLanguage) return "dyslexia";
  if (input.focusSupport) return "focus";
  if (input.audioSupport) return "blind";
  return null;
}
