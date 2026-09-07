import {
  MASTERY_WEIGHTS,
  pulseStatusFromScore,
  type PulseStatus,
} from "../config/learningPulse.js";
import type { MasteryRow } from "../types/index.js";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function daysBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export function recencyWeight(lastInteractionAt: Date | null, now = new Date()): number {
  if (!lastInteractionAt) return 1;
  const days = daysBetween(lastInteractionAt, now);
  return Math.exp(-days / MASTERY_WEIGHTS.recencyHalfLifeDays);
}

export function computeConceptScore(row: MasteryRow, now = new Date()): number {
  const attempts = Math.max(row.attemptsCount, row.correctAnswers + row.incorrectAnswers, 1);
  const accuracy = (row.correctAnswers / attempts) * MASTERY_WEIGHTS.accuracyShare;
  const recency = recencyWeight(row.lastInteractionAt, now) * MASTERY_WEIGHTS.recencyShare;
  const penalty = Math.min(
    row.explanationCount * MASTERY_WEIGHTS.explanationPenaltyPerRepeat,
    MASTERY_WEIGHTS.explanationPenaltyCap,
  );
  return clamp(Math.round(accuracy + recency + (10 - penalty)), 0, 100);
}

export function computeOverallPulse(
  rows: MasteryRow[],
  now = new Date(),
): { score: number; status: PulseStatus } | null {
  if (rows.length === 0) return null;

  let weighted = 0;
  let weightSum = 0;

  for (const row of rows) {
    const stored = Number(row.masteryScore);
    const score = Number.isFinite(stored) ? clamp(stored, 0, 100) : computeConceptScore(row, now);
    const weight = 1 + 0.5 * recencyWeight(row.lastInteractionAt, now);
    weighted += score * weight;
    weightSum += weight;
  }

  const score = Math.round(weighted / weightSum);
  return { score, status: pulseStatusFromScore(score) };
}
