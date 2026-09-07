import type { LearningModeCode } from "../config/learningModes.js";
import type { TeachingVariant } from "../config/teaching.js";

export type AskGrounding = "page" | "lesson_context" | "student_context" | "mixed" | "unavailable";
export type AskConfidence = "high" | "medium" | "low";

export interface AskSourceRef {
  type: "concept" | "page" | "vision" | "table" | "lesson";
  conceptId: string | null;
  label: string;
}

export interface AskFahmMessage {
  id: string;
  role: "student" | "fahm";
  text: string;
  createdAt: string;
  sourceLabel: string | null;
}

export interface AskFahmSuggestion {
  id: string;
  text: string;
  intent: string;
}

export interface AskFahmConversationItem {
  sessionId: string;
  title: string;
  current: boolean;
}

export interface AskFahmContextDto {
  title: string;
  pageNumber: number;
  hasFile: boolean;
  materialId: string;
  concepts: { id: string; name: string; description: string | null }[];
  visualAvailable: boolean;
  tableAvailable: boolean;
  previousQuestions: string[];
}

export interface AskFahmCapabilities {
  listen: boolean;
  simplify: boolean;
  example: boolean;
  testMe: boolean;
  showMap: boolean;
}

export interface AskLastAnswer {
  grounding: AskGrounding;
  confidence: AskConfidence;
  sourceLabel: string | null;
  followUp: string | null;
  actions: Array<"listen" | "simplify" | "example" | "test_me" | "show_map">;
}

export interface AskFahmExperience {
  session: {
    id: string;
    materialId: string;
    title: string;
    pageNumber: number;
    hasFile: boolean;
    modeCode: LearningModeCode;
    modeName: string;
    variant: TeachingVariant | null;
  };
  conversation: {
    id: string;
    title: string;
    messages: AskFahmMessage[];
  };
  conversations: AskFahmConversationItem[];
  context: AskFahmContextDto;
  suggestions: AskFahmSuggestion[];
  capabilities: AskFahmCapabilities;
  lastAnswer: AskLastAnswer | null;
  reply: string | null;
  navigateTo: string | null;
}

export interface AskBuiltContext {
  lesson: { title: string; pageNumber: number };
  sourceText: {
    title: string;
    mainIdea: string;
    keyPoints: string[];
    relevantParagraphs: string[];
  };
  concepts: { id: string; name: string; description: string | null; importanceScore: number }[];
  visualContext: { available: boolean; description: string | null };
  tableContext: { available: boolean; description: string | null };
  teachingState: {
    mode: LearningModeCode;
    variant: TeachingVariant | null;
    currentStep: string | null;
    simplified: string | null;
    example: string | null;
  };
  learnerContext: {
    reviewNames: string[];
    recentIncorrect: string[];
  };
  pageText: string;
}
