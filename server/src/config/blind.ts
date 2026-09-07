export const BLIND_SEGMENT_TYPES = [
  "orientation",
  "title",
  "main_idea",
  "key_points",
  "terms",
  "visual_description",
  "table_description",
  "paragraph",
  "example",
  "question",
] as const;

export type BlindSegmentType = (typeof BLIND_SEGMENT_TYPES)[number];

export const BLIND_ACTIONS = [
  "read_page",
  "describe_diagram",
  "describe_table",
  "read_paragraph",
  "more_detail",
  "next_segment",
  "previous_segment",
  "replay",
  "test_me",
  "set_speed",
  "audio_started",
  "audio_paused",
  "mark_listened",
  "where_am_i",
  "what_now",
  "key_point",
] as const;

export type BlindAction = (typeof BLIND_ACTIONS)[number];

export function isBlindAction(value: string): value is BlindAction {
  return (BLIND_ACTIONS as readonly string[]).includes(value);
}

export const BLIND_SPEEDS = [0.8, 1, 1.25, 1.5, 1.75, 2] as const;
export type BlindSpeed = (typeof BLIND_SPEEDS)[number];

export function isBlindSpeed(value: number): value is BlindSpeed {
  return (BLIND_SPEEDS as readonly number[]).some((speed) => Math.abs(speed - value) < 0.001);
}

export const TTS_MAX_CHARS = 2_000;
export const TTS_RATE_WINDOW_MS = 15 * 60 * 1000;
export const TTS_RATE_LIMIT = 20;

export const SEGMENT_TITLES: Record<BlindSegmentType, string> = {
  orientation: "نظرة عامة",
  title: "العنوان",
  main_idea: "الفكرة الأساسية",
  key_points: "النقاط المهمة",
  terms: "المصطلحات",
  visual_description: "وصف الرسم",
  table_description: "وصف الجدول",
  paragraph: "فقرة",
  example: "مثال",
  question: "سؤال التحقق",
};

export const BLIND_MESSAGES = {
  noDiagram: "لا يوجد رسم موصوف في هذه الصفحة.",
  noTable: "لا يوجد جدول في هذه الصفحة.",
  noParagraph: "لا توجد هذه الفقرة في الجزء الحالي.",
  noVisualDetail: "لا تتوفر معلومات كافية لوصف العنصر البصري.",
  narrativeFailed: "تعذر تجهيز الشرح الصوتي.",
  ttsFailed: "تعذر تجهيز الصوت.",
  ttsUnavailable: "لا يتوفر توليد صوتي من الخادم. يمكن استخدام قراءة الجهاز.",
  audioStarted: "تم تشغيل القراءة.",
  audioPaused: "تم إيقاف القراءة مؤقتًا.",
} as const;
