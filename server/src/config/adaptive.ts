export const ADAPTIVE_ACTIONS = [
  "understood",
  "not_understood",
  "try_another",
  "continue",
  "test_me",
] as const;

export type AdaptiveAction = (typeof ADAPTIVE_ACTIONS)[number];

export const ADAPTIVE_LIMITS = {
  maxVariantChanges: 3,
  replayBeforeExample: 2,
} as const;

export const VARIANT_LABELS: Record<string, string> = {
  concise: "شرح مباشر",
  standard: "شرح مباشر",
  simplified: "شرح مبسط",
  example: "مثال واقعي",
  verbal: "شرح صوتي",
};

export const VARIANT_BLURBS: Record<string, string> = {
  concise: "سنركز على النقاط الأساسية فقط.",
  standard: "سأشرح الفكرة كما وردت في الصفحة.",
  simplified: "سأستخدم جملًا أقصر مع الإبقاء على المعنى العلمي.",
  example: "سنربط الفكرة بموقف من الحياة اليومية.",
  verbal: "سأشرح الفكرة بصياغة مناسبة للاستماع.",
};
