import type { DifficultyLevel, QuestionKind } from "../config/teaching.js";

export interface AssessmentLessonState {
  contentHash: string;
  itemIds: string[];
  currentIndex: number;
  active: boolean;
  completed: boolean;
  startedAt: string;
}

export interface AssessmentItemDto {
  questionId: string;
  conceptId: string | null;
  conceptName: string | null;
  status: "pending" | "current" | "correct" | "incorrect" | "partial";
}

export interface AssessmentConceptDto {
  conceptId: string;
  name: string;
  masteryScore: number;
  status: string;
  label: string;
  needsReview: boolean;
}

export interface AssessmentExperienceDto {
  active: boolean;
  emptyMessage: string | null;
  progress: { current: number; total: number; label: string };
  items: AssessmentItemDto[];
  question: {
    id: string;
    type: QuestionKind;
    text: string;
    options: string[] | null;
    difficulty: DifficultyLevel;
  } | null;
  answered: boolean;
  evidence: AssessmentConceptDto[];
  pulseScore: number | null;
  pulseStatus: string | null;
  metrics: {
    correctCount: number;
    answered: number;
    explanationRequests: number;
    averageSeconds: number | null;
  };
  recommendation: string | null;
  summary: {
    message: string;
    correctCount: number;
    answered: number;
    understood: string[];
    review: string[];
  } | null;
}
