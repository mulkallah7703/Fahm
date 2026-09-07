import type { DyslexiaAction, DyslexiaFontSize, DyslexiaLineSpacing } from "../config/dyslexia.js";

export type DyslexiaSegmentType = "title" | "sentence" | "concept" | "example" | "definition";

export interface DyslexiaSegment {
  id: string;
  type: DyslexiaSegmentType;
  order: number;
  text: string;
  conceptIds: string[];
}

export interface DyslexiaNote {
  segmentId: string;
  text: string;
  updatedAt: string;
}

export interface DyslexiaWordExplain {
  term: string;
  simpleExplanation: string;
  contextualMeaning: string | null;
  example: string | null;
  known: boolean;
}

export interface DyslexiaLessonState {
  contentHash: string;
  currentSegmentIndex: number;
  highlightCurrent: boolean;
  autoRead: boolean;
  wordClickEnabled: boolean;
  fontSize: DyslexiaFontSize;
  lineSpacing: DyslexiaLineSpacing;
  replayCount: number;
  lastAction: DyslexiaAction | null;
  lastActionMessage: string | null;
  viewedIds: string[];
  notes: DyslexiaNote[];
  simplified: Record<string, string>;
  explanations: Record<string, DyslexiaWordExplain>;
  segments: DyslexiaSegment[];
}

export interface DyslexiaSegmentDto {
  id: string;
  type: DyslexiaSegmentType;
  order: number;
  text: string;
  conceptIds: string[];
}

export interface DyslexiaVocabDto {
  conceptId: string;
  name: string;
  english: string | null;
  definition: string;
  example: string | null;
  occurrences: number;
  simplified: string | null;
}

export interface DyslexiaExperienceDto {
  currentSegmentIndex: number;
  currentSegment: DyslexiaSegmentDto | null;
  segments: DyslexiaSegmentDto[];
  progress: { current: number; total: number; label: string };
  emptyMessage: string | null;
  highlightCurrent: boolean;
  autoRead: boolean;
  wordClickEnabled: boolean;
  fontSize: DyslexiaFontSize;
  lineSpacing: number;
  speechRate: number | null;
  lastActionMessage: string | null;
  vocabulary: DyslexiaVocabDto[];
  currentConcept: DyslexiaVocabDto | null;
  wordExplain: DyslexiaWordExplain | null;
  note: DyslexiaNote | null;
  quizReady: boolean;
}
