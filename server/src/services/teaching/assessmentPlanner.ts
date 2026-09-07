import { createHash } from "node:crypto";
import { ASSESSMENT_MAX_QUESTIONS } from "../../config/assessment.js";
import { MASTERY_WEIGHTS } from "../../config/learningPulse.js";
import type { DifficultyLevel } from "../../config/teaching.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { MasteryRow } from "../../types/index.js";
import type { LessonState } from "../../types/teaching.js";
import { buildConceptQuestion, buildGroundedQuestion, type BuiltQuestion } from "./questionFactory.js";

export function assessmentHash(analysis: AnalysisDto, difficulty: DifficultyLevel): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        ocr: analysis.ocr?.text ?? "",
        concepts: analysis.concepts.map((item) => [item.id, item.name, item.description]),
        difficulty,
      }),
    )
    .digest("hex")
    .slice(0, 20);
}

export function planAssessmentQuestions(
  analysis: AnalysisDto,
  state: LessonState,
  mastery: MasteryRow[],
): BuiltQuestion[] {
  const concepts = [...analysis.concepts];
  if (concepts.length === 0) {
    const fallback = buildGroundedQuestion(analysis, state.difficulty);
    return fallback ? [fallback] : [];
  }

  const byId = new Map(mastery.map((row) => [row.conceptId, row]));
  const adaptedId = state.adaptive?.previousVariant ? state.steps[state.currentStepIndex]?.conceptId : state.steps[state.currentStepIndex]?.conceptId;
  const ranked = [...concepts].sort((left, right) => {
    const leftScore = priorityScore(left.id, byId.get(left.id), left.importanceScore, adaptedId);
    const rightScore = priorityScore(right.id, byId.get(right.id), right.importanceScore, adaptedId);
    return rightScore - leftScore;
  });

  const selected = ranked.slice(0, Math.min(ASSESSMENT_MAX_QUESTIONS, ranked.length));
  const built: BuiltQuestion[] = [];
  const seen = new Set<string>();
  for (const concept of selected) {
    const row = byId.get(concept.id);
    const difficulty = difficultyFor(row?.masteryScore ?? null, state.difficulty);
    const siblings = concepts.filter((item) => item.id !== concept.id);
    const question = buildConceptQuestion(analysis, concept, siblings, difficulty);
    if (seen.has(question.text)) continue;
    seen.add(question.text);
    built.push(question);
  }
  return built;
}

function priorityScore(
  conceptId: string,
  row: MasteryRow | undefined,
  importance: number,
  adaptedId: string | null | undefined,
): number {
  let score = importance / 100;
  if (adaptedId && conceptId === adaptedId) score += 4;
  if (!row) score += 2;
  else if (row.masteryScore <= MASTERY_WEIGHTS.reviewScoreMax) score += 3 + (row.incorrectAnswers ?? 0);
  else score -= 1;
  return score;
}

export function difficultyFor(masteryScore: number | null, current: DifficultyLevel): DifficultyLevel {
  if (masteryScore === null) return current === "hard" ? "medium" : current === "medium" ? "easy" : "easy";
  if (masteryScore <= 39) return "easy";
  if (masteryScore <= MASTERY_WEIGHTS.reviewScoreMax) return current === "hard" ? "medium" : current;
  return current === "easy" ? "medium" : "hard";
}

export function masteryLabel(score: number, status: string): string {
  if (status === "strong" || score >= 85) return "مفهوم";
  if (status === "good" || score >= 70) return "فهم جيد";
  if (score <= 39) return "شرح إضافي";
  return "يحتاج مراجعة";
}

export function recommendationFrom(reviewNames: string[]): string | null {
  if (reviewNames.length === 0) return null;
  if (reviewNames.length === 1) {
    return `ننصحك بمراجعة «${reviewNames[0]}» قبل الانتقال للدرس التالي.`;
  }
  return `بعض الأفكار أصبحت واضحة، وهناك أفكار تحتاج مراجعة: ${reviewNames.join("، ")}.`;
}

export function summaryMessage(correct: number, answered: number, reviewCount: number): string {
  if (answered === 0) return "لنرى ما الذي أصبح واضحًا لديك.";
  if (reviewCount === 0 && correct === answered) return "أحسنت، أصبحت جاهزًا للانتقال.";
  if (reviewCount === 0) return "أحسنت، أكملت اختبار الفهم.";
  if (reviewCount === 1) return "بعض الأفكار أصبحت واضحة، وهناك فكرة واحدة تحتاج مراجعة.";
  return "لنراجع الأفكار التي ما زالت تحتاج توضيحًا قبل الانتقال.";
}
