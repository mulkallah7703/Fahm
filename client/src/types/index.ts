export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  displayName: string;
  role: string;
  studentProfileId: string | null;
}

export interface Student {
  id: string;
  firstName: string;
  lastName: string | null;
  displayName: string;
  gradeLevel: string | null;
  preferredLearningMode: string | null;
  preferredLearningModeName: string | null;
}

export interface LearningPulse {
  score: number;
  status: string;
  recommendedAction: string | null;
}

export interface ReviewConcept {
  conceptId: string;
  name: string;
  subject: string | null;
  masteryScore: number;
  status: string;
}

export interface ContinueLearning {
  sessionId: string;
  materialId: string | null;
  title: string;
  pageNumber: number | null;
  stoppedAtConcept: string | null;
  conceptCount: number;
  modeCode: string | null;
  modeName: string | null;
}

export interface RecentLesson {
  sessionId: string;
  materialId: string | null;
  title: string;
  pageNumber: number | null;
  subject: string | null;
  conceptCount: number;
  modeCode: string | null;
  modeName: string | null;
  status: string;
  lastAccessedAt: string;
}

export type HistoryFilter = "all" | "needs_review";

export interface HistoryIndicator {
  conceptId: string;
  name: string;
  status: "strong" | "good" | "review" | "extra" | "unassessed";
  label: string;
}

export interface HistoryListItem extends RecentLesson {
  id: string;
  startedAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  mode: string | null;
  variant: string | null;
  variantLabel: string | null;
  progress: number | null;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  needsReview: boolean;
  indicators: HistoryIndicator[];
}

export interface HistoryPagination {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

export interface HistoryListResult {
  items: HistoryListItem[];
  total: number;
  pagination: HistoryPagination;
}

export interface HistoryActivity {
  id: string;
  type: string;
  label: string;
  at: string;
  conceptName: string | null;
}

export interface HistoryAnswerSummary {
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number | null;
}

export interface HistoryConceptSummary {
  conceptId: string;
  name: string;
  masteryScore: number | null;
  masteryLabel: string;
  status: HistoryIndicator["status"];
  review: boolean;
}

export interface HistoryAdaptation {
  fromLabel: string | null;
  toLabel: string | null;
  reason: string;
  at: string;
  conceptName: string | null;
}

export interface HistorySessionDetail {
  session: HistoryListItem;
  material: {
    materialId: string | null;
    title: string;
    pageNumber: number | null;
  };
  activities: HistoryActivity[];
  answers: HistoryAnswerSummary;
  concepts: HistoryConceptSummary[];
  adaptations: HistoryAdaptation[];
  recommendation: string | null;
  pulse: { score: number; status: string } | null;
}

export interface Recommendation {
  text: string;
  action: "review" | "continue" | "upload";
  conceptId?: string;
  sessionId?: string;
  materialId?: string;
}

export interface DashboardData {
  student: Student;
  learningPulse: LearningPulse | null;
  reviewConcepts: ReviewConcept[];
  continueLearning: ContinueLearning | null;
  recentLessons: RecentLesson[];
  recommendation: Recommendation | null;
}

export interface UploadResponse {
  materialId: string;
  sessionId: string;
  pageId: string;
  nextState: string;
  title: string;
}

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

export interface AnalysisTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface AnalysisSection {
  type: "heading" | "paragraph" | "diagram" | "table" | "image" | "other";
  text?: string;
  description?: string;
  table?: AnalysisTable;
}

export interface AnalysisConcept {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  importanceScore: number;
  confidenceScore: number;
}

export interface PageAnalysis {
  material: {
    id: string;
    title: string;
    type: string;
    mimeType: string | null;
    hasFile: boolean;
  };
  page: { id: string; pageNumber: number; pageCount: number | null };
  session: { id: string; modeCode: string | null; modeName: string | null };
  status: AnalysisStatus;
  stages: AnalysisStage[];
  processingTimeMs: number | null;
  wordCount: number;
  ocr: {
    text: string;
    originalText: string;
    isCorrected: boolean;
    language: string | null;
    confidence: number | null;
    processingTimeMs: number | null;
    engine: string | null;
    lowConfidence: boolean;
  } | null;
  vision: {
    summary: string;
    visualDescription: string | null;
    elements: { type: string; description: string; location?: string }[];
    tables: AnalysisTable[];
    modelName: string | null;
    processingTimeMs: number | null;
  } | null;
  structure: { title: string | null; sections: AnalysisSection[] };
  concepts: AnalysisConcept[];
  relationships: { source: string; target: string; type: string; confidenceScore: number | null }[];
  gradeEstimate: {
    gradeLevel: string | null;
    subject: string | null;
    confidence: number;
    note: string | null;
  } | null;
  error: { code: string; message: string; stage: string | null } | null;
}

export type LearningModeCode = "focus" | "blind" | "dyslexia" | "adaptive";

export interface LearningModeConfig {
  code: LearningModeCode;
  explanationStyle: string;
  explanationLength: string;
  textDensity: string;
  paragraphMaxSentences: number;
  maxKeyPoints: number;
  maxConceptsPerStep: number;
  questionCountPerStep: number;
  conceptDensity: string;
  visualDensity: string;
  interactionFrequency: string;
  interactionStyle: string;
  describeVisuals: boolean;
  audioEnabled: boolean;
  simplifyLanguage: boolean;
  lineHighlight: boolean;
  preserveFacts: boolean;
  targetMinutes: number | null;
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

export interface ModeRecommendation {
  recommendedMode: LearningModeCode;
  confidence: number;
  reasonCode: string;
  reasonText: string;
  isNewLearner: boolean;
  usedExplicitPreference: boolean;
  signals: {
    contentComplexity: number | null;
    recentMastery: number | null;
    recentErrorRate: number | null;
    historyAvailable: boolean;
    explicitPreference: boolean;
  };
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

export type LessonStepType =
  | "main_idea"
  | "key_points"
  | "terms"
  | "visual"
  | "check_question";

export type LessonStepStatus = "not_started" | "in_progress" | "completed" | "needs_review";

export interface LessonStep {
  id: string;
  type: LessonStepType;
  title: string;
  status: LessonStepStatus;
  conceptId: string | null;
  questionId: string | null;
}

export interface LessonQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  text: string;
  options: string[] | null;
  difficulty: "easy" | "medium" | "hard";
}

export interface LessonFeedback {
  type: "correct" | "incorrect" | "partial";
  message: string;
  explanation: string | null;
  usedHint: boolean;
}

export interface LessonSession {
  session: { id: string; status: string; completed: boolean };
  material: {
    id: string;
    title: string;
    pageNumber: number;
    hasFile: boolean;
    subject: string | null;
  };
  mode: { code: LearningModeCode; name: string; englishName: string };
  strategy: {
    mode: LearningModeCode;
    variant: string;
    explanationStyle: string;
    difficulty: string;
    audioSupport: boolean;
  };
  config: LearningModeConfig;
  progress: { current: number; total: number; label: string };
  steps: LessonStep[];
  currentStep: LessonStep;
  content: {
    title: string;
    mainIdea: string;
    hook?: string | null;
    coreIdea?: string | null;
    keyPoints: { text: string; source: string | null }[];
    steps?: string[];
    terms: { conceptId: string; name: string; definition: string }[];
    importantTerms?: { term: string; meaning: string }[];
    visualDescription: string | null;
    example: string | null;
    relationship?: string | null;
    whyItMatters?: string | null;
    simplifiedExplanation: string | null;
    speechText: string;
    unreadable?: boolean;
    qualityScore?: number;
  };
  question: LessonQuestion | null;
  feedback: LessonFeedback | null;
  adaptationMessage: string | null;
  completion: {
    message: string;
    pulse: { previous: number | null; current: number | null };
    concepts: { name: string; masteryScore: number; needsReview: boolean }[];
    reviewNeeded: boolean;
  } | null;
  hint?: string;
  blind: BlindExperience | null;
  dyslexia: DyslexiaExperience | null;
  adaptive: AdaptiveExperience | null;
  assessment: AssessmentExperience | null;
  teachingPlan: {
    mode: LearningModeCode;
    variant: string;
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

export type BlindSegmentType =
  | "orientation"
  | "title"
  | "main_idea"
  | "key_points"
  | "terms"
  | "visual_description"
  | "table_description"
  | "paragraph"
  | "example"
  | "question";

export interface BlindSegment {
  id: string;
  type: BlindSegmentType;
  order: number;
  title: string;
  text: string;
  detailedAvailable: boolean;
  available: boolean;
  unavailableReason: string | null;
  paragraphIndex: number | null;
}

export interface BlindExperience {
  currentSegmentIndex: number;
  currentSegment: BlindSegment | null;
  segments: BlindSegment[];
  progress: { current: number; total: number; label: string };
  speechRate: number;
  preferredVoice: string | null;
  fontSize: number | null;
  hasDiagram: boolean;
  hasTable: boolean;
  paragraphCount: number;
  ttsConfigured: boolean;
  recommendedSpeed: number | null;
  lastActionMessage: string | null;
  detailOpen: boolean;
}

export interface AssessmentItem {
  questionId: string;
  conceptId: string | null;
  conceptName: string | null;
  status: "pending" | "current" | "correct" | "incorrect" | "partial";
}

export interface AssessmentExperience {
  active: boolean;
  emptyMessage: string | null;
  progress: { current: number; total: number; label: string };
  items: AssessmentItem[];
  question: LessonQuestion | null;
  answered: boolean;
  evidence: {
    conceptId: string;
    name: string;
    masteryScore: number;
    status: string;
    label: string;
    needsReview: boolean;
  }[];
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

export interface AdaptiveEvidence {
  explanationRequests: number;
  simplifyRequests: number;
  exampleRequests: number;
  incorrectAnswers: number;
  correctAnswers: number;
  replayCount: number;
  hintCount: number;
  pauseSeconds: number | null;
  adaptationCount: number;
}

export interface AdaptiveStrategyStep {
  id: string;
  label: string;
  variant: string;
  state: "past" | "current" | "next" | "unavailable";
  note: string | null;
}

export interface AdaptiveExperience {
  currentVariant: string;
  currentLabel: string;
  currentBlurb: string;
  insight: string | null;
  emptyMessage: string | null;
  reasonLabel: string | null;
  actionLabel: string | null;
  evidence: AdaptiveEvidence;
  strategies: AdaptiveStrategyStep[];
  previousExplanation: string | null;
  currentExplanation: string;
  visualAvailable: boolean;
  visualDescription: string | null;
  history: { reason: string; fromLabel: string; toLabel: string }[];
  canTryAnother: boolean;
  limitReached: boolean;
  nextAction: "question" | "continue" | "listen";
  lastFeedback: "understood" | "not_understood" | null;
}

export type DyslexiaFontSize = "small" | "medium" | "large";
export type DyslexiaLineSpacing = 1.6 | 2.1 | 2.6;

export interface DyslexiaSegment {
  id: string;
  type: "title" | "sentence" | "concept" | "example" | "definition";
  order: number;
  text: string;
  conceptIds: string[];
}

export interface DyslexiaVocab {
  conceptId: string;
  name: string;
  english: string | null;
  definition: string;
  example: string | null;
  occurrences: number;
  simplified: string | null;
}

export interface DyslexiaWordExplain {
  term: string;
  simpleExplanation: string;
  contextualMeaning: string | null;
  example: string | null;
  known: boolean;
}

export interface DyslexiaExperience {
  currentSegmentIndex: number;
  currentSegment: DyslexiaSegment | null;
  segments: DyslexiaSegment[];
  progress: { current: number; total: number; label: string };
  emptyMessage: string | null;
  highlightCurrent: boolean;
  autoRead: boolean;
  wordClickEnabled: boolean;
  fontSize: DyslexiaFontSize;
  lineSpacing: DyslexiaLineSpacing;
  speechRate: number | null;
  lastActionMessage: string | null;
  vocabulary: DyslexiaVocab[];
  currentConcept: DyslexiaVocab | null;
  wordExplain: DyslexiaWordExplain | null;
  note: { segmentId: string; text: string; updatedAt: string } | null;
  quizReady: boolean;
}

export interface TtsResponse {
  provider: "elevenlabs" | "browser";
  fallback: boolean;
  text: string;
  audioId: string | null;
  durationSeconds: number | null;
  reason: string | null;
  segmentId?: string;
}

export interface TeachingStrategyContract {
  sessionId: string;
  materialId: string;
  pageId: string;
  selectedMode: LearningModeCode;
  adaptiveEnabled: boolean;
  teachingStrategy: LearningModeConfig;
}

export interface AskFahmMessage {
  id: string;
  role: "student" | "fahm";
  text: string;
  createdAt: string;
  sourceLabel: string | null;
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
    variant: string | null;
  };
  conversation: {
    id: string;
    title: string;
    messages: AskFahmMessage[];
  };
  conversations: { sessionId: string; title: string; current: boolean }[];
  context: {
    title: string;
    pageNumber: number;
    hasFile: boolean;
    materialId: string;
    concepts: { id: string; name: string; description: string | null }[];
    visualAvailable: boolean;
    tableAvailable: boolean;
    previousQuestions: string[];
  };
  suggestions: { id: string; text: string; intent: string }[];
  capabilities: {
    listen: boolean;
    simplify: boolean;
    example: boolean;
    testMe: boolean;
    showMap: boolean;
  };
  lastAnswer: {
    grounding: "page" | "lesson_context" | "student_context" | "mixed" | "unavailable";
    confidence: "high" | "medium" | "low";
    sourceLabel: string | null;
    followUp: string | null;
    actions: Array<"listen" | "simplify" | "example" | "test_me" | "show_map">;
  } | null;
  reply: string | null;
  navigateTo: string | null;
}

export type MapMasteryBand = "مفهوم" | "فهم جيد" | "يحتاج مراجعة" | "شرح إضافي" | "لم يُقَيَّم بعد";
export type MapNodeStatus = "strong" | "good" | "review" | "extra" | "unassessed";
export type MapFilter = "all" | "strong" | "review" | "extra" | "unassessed" | "current";
export type MapAction = "select" | "explain" | "ask" | "test" | "review";
export type KnowledgeMapAction = MapAction;

export interface KnowledgeMapNode {
  id: string;
  conceptId: string;
  label: string;
  description: string | null;
  masteryScore: number | null;
  masteryBand: MapMasteryBand;
  status: MapNodeStatus;
  importance: number;
  isCurrent: boolean;
  isReviewRecommended: boolean;
  adapted: boolean;
  relationshipCount: number;
  sessionId: string | null;
  group: string | null;
  x: number;
  y: number;
}

export interface KnowledgeMapEdge {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationshipType: string;
  label: string;
  strength: number | null;
}

export interface KnowledgeMapConceptDetail {
  conceptId: string;
  name: string;
  description: string | null;
  masteryBand: MapMasteryBand;
  insight: string | null;
  relationships: { direction: "from" | "to"; type: string; name: string }[];
  attempts: number | null;
  correct: number | null;
  incorrect: number | null;
  explanationCount: number | null;
  adapted: boolean;
}

export interface KnowledgeMapDto {
  scope: {
    type: "session" | "student";
    sessionId: string | null;
    materialId: string | null;
    title: string;
    pageNumber: number | null;
    modeCode: string | null;
  };
  presentation: {
    blind: boolean;
    dyslexia: boolean;
    focus: boolean;
    simplified: boolean;
    fontSize: number | null;
    lineSpacing: number | null;
  };
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
  details: KnowledgeMapConceptDetail[];
  stats: {
    conceptCount: number;
    relationshipCount: number;
    reviewCount: number;
    extraCount: number;
    unassessedCount: number;
  };
  selectedConceptId: string | null;
  recommendation: { conceptId: string; label: string; reason: string } | null;
  pulse: { reviewCount: number; extraCount: number } | null;
  emptyMessage: string | null;
  emptyHint: string | null;
  preferredView: "map" | "list" | "review" | null;
  navigateTo: string | null;
}

export type TeacherRange = "week" | "month";

export interface TeacherDashboard {
  teacher: { id: string; name: string };
  classInfo: { schoolName: string | null; subject: string | null; assignedCount: number };
  scope: { range: TeacherRange; material: { id: string; title: string } | null };
  updatedAt: string;
  overview: {
    assignedStudents: number;
    completedStudents: number;
    completionLabel: string;
    averageUnderstanding: number | null;
    averageUnderstandingLabel: string;
    needsAdditionalExplanation: number;
    explanationRequests: number;
  };
  conceptColumns: { conceptId: string; name: string }[];
  students: {
    studentId: string;
    name: string;
    modeCode: string | null;
    modeName: string | null;
    lastActivityAt: string | null;
    cells: { conceptId: string; band: string; status: string }[];
  }[];
  studentTotal: number;
  reviewPriority: TeacherReviewConcept[];
  modeDistribution: { code: string; name: string; count: number; percent: number }[];
  recommendations: { id: string; text: string }[];
  actions: { review: boolean; parentNote: boolean; parentNoteStatus: "unavailable" };
  empty: { students: string | null; lessons: string | null; mastery: string | null; review: string | null };
}

export interface TeacherReviewConcept {
  conceptId: string;
  name: string;
  affectedStudents: number;
  averageMastery: number | null;
  incorrectAnswers: number;
  explanationRequests: number;
  adaptations: number;
  materialTitle: string | null;
  recommendedAction: string;
  band: string;
}

export interface TeacherStudentList {
  page: number;
  pageSize: number;
  total: number;
  students: {
    studentId: string;
    name: string;
    gradeLevel: string | null;
    modeCode: string | null;
    modeName: string | null;
    lastActivityAt: string | null;
  }[];
}

export interface TeacherStudentInsight {
  student: {
    studentId: string;
    name: string;
    gradeLevel: string | null;
    modeCode: string | null;
    modeName: string | null;
  };
  pulse: { score: number; status: string } | null;
  progress: { sessionCount: number; completedSessions: number; lastActivityAt: string | null };
  mastery: {
    conceptId: string;
    name: string;
    band: string;
    score: number | null;
    attempts: number;
    correct: number;
    incorrect: number;
    explanationCount: number;
  }[];
  weakConcepts: { conceptId: string; name: string; band: string }[];
  strongConcepts: { conceptId: string; name: string; band: string }[];
  recentAnswers: { answeredAt: string; isCorrect: boolean | null; conceptName: string | null }[];
  recentInteractions: { type: string; createdAt: string; conceptName: string | null }[];
  adaptations: { reason: string; createdAt: string; conceptName: string | null }[];
}

export interface TeacherReview {
  concepts: TeacherReviewConcept[];
  emptyMessage: string | null;
}

export interface TeacherLessonList {
  lessons: { materialId: string; title: string; studentCount: number; lastActivityAt: string | null }[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}
