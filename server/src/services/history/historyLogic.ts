import { HISTORY_ACTIVITY_LABELS, HISTORY_REPEAT_THRESHOLD } from "../../config/history.js";
import { INTERACTION_TYPES } from "../../config/learningModes.js";
import { VARIANT_LABELS } from "../../config/adaptive.js";
import type { MasteryRow } from "../../types/index.js";
import { bandFor } from "../knowledgeMap/mapGraph.js";
import { masteryLabel, recommendationFrom } from "../teaching/assessmentPlanner.js";

export function resolveHistoryPaging(input: {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  defaultSize: number;
  maxSize: number;
}): { page: number; pageSize: number; offset: number } {
  const pageSize = Math.min(Math.max(input.pageSize ?? input.limit ?? input.defaultSize, 1), input.maxSize);
  if (input.page != null) {
    const page = Math.max(input.page, 1);
    return { page, pageSize, offset: (page - 1) * pageSize };
  }
  const offset = Math.max(input.offset ?? 0, 0);
  return { page: Math.floor(offset / pageSize) + 1, pageSize, offset };
}

export function durationFromTimestamps(startedAt: Date, completedAt: Date | null): number | null {
  if (!completedAt) return null;
  const seconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);
  return seconds > 0 ? seconds : null;
}

export function progressRatio(answeredCount: number, questionCount: number): number | null {
  if (questionCount <= 0) return null;
  return answeredCount / questionCount;
}

export function sessionNeedsReview(input: {
  mastery: Array<Pick<MasteryRow, "attemptsCount" | "masteryScore" | "masteryStatus">>;
  incorrectAnswers: number;
  explanationRequests: number;
  adaptationCount: number;
}): boolean {
  const masteryReview = input.mastery.some((row) => {
    if ((row.attemptsCount ?? 0) === 0) return false;
    return bandFor({
      conceptId: "x",
      conceptName: "x",
      subject: null,
      masteryScore: row.masteryScore,
      masteryStatus: row.masteryStatus,
      attemptsCount: row.attemptsCount,
      correctAnswers: 0,
      incorrectAnswers: 0,
      explanationCount: 0,
      lastInteractionAt: null,
    }).review;
  });
  return (
    masteryReview ||
    input.incorrectAnswers >= HISTORY_REPEAT_THRESHOLD ||
    input.explanationRequests >= HISTORY_REPEAT_THRESHOLD ||
    input.adaptationCount > 0
  );
}

export function activityLabel(type: string, isCorrect?: boolean | null): string | null {
  if (type === INTERACTION_TYPES.answerSubmitted) {
    if (isCorrect === true) return "إجابة صحيحة";
    if (isCorrect === false) return "إجابة خاطئة";
  }
  return HISTORY_ACTIVITY_LABELS[type] ?? null;
}

export function teachingVariantLabel(variant: string | null | undefined): string | null {
  if (!variant) return null;
  return VARIANT_LABELS[variant] ?? null;
}

export function parseLessonVariant(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const strategy = data.strategy;
  if (!strategy || typeof strategy !== "object") return null;
  const variant = (strategy as { variant?: unknown }).variant;
  return typeof variant === "string" ? variant : null;
}

export function parseAnswerCorrectness(data: Record<string, unknown> | null): boolean | null {
  if (!data || typeof data.isCorrect !== "boolean") return null;
  return data.isCorrect;
}

export function conceptSummaryFrom(row: MasteryRow | undefined, conceptId: string, name: string) {
  const band = bandFor(row);
  return {
    conceptId,
    name,
    masteryScore: band.score,
    masteryLabel: row && (row.attemptsCount ?? 0) > 0 ? masteryLabel(row.masteryScore, row.masteryStatus) : band.band,
    status: band.status,
    review: band.review,
  };
}

export function historyRecommendation(concepts: Array<{ name: string; review: boolean }>): string | null {
  return recommendationFrom(concepts.filter((item) => item.review).map((item) => item.name));
}
