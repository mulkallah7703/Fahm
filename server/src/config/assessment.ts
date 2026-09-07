export const ASSESSMENT_ACTIONS = ["start", "next", "previous", "complete", "review"] as const;
export type AssessmentAction = (typeof ASSESSMENT_ACTIONS)[number];

export const ASSESSMENT_MAX_QUESTIONS = 4;
