export const DYSLEXIA_ACTIONS = [
  "next_segment",
  "previous_segment",
  "set_prefs",
  "explain_word",
  "simplify_word",
  "save_note",
  "delete_note",
  "test_me",
  "mark_viewed",
  "replay",
  "reset_prefs",
  "focus_segment",
] as const;

export type DyslexiaAction = (typeof DYSLEXIA_ACTIONS)[number];

export function isDyslexiaAction(value: string): value is DyslexiaAction {
  return (DYSLEXIA_ACTIONS as readonly string[]).includes(value);
}

export const DYSLEXIA_FONT_SIZES = ["small", "medium", "large"] as const;
export type DyslexiaFontSize = (typeof DYSLEXIA_FONT_SIZES)[number];

export const DYSLEXIA_LINE_SPACINGS = [1.6, 2.1, 2.6] as const;
export type DyslexiaLineSpacing = (typeof DYSLEXIA_LINE_SPACINGS)[number];

export const FONT_SIZE_PX: Record<DyslexiaFontSize, number> = {
  small: 18,
  medium: 22,
  large: 28,
};

export function fontSizeFromPx(value: number | null | undefined): DyslexiaFontSize {
  if (!value) return "medium";
  if (value <= 19) return "small";
  if (value >= 26) return "large";
  return "medium";
}

export function nearestLineSpacing(value: number | null | undefined): DyslexiaLineSpacing {
  if (value === null || value === undefined) return 2.1;
  return DYSLEXIA_LINE_SPACINGS.reduce((best, current) =>
    Math.abs(current - value) < Math.abs(best - value) ? current : best,
  );
}

export const NOTE_MAX_LENGTH = 500;
export const WORD_MAX_LENGTH = 80;
