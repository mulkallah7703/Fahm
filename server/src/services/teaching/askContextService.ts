import { MASTERY_WEIGHTS } from "../../config/learningPulse.js";
import { isLearningModeCode, type LearningModeCode } from "../../config/learningModes.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { MasteryRow } from "../../types/index.js";
import type { AskBuiltContext } from "../../types/askFahm.js";
import type { LessonState } from "../../types/teaching.js";
import { isReliableText } from "./contentQualityService.js";
import { splitSentences, tokensOf } from "./arabicNormalize.js";

export function buildAskContext(input: {
  analysis: AnalysisDto;
  state: LessonState | null;
  mastery: MasteryRow[];
  question: string | null;
}): AskBuiltContext {
  const { analysis, state, mastery, question } = input;
  const pageText = cleanAskSource(analysis, state);
  const relevant = relevantParagraphs(pageText, question);
  const visualDescription =
    state?.content.visualDescription ??
    analysis.vision?.visualDescription ??
    null;
  const hasDiagram = Boolean(
    (state?.materialUnderstanding?.visuals.length ?? 0) > 0 ||
      analysis.vision?.visualDescription ||
      (analysis.vision?.elements?.length ?? 0) > 0 ||
      analysis.structure.sections.some((item) => item.type === "diagram" || item.type === "image"),
  );
  const tableDescription = analysis.vision?.tables?.[0]
    ? analysis.vision.tables[0].title ?? "جدول في الصفحة"
    : analysis.structure.sections.find((item) => item.type === "table")?.description ?? null;
  const reviewNames = mastery
    .filter(
      (row) =>
        analysis.concepts.some((item) => item.id === row.conceptId) &&
        row.masteryScore <= MASTERY_WEIGHTS.reviewScoreMax,
    )
    .map((row) => row.conceptName);
  const recentIncorrect = mastery
    .filter((row) => analysis.concepts.some((item) => item.id === row.conceptId) && (row.incorrectAnswers ?? 0) > 0)
    .map((row) => row.conceptName);
  const mode: LearningModeCode = isLearningModeCode(state?.strategy.mode ?? "")
    ? (state?.strategy.mode as LearningModeCode)
    : isLearningModeCode(analysis.session.modeCode ?? "")
    ? (analysis.session.modeCode as LearningModeCode)
    : "adaptive";
  const conceptNames =
    state?.materialUnderstanding?.concepts.map((item) => item.name) ??
    state?.content.terms.map((item) => item.name) ??
    analysis.concepts.map((item) => item.name);

  return {
    lesson: {
      title: state?.content.title || analysis.material.title,
      pageNumber: analysis.page.pageNumber,
    },
    sourceText: {
      title: state?.content.title || analysis.material.title,
      mainIdea: state?.content.coreIdea || state?.content.mainIdea || "",
      keyPoints: (state?.content.steps?.length ? state.content.steps : (state?.content.keyPoints ?? []).map((item) => item.text)),
      relevantParagraphs: relevant,
    },
    concepts: (state?.materialUnderstanding?.concepts.length
      ? state.materialUnderstanding.concepts.map((item, index) => ({
          id: analysis.concepts.find((row) => row.name === item.name)?.id ?? analysis.concepts[index]?.id ?? item.name,
          name: item.name,
          description: item.definition,
          importanceScore: item.importance === "core" ? 90 : 60,
        }))
      : analysis.concepts.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          importanceScore: item.importanceScore,
        }))).filter((item) => conceptNames.some((name) => name === item.name || name.includes(item.name))),
    visualContext: {
      available: hasDiagram && Boolean(visualDescription),
      description: hasDiagram ? visualDescription : null,
    },
    tableContext: {
      available: Boolean(tableDescription || analysis.vision?.tables?.length),
      description: tableDescription,
    },
    teachingState: {
      mode,
      variant: state?.strategy.variant ?? null,
      currentStep: state?.steps[state.currentStepIndex]?.title ?? null,
      simplified: state?.content.simplifiedExplanation ?? null,
      example: state?.content.example ?? null,
    },
    learnerContext: {
      reviewNames,
      recentIncorrect,
    },
    pageText,
  };
}

function cleanAskSource(analysis: AnalysisDto, state: LessonState | null): string {
  const fromUnderstanding = state?.materialUnderstanding?.cleanText ?? "";
  if (isReliableText(fromUnderstanding)) return fromUnderstanding;
  const fromContent = [state?.content.coreIdea, state?.content.mainIdea, ...(state?.content.steps ?? [])]
    .filter((item): item is string => Boolean(item && isReliableText(item)))
    .join(" ");
  if (fromContent) return fromContent;
  const ocr = analysis.ocr?.text ?? "";
  return isReliableText(ocr) ? ocr : "";
}

function relevantParagraphs(pageText: string, question: string | null): string[] {
  const sentences = splitSentences(pageText);
  if (!question) return sentences.slice(0, 3);
  const qTokens = tokensOf(question);
  const matched = sentences.filter((sentence) => {
    const tokens = tokensOf(sentence);
    return qTokens.some((token) => tokens.includes(token));
  });
  return (matched.length ? matched : sentences).slice(0, 4);
}
