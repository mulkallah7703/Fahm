import { INTERACTION_TYPES } from "./learningModes.js";

export const HISTORY_NOT_FOUND = "لم يتم العثور على الجلسة.";
export const HISTORY_SEARCH_MAX = 200;
export const HISTORY_REPEAT_THRESHOLD = 2;
export const HISTORY_TIMELINE_LIMIT = 80;
export const HISTORY_INDICATOR_LIMIT = 3;

export const HISTORY_ACTIVITY_LABELS: Record<string, string> = {
  [INTERACTION_TYPES.modeSelection]: "اختيار وضع التعلم",
  [INTERACTION_TYPES.adaptivePreference]: "تفضيل التكييف",
  [INTERACTION_TYPES.lessonStarted]: "بدء الجلسة",
  [INTERACTION_TYPES.explanationViewed]: "شرح نصي للمفهوم",
  [INTERACTION_TYPES.questionPresented]: "عرض سؤال",
  [INTERACTION_TYPES.answerSubmitted]: "إجابة على سؤال",
  [INTERACTION_TYPES.hintRequested]: "طلب تلميح",
  [INTERACTION_TYPES.explanationRequested]: "طلب إعادة الشرح",
  [INTERACTION_TYPES.exampleRequested]: "تحويل الشرح إلى مثال واقعي",
  [INTERACTION_TYPES.askFahm]: "سؤال فَهْم",
  [INTERACTION_TYPES.adaptationTriggered]: "تكييف الشرح",
  [INTERACTION_TYPES.conceptCompleted]: "إكمال مفهوم",
  [INTERACTION_TYPES.lessonCompleted]: "إكمال الجلسة",
  [INTERACTION_TYPES.audioStarted]: "تشغيل الصوت",
  [INTERACTION_TYPES.audioPaused]: "إيقاف الصوت مؤقتًا",
  [INTERACTION_TYPES.audioCompleted]: "اكتمال تشغيل الصوت",
  [INTERACTION_TYPES.audioReplayed]: "إعادة تشغيل الصوت",
  [INTERACTION_TYPES.audioSpeedChanged]: "تغيير سرعة الصوت",
  [INTERACTION_TYPES.visualDescriptionRequested]: "طلب وصف بصري",
  [INTERACTION_TYPES.detailRequested]: "طلب تفاصيل إضافية",
  [INTERACTION_TYPES.segmentViewed]: "قراءة مقطع",
  [INTERACTION_TYPES.wordExplanationRequested]: "شرح كلمة",
  [INTERACTION_TYPES.noteAdded]: "إضافة ملاحظة",
  [INTERACTION_TYPES.adaptationAccepted]: "قبول التكييف",
  [INTERACTION_TYPES.adaptationRejected]: "رفض التكييف",
  [INTERACTION_TYPES.adaptationTryAnother]: "تجربة تكييف آخر",
};

export const HISTORY_HIDDEN_INTERACTIONS = new Set<string>([INTERACTION_TYPES.lessonState]);
