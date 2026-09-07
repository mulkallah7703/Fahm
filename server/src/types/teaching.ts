import type { AdaptiveExperienceDto, AdaptiveLessonState } from "./adaptive.js";
import type { AssessmentExperienceDto, AssessmentLessonState } from "./assessment.js";
import type { BlindExperienceDto, BlindLessonState } from "./blind.js";
import type { DyslexiaExperienceDto, DyslexiaLessonState } from "./dyslexia.js";
import type { LearningModeCode, LearningModeConfig } from "../config/learningModes.js";
import type {
  DifficultyLevel,
  QuestionKind,
  StepStatus,
  StepType,
  TeachingVariant,
} from "../config/teaching.js";

export interface TeachingStrategyState {
  mode: LearningModeCode;
  variant: TeachingVariant;
  explanationStyle: string;
  explanationLength: string;
  chunkSize: number;
  questionFrequency: string;
  interactionType: string;
  difficulty: DifficultyLevel;
  visualSupport: boolean;
  audioSupport: boolean;
}

export interface LessonStepState {
  id: string;
  type: StepType;
  title: string;
  status: StepStatus;
  conceptId: string | null;
  questionId: string | null;
}

export interface TeachingKeyPoint {
  text: string;
  source: string | null;
}

export interface TeachingTerm {
  conceptId: string;
  name: string;
  definition: string;
}

export interface TeachingImportantTerm {
  term: string;
  meaning: string;
}

export interface TeachingContent {
  title: string;
  mainIdea: string;
  hook?: string | null;
  coreIdea?: string | null;
  keyPoints: TeachingKeyPoint[];
  steps?: string[];
  terms: TeachingTerm[];
  importantTerms?: TeachingImportantTerm[];
  visualDescription: string | null;
  example: string | null;
  relationship?: string | null;
  whyItMatters?: string | null;
  simplifiedExplanation: string | null;
  speechText: string;
  unreadable?: boolean;
  qualityScore?: number;
  teachingVersion?: number;
}

export interface MaterialUnderstandingSnapshot {
  pageTitle: string;
  mainIdea: string;
  cleanText: string;
  sourceQuality: "high" | "medium" | "low";
  needsReanalysis?: boolean;
  concepts: { name: string; definition: string; evidence: string; importance: "core" | "supporting" }[];
  relationships: { from: string; relationship: string; to: string; evidence: string }[];
  examples: { text: string; evidence: string }[];
  visuals: { type: string; description: string; evidence: string }[];
}

export interface LessonState {
  version: number;
  currentStepIndex: number;
  difficulty: DifficultyLevel;
  strategy: TeachingStrategyState;
  adaptiveEnabled: boolean;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  hintsUsed: number;
  explanationRequests: number;
  examplesRequested: number;
  lastHintQuestionId: string | null;
  completed: boolean;
  content: TeachingContent;
  teachingCacheKey?: string;
  materialUnderstanding?: MaterialUnderstandingSnapshot | null;
  steps: LessonStepState[];
  blind?: BlindLessonState | null;
  dyslexia?: DyslexiaLessonState | null;
  adaptive?: AdaptiveLessonState | null;
  assessment?: AssessmentLessonState | null;
}

export interface PublicQuestion {
  id: string;
  type: QuestionKind;
  text: string;
  options: string[] | null;
  difficulty: DifficultyLevel;
}

export interface QuestionSecret {
  correct: string;
  options?: string[];
  aliases?: string[];
}

export interface LessonSessionDto {
  session: {
    id: string;
    status: string;
    completed: boolean;
  };
  material: {
    id: string;
    title: string;
    pageNumber: number;
    hasFile: boolean;
    subject: string | null;
  };
  mode: {
    code: LearningModeCode;
    name: string;
    englishName: string;
  };
  strategy: TeachingStrategyState;
  config: LearningModeConfig;
  progress: {
    current: number;
    total: number;
    label: string;
  };
  steps: LessonStepState[];
  currentStep: LessonStepState;
  content: TeachingContent;
  question: PublicQuestion | null;
  feedback: LessonFeedback | null;
  adaptationMessage: string | null;
  completion: LessonCompletion | null;
  blind: BlindExperienceDto | null;
  dyslexia: DyslexiaExperienceDto | null;
  adaptive: AdaptiveExperienceDto | null;
  assessment: AssessmentExperienceDto | null;
  teachingPlan: {
    mode: LearningModeCode;
    variant: TeachingVariant;
    label: string;
    objective: string;
    sequence: { id: string; title: string; kind: string; conceptId: string | null }[];
    questionStyle: string;
    controls: string[];
    teachOneConceptAtATime: boolean;
    audioFirst: boolean;
    readingFirst: boolean;
    observesEvidence: boolean;
    visualPolicy: string;
    sourceEvidence: string[];
    missing: string[];
    concepts: {
      conceptId: string;
      name: string;
      what: string;
      why: string | null;
      how: string | null;
      example: string | null;
      evidence: string;
    }[];
  };
}

export interface LessonFeedback {
  type: "correct" | "incorrect" | "partial";
  message: string;
  explanation: string | null;
  usedHint: boolean;
}

export interface LessonCompletion {
  message: string;
  pulse: { previous: number | null; current: number | null };
  concepts: { name: string; masteryScore: number; needsReview: boolean }[];
  reviewNeeded: boolean;
}

export interface AdaptationDecision {
  changed: boolean;
  previousVariant: TeachingVariant;
  nextVariant: TeachingVariant;
  previousDifficulty: DifficultyLevel;
  nextDifficulty: DifficultyLevel;
  reasonCode: string;
  studentMessage: string;
  explainWhy: string;
}
