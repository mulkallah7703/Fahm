import type {
  LearningModeCode,
  LearningModeConfig,
} from "../config/learningModes.js";

export interface AccessibilitySignals {
  visualSupport: boolean;
  audioSupport: boolean;
  simplifiedLanguage: boolean;
  focusSupport: boolean;
  dyslexiaSupport: boolean;
  blindSupport: boolean;
  fontSize: number | null;
  lineSpacing: number | null;
  speechRate: number | null;
  preferredVoice: string | null;
}

export interface PublicComplexity {
  score: number;
  level: "low" | "medium" | "high" | "unknown";
  signals: {
    conceptCount: number;
    relationshipCount: number;
    wordCount: number;
    hasDiagram: boolean;
    hasTable: boolean;
    sectionCount: number;
    analysisReady: boolean;
  };
}

export interface PublicRecommendationSignals {
  contentComplexity: number | null;
  recentMastery: number | null;
  recentErrorRate: number | null;
  historyAvailable: boolean;
  explicitPreference: boolean;
}

export interface ModeRecommendation {
  recommendedMode: LearningModeCode;
  confidence: number;
  reasonCode: string;
  reasonText: string;
  isNewLearner: boolean;
  usedExplicitPreference: boolean;
  signals: PublicRecommendationSignals;
}

export interface CatalogMode {
  code: LearningModeCode;
  name: string;
  englishName: string;
  description: string;
  features: string[];
  comparison: string;
  recommended: boolean;
  isAdaptive: boolean;
  config: LearningModeConfig;
}

export interface LearningSessionState {
  sessionId: string;
  materialId: string;
  pageId: string;
  pageNumber: number;
  selectedMode: LearningModeCode | null;
  selectedModeName: string | null;
  adaptiveEnabled: boolean;
  sessionStatus: string;
  isResume: boolean;
}

export interface TeachingStrategyContract {
  sessionId: string;
  materialId: string;
  pageId: string;
  selectedMode: LearningModeCode;
  adaptiveEnabled: boolean;
  initialRecommendation: {
    recommendedMode: LearningModeCode;
    reasonCode: string;
    reasonText: string;
    isNewLearner: boolean;
  } | null;
  contentComplexity: PublicComplexity;
  studentContext: {
    gradeLevel: string | null;
    hasHistory: boolean;
    explicitPreferenceCode: LearningModeCode | null;
  };
  teachingStrategy: LearningModeConfig;
}

export interface LearningSetup {
  material: {
    id: string;
    title: string;
    pageNumber: number;
    conceptCount: number;
    wordCount: number;
    analysisStatus: string;
  };
  modes: CatalogMode[];
  recommendation: ModeRecommendation | null;
  recommendationError: boolean;
  session: LearningSessionState;
  student: {
    gradeLevel: string | null;
    isNewLearner: boolean;
    adaptiveEnabledDefault: boolean;
  };
}
