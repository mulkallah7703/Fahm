import type { LearningModeCode } from "../../config/learningModes.js";
import type { TeachingVariant } from "../../config/teaching.js";
import type { LessonState } from "../../types/teaching.js";

export interface StudentTeachingProfile {
  mode: LearningModeCode;
  variant: TeachingVariant;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  explanationRequests: number;
  hintsUsed: number;
  examplesRequested: number;
  replays: number;
  mastery: number | null;
  previousConceptPerformance: { name: string; masteryScore: number }[];
  readingPreferences: { fontSize: number | null };
  speechRate: number | null;
  fontSize: number | null;
}

export function buildStudentTeachingProfile(input: {
  state: LessonState | null;
  mode: LearningModeCode;
  variant: TeachingVariant;
  speechRate?: number | null;
  fontSize?: number | null;
  mastery?: number | null;
  previousConceptPerformance?: { name: string; masteryScore: number }[];
  replays?: number;
}): StudentTeachingProfile {
  return {
    mode: input.mode,
    variant: input.variant,
    consecutiveCorrect: input.state?.consecutiveCorrect ?? 0,
    consecutiveIncorrect: input.state?.consecutiveIncorrect ?? 0,
    explanationRequests: input.state?.explanationRequests ?? 0,
    hintsUsed: input.state?.hintsUsed ?? 0,
    examplesRequested: input.state?.examplesRequested ?? 0,
    replays: input.replays ?? 0,
    mastery: input.mastery ?? null,
    previousConceptPerformance: input.previousConceptPerformance ?? [],
    readingPreferences: { fontSize: input.fontSize ?? null },
    speechRate: input.speechRate ?? null,
    fontSize: input.fontSize ?? null,
  };
}
