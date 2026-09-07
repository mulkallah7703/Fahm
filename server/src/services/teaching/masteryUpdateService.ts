import { pulseStatusFromScore } from "../../config/learningPulse.js";
import type { MasteryRow } from "../../types/index.js";
import { computeConceptScore } from "../masteryCalculationService.js";

export function applyAnswerToMastery(
  current: MasteryRow | null,
  input: {
    conceptId: string;
    conceptName: string;
    subject: string | null;
    correct: boolean;
    usedHint: boolean;
    explanationRequested: boolean;
  },
): MasteryRow {
  const next: MasteryRow = current
    ? { ...current }
    : {
        conceptId: input.conceptId,
        conceptName: input.conceptName,
        subject: input.subject,
        masteryScore: 0,
        masteryStatus: "unknown",
        attemptsCount: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        explanationCount: 0,
        lastInteractionAt: null,
      };

  next.attemptsCount += 1;
  if (input.correct) next.correctAnswers += 1;
  else next.incorrectAnswers += 1;
  if (input.usedHint || input.explanationRequested) next.explanationCount += 1;
  next.lastInteractionAt = new Date();
  next.masteryScore = computeConceptScore(next);
  next.masteryStatus = statusFromScore(next.masteryScore);
  return next;
}

function statusFromScore(score: number): string {
  const status = pulseStatusFromScore(score);
  if (status === "needs_significant_support" || status === "needs_review") return "needs_review";
  if (status === "strong") return "strong";
  return "good";
}
