export const LEARNING_MODE_CODES = ["adaptive", "focus", "blind", "dyslexia"] as const;

export type LearningModeCode = (typeof LEARNING_MODE_CODES)[number];

export function isLearningModeCode(value: string): value is LearningModeCode {
  return (LEARNING_MODE_CODES as readonly string[]).includes(value);
}

export type ExplanationStyle = "adaptive" | "concise" | "verbal" | "simplified";
export type ExplanationLength = "short" | "medium" | "long";
export type VisualDensity = "low" | "medium" | "high";
export type InteractionFrequency = "low" | "medium" | "high";
export type InteractionStyle = "mixed" | "one_question" | "sequential_audio" | "line_by_line";

export interface LearningModeConfig {
  code: LearningModeCode;
  explanationStyle: ExplanationStyle;
  explanationLength: ExplanationLength;
  textDensity: "low" | "medium" | "variable";
  paragraphMaxSentences: number;
  maxKeyPoints: number;
  maxConceptsPerStep: number;
  questionCountPerStep: number;
  conceptDensity: "low" | "medium" | "variable";
  visualDensity: VisualDensity;
  interactionFrequency: InteractionFrequency;
  interactionStyle: InteractionStyle;
  describeVisuals: boolean;
  audioEnabled: boolean;
  simplifyLanguage: boolean;
  lineHighlight: boolean;
  preserveFacts: boolean;
  targetMinutes: number | null;
  accessibility: {
    keyboardFirst: boolean;
    screenReaderFriendly: boolean;
    increasedSpacing: boolean;
    shortParagraphs: boolean;
  };
}

export const LEARNING_MODE_CONFIGS: Record<LearningModeCode, LearningModeConfig> = {
  adaptive: {
    code: "adaptive",
    explanationStyle: "adaptive",
    explanationLength: "medium",
    textDensity: "variable",
    paragraphMaxSentences: 4,
    maxKeyPoints: 5,
    maxConceptsPerStep: 2,
    questionCountPerStep: 1,
    conceptDensity: "variable",
    visualDensity: "medium",
    interactionFrequency: "medium",
    interactionStyle: "mixed",
    describeVisuals: true,
    audioEnabled: false,
    simplifyLanguage: false,
    lineHighlight: false,
    preserveFacts: true,
    targetMinutes: null,
    accessibility: {
      keyboardFirst: false,
      screenReaderFriendly: true,
      increasedSpacing: false,
      shortParagraphs: false,
    },
  },
  focus: {
    code: "focus",
    explanationStyle: "concise",
    explanationLength: "short",
    textDensity: "low",
    paragraphMaxSentences: 2,
    maxKeyPoints: 3,
    maxConceptsPerStep: 1,
    questionCountPerStep: 1,
    conceptDensity: "low",
    visualDensity: "low",
    interactionFrequency: "high",
    interactionStyle: "one_question",
    describeVisuals: false,
    audioEnabled: false,
    simplifyLanguage: false,
    lineHighlight: false,
    preserveFacts: true,
    targetMinutes: 5,
    accessibility: {
      keyboardFirst: false,
      screenReaderFriendly: true,
      increasedSpacing: false,
      shortParagraphs: true,
    },
  },
  blind: {
    code: "blind",
    explanationStyle: "verbal",
    explanationLength: "long",
    textDensity: "medium",
    paragraphMaxSentences: 4,
    maxKeyPoints: 6,
    maxConceptsPerStep: 2,
    questionCountPerStep: 1,
    conceptDensity: "medium",
    visualDensity: "low",
    interactionFrequency: "medium",
    interactionStyle: "sequential_audio",
    describeVisuals: true,
    audioEnabled: true,
    simplifyLanguage: false,
    lineHighlight: false,
    preserveFacts: true,
    targetMinutes: null,
    accessibility: {
      keyboardFirst: true,
      screenReaderFriendly: true,
      increasedSpacing: false,
      shortParagraphs: false,
    },
  },
  dyslexia: {
    code: "dyslexia",
    explanationStyle: "simplified",
    explanationLength: "medium",
    textDensity: "low",
    paragraphMaxSentences: 2,
    maxKeyPoints: 4,
    maxConceptsPerStep: 1,
    questionCountPerStep: 1,
    conceptDensity: "low",
    visualDensity: "low",
    interactionFrequency: "medium",
    interactionStyle: "line_by_line",
    describeVisuals: false,
    audioEnabled: true,
    simplifyLanguage: true,
    lineHighlight: true,
    preserveFacts: true,
    targetMinutes: null,
    accessibility: {
      keyboardFirst: false,
      screenReaderFriendly: true,
      increasedSpacing: true,
      shortParagraphs: true,
    },
  },
};

export interface ModePresentation {
  name: string;
  englishName: string;
  description: string;
  features: string[];
  comparison: string;
}

export const MODE_PRESENTATION: Record<LearningModeCode, ModePresentation> = {
  adaptive: {
    name: "الوضع التكيفي",
    englishName: "SMART ADAPTIVE MODE",
    description:
      "يختار فَهْم طريقة الشرح تلقائيًا حسب المحتوى، ثم يغيّرها أثناء الدرس بناءً على تفاعلك وإجاباتك.",
    features: [
      "يتغير أسلوب الشرح حسب أدائك أثناء الدرس",
      "من النص إلى المثال الواقعي إلى التمثيل البصري",
      "يتعلم فَهْم من تفاعلك ليُحسّن طريقة الشرح",
    ],
    comparison: "يتكيف مع فهمك",
  },
  focus: {
    name: "وضع التركيز",
    englishName: "FOCUS MODE",
    description: "نعلّم أهم مفهوم واحد في كل مرة: ما هو، مثال من الصفحة، ثم سؤال سريع.",
    features: [
      "مفهوم واحد ثم تحقق ثم المفهوم التالي",
      "بدون عرض الصفحة كاملة دفعة واحدة",
      "سؤال فهم قصير بعد الشرح",
      "مدة الدرس التقريبية: 5 دقائق",
    ],
    comparison: "تركيز على الفكرة",
  },
  blind: {
    name: "وضع المكفوفين",
    englishName: "BLIND MODE",
    description: "نتعلم الصفحة بالصوت: توجيه، عنوان، فكرة، مفاهيم، ثم وصف الرسم أو الجدول إن وُجد فقط.",
    features: [
      "تسلسل صوتي تعليمي وليس قراءة الـ OCR",
      "وصف الرسم أو الجدول فقط عند وجود دليل بصري",
      "أين أنا، ماذا أتعلم، ما أهم نقطة، اختبرني",
      "تشغيل وإيقاف وإعادة المقطع",
    ],
    comparison: "تعلم بالصوت",
  },
  dyslexia: {
    name: "وضع عسر القراءة",
    englishName: "DYSLEXIA MODE",
    description: "نقرأ الصفحة جملة جملة، مع دعم الكلمات الصعبة دون تغيير المعنى العلمي.",
    features: [
      "جملة واحدة لكل فكرة مع تظليل موضع القراءة",
      "شرح الكلمة وتبسيط الجملة مع الإبقاء على المصطلح العلمي",
      "تحكم في حجم الخط والمسافات",
      "اختبرني بعد القراءة وليس كإتقان من القراءة وحدها",
    ],
    comparison: "قراءة ميسّرة",
  },
};

export const ADAPTIVE_WEIGHTS = {
  contentComplexity: 0.28,
  lowMastery: 0.24,
  recentErrorRate: 0.18,
  explanationNeed: 0.1,
  modeEffectiveness: 0.12,
  pulseSupport: 0.08,
  highComplexityThreshold: 0.65,
  lowMasteryThreshold: 0.5,
  highErrorThreshold: 0.45,
  effectivenessLead: 0.15,
  effectivenessFloor: 0.6,
} as const;

export const COMPLEXITY_WEIGHTS = {
  conceptShare: 0.28,
  relationshipShare: 0.22,
  wordShare: 0.18,
  sectionShare: 0.1,
  diagramBoost: 0.14,
  tableBoost: 0.08,
  conceptNorm: 8,
  relationshipNorm: 6,
  wordNorm: 400,
  sectionNorm: 8,
  lowMax: 0.34,
  mediumMax: 0.64,
} as const;

export const INTERACTION_TYPES = {
  modeSelection: "mode_selection",
  adaptivePreference: "adaptive_preference",
  lessonState: "lesson_state",
  lessonStarted: "lesson_started",
  explanationViewed: "explanation_viewed",
  questionPresented: "question_presented",
  answerSubmitted: "answer_submitted",
  hintRequested: "hint_requested",
  explanationRequested: "explanation_requested",
  exampleRequested: "example_requested",
  askFahm: "ask_fahm",
  adaptationTriggered: "adaptation_triggered",
  conceptCompleted: "concept_completed",
  lessonCompleted: "lesson_completed",
  audioStarted: "audio_started",
  audioPaused: "audio_paused",
  audioCompleted: "audio_completed",
  audioReplayed: "audio_replayed",
  audioSpeedChanged: "audio_speed_changed",
  visualDescriptionRequested: "visual_description_requested",
  detailRequested: "detail_requested",
  segmentViewed: "segment_viewed",
  wordExplanationRequested: "word_explanation_requested",
  noteAdded: "note_added",
  adaptationAccepted: "adaptation_accepted",
  adaptationRejected: "adaptation_rejected",
  adaptationTryAnother: "adaptation_try_another",
} as const;

export const MODE_DISPLAY_ORDER: LearningModeCode[] = [
  "adaptive",
  "focus",
  "blind",
  "dyslexia",
];
