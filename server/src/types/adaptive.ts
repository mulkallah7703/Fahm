import type { TeachingVariant } from "../config/teaching.js";

export interface AdaptiveLessonState {
  previousExplanation: string | null;
  previousVariant: TeachingVariant | null;
  lastReasonCode: string | null;
  lastInsight: string | null;
  lastChangedAt: string | null;
  adaptationCount: number;
  lastFeedback: "understood" | "not_understood" | null;
  lastFingerprint: string | null;
  cached: Record<string, string>;
}

export interface AdaptiveEvidenceDto {
  explanationRequests: number;
  simplifyRequests: number;
  exampleRequests: number;
  incorrectAnswers: number;
  correctAnswers: number;
  replayCount: number;
  hintCount: number;
  pauseSeconds: number | null;
  adaptationCount: number;
}

export interface AdaptiveStrategyStepDto {
  id: string;
  label: string;
  variant: TeachingVariant | "visual";
  state: "past" | "current" | "next" | "unavailable";
  note: string | null;
}

export interface AdaptiveHistoryItemDto {
  reason: string;
  fromLabel: string;
  toLabel: string;
}

export interface AdaptiveExperienceDto {
  currentVariant: TeachingVariant;
  currentLabel: string;
  currentBlurb: string;
  insight: string | null;
  emptyMessage: string | null;
  reasonLabel: string | null;
  actionLabel: string | null;
  evidence: AdaptiveEvidenceDto;
  strategies: AdaptiveStrategyStepDto[];
  previousExplanation: string | null;
  currentExplanation: string;
  visualAvailable: boolean;
  visualDescription: string | null;
  history: AdaptiveHistoryItemDto[];
  canTryAnother: boolean;
  limitReached: boolean;
  nextAction: "question" | "continue" | "listen";
  lastFeedback: "understood" | "not_understood" | null;
}
