export const LESSON_STATE_VERSION = 1;

export type StepType =
  | "main_idea"
  | "key_points"
  | "terms"
  | "visual"
  | "check_question";

export type StepStatus = "not_started" | "in_progress" | "completed" | "needs_review";

export type QuestionKind = "multiple_choice" | "true_false" | "short_answer";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type TeachingVariant = "concise" | "standard" | "simplified" | "example" | "verbal";

export const STEP_TITLES: Record<StepType, string> = {
  main_idea: "الفكرة الأساسية",
  key_points: "أهم النقاط",
  terms: "المصطلحات",
  visual: "وصف بصري",
  check_question: "سؤال التحقق",
};

export const ADAPTATION_RULES = {
  incorrectBeforeSimplify: 2,
  correctBeforeHarder: 2,
  explanationRequestsBeforeSimplify: 2,
} as const;

export const ANSWER_MAX_LENGTH = 2_000;
export const ASK_MAX_LENGTH = 500;
export const LESSON_AI_TIMEOUT_NOTE = "تعذر تجهيز الشرح حاليًا.";
