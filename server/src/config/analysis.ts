export const OCR_CONFIDENCE_WARNING = 60;
export const MAX_OCR_CHARS_FOR_AI = 8_000;
export const MAX_VISION_IMAGE_PX = 1600;
export const AI_TIMEOUT_MS = 45_000;
export const AI_MAX_RETRIES = 1;
export const ANALYSIS_POLL_LOCK_MS = 8 * 60 * 1000;

export const LEARNING_MODE_BY_CODE: Record<string, number> = {
  focus: 1,
  blind: 2,
  dyslexia: 3,
  adaptive: 4,
};

export type AnalysisStatus =
  | "pending"
  | "ocr_processing"
  | "ocr_completed"
  | "vision_processing"
  | "vision_completed"
  | "concept_extraction"
  | "completed"
  | "failed";

export type StageState = "pending" | "processing" | "completed" | "failed";

export interface AnalysisStage {
  key: "ocr" | "vision" | "grade" | "concepts";
  state: StageState;
  message: string | null;
}

export function emptyStages(): AnalysisStage[] {
  return [
    { key: "ocr", state: "pending", message: null },
    { key: "vision", state: "pending", message: null },
    { key: "grade", state: "pending", message: null },
    { key: "concepts", state: "pending", message: null },
  ];
}
