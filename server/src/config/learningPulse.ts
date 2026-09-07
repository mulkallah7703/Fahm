export const PULSE_THRESHOLDS = {
  significantSupportMax: 39,
  needsReviewMax: 69,
  goodMax: 84,
} as const;

export type PulseStatus =
  | "needs_significant_support"
  | "needs_review"
  | "good"
  | "strong";

export function pulseStatusFromScore(score: number): PulseStatus {
  if (score <= PULSE_THRESHOLDS.significantSupportMax) {
    return "needs_significant_support";
  }
  if (score <= PULSE_THRESHOLDS.needsReviewMax) {
    return "needs_review";
  }
  if (score <= PULSE_THRESHOLDS.goodMax) {
    return "good";
  }
  return "strong";
}

export const MASTERY_WEIGHTS = {
  accuracyShare: 70,
  recencyShare: 20,
  explanationPenaltyPerRepeat: 4,
  explanationPenaltyCap: 16,
  recencyHalfLifeDays: 14,
  reviewScoreMax: 69,
} as const;

export const ROLE_STUDENT = 1;
export const ROLE_TEACHER = 2;
export const ROLE_ADMIN = 3;

export const LEARNING_MODE_ADAPTIVE = 4;
