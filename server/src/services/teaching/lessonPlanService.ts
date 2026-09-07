import { randomUUID } from "node:crypto";
import {
  LEARNING_MODE_CONFIGS,
  MODE_PRESENTATION,
  type LearningModeCode,
} from "../../config/learningModes.js";
import { STEP_TITLES, type StepType, type TeachingVariant } from "../../config/teaching.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { LessonState, LessonStepState, TeachingStrategyState } from "../../types/teaching.js";
import { initialVariant } from "./adaptiveTeachingService.js";
import { TEACHING_CONTENT_VERSION } from "./contentQualityService.js";
import { buildLessonModel } from "./lessonModel.js";
import { buildTeachingContent } from "./teachingContentService.js";
import { buildTeachingPlan } from "./teachingPlan.js";

export function buildLessonPlan(input: {
  analysis: AnalysisDto;
  mode: LearningModeCode;
  adaptiveEnabled: boolean;
}): LessonState {
  const config = LEARNING_MODE_CONFIGS[input.mode];
  const variant = initialVariant(input.mode);
  const model = buildLessonModel(input.analysis);
  const plan = buildTeachingPlan({ analysis: input.analysis, mode: input.mode, variant, model });
  const steps = stepsFromPlan(input.mode, plan, input.analysis);

  return {
    version: TEACHING_CONTENT_VERSION,
    currentStepIndex: 0,
    difficulty: "easy",
    strategy: strategyFrom(input.mode, variant),
    adaptiveEnabled: input.adaptiveEnabled,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    hintsUsed: 0,
    explanationRequests: 0,
    examplesRequested: 0,
    lastHintQuestionId: null,
    completed: false,
    content: buildTeachingContent(input.analysis, config, variant),
    steps,
  };
}

export function strategyFrom(mode: LearningModeCode, variant: TeachingVariant): TeachingStrategyState {
  const config = LEARNING_MODE_CONFIGS[mode];
  return {
    mode,
    variant,
    explanationStyle: variant === "simplified" ? "simplified" : config.explanationStyle,
    explanationLength: variant === "simplified" ? "short" : config.explanationLength,
    chunkSize: config.maxConceptsPerStep,
    questionFrequency: config.interactionFrequency,
    interactionType: config.interactionStyle,
    difficulty: "easy",
    visualSupport: config.describeVisuals,
    audioSupport: config.audioEnabled || mode === "blind",
  };
}

export function stepTypesFor(mode: LearningModeCode, analysis: AnalysisDto): StepType[] {
  return stepsFromPlan(
    mode,
    buildTeachingPlan({ analysis, mode, variant: initialVariant(mode) }),
    analysis,
  ).map((step) => step.type);
}

function stepsFromPlan(
  mode: LearningModeCode,
  plan: ReturnType<typeof buildTeachingPlan>,
  analysis: AnalysisDto,
): LessonStepState[] {
  const fallbackConcept = analysis.concepts[0]?.id ?? null;
  const mapped: LessonStepState[] = plan.sequence.map((item) => {
    const type = stepTypeFromKind(item.kind, mode);
    return {
      id: randomUUID(),
      type,
      title: item.title || STEP_TITLES[type],
      status: "not_started",
      conceptId: item.conceptId ?? fallbackConcept,
      questionId: null,
    };
  });
  if (mapped.length === 0) {
    mapped.push({
      id: randomUUID(),
      type: "main_idea",
      title: STEP_TITLES.main_idea,
      status: "not_started",
      conceptId: fallbackConcept,
      questionId: null,
    });
  }
  mapped[0]!.status = "in_progress";
  return mapped;
}

function stepTypeFromKind(kind: string, mode: LearningModeCode): StepType {
  if (kind === "check") return "check_question";
  if (kind === "visual") return "visual";
  if (kind === "example") return "key_points";
  if (kind === "vocabulary") return "terms";
  if (kind === "orientation" || kind === "audio") return "main_idea";
  if (kind === "concept") return mode === "dyslexia" ? "main_idea" : "main_idea";
  return "main_idea";
}

export function progressLabel(current: number, total: number): string {
  return `${current} من ${total}`;
}

export function modeEnglish(code: LearningModeCode): string {
  return MODE_PRESENTATION[code].englishName;
}

export function isLessonState(value: unknown): value is LessonState {
  if (!value || typeof value !== "object") return false;
  const state = value as LessonState;
  return Array.isArray(state.steps) && typeof state.currentStepIndex === "number" && Boolean(state.content);
}
