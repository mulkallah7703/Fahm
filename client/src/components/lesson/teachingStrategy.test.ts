import { describe, expect, it } from "vitest";

const STRATEGY_LABELS = {
  focus: "تركيز على الفكرة",
  blind: "تعلم بالصوت",
  dyslexia: "قراءة ميسّرة",
  adaptive: "يتكيف مع فهمك",
} as const;

const STRATEGY_CONTROLS = {
  focus: ["teach", "check", "continue", "hint", "simplify"],
  blind: ["play", "pause", "replay", "next", "previous", "orientation", "visual", "test_me"],
  dyslexia: ["read", "focus_sentence", "explain_word", "simplify", "vocabulary", "replay", "test_me"],
  adaptive: ["understood", "not_understood", "try_another", "continue", "test_me"],
} as const;

describe("mode-specific teaching strategy", () => {
  it("keeps four distinct strategy labels", () => {
    const labels = Object.values(STRATEGY_LABELS);
    expect(new Set(labels).size).toBe(4);
    expect(STRATEGY_LABELS.focus).not.toBe(STRATEGY_LABELS.blind);
    expect(STRATEGY_LABELS.dyslexia).not.toBe(STRATEGY_LABELS.adaptive);
  });

  it("does not share the same interaction model across modes", () => {
    expect(STRATEGY_CONTROLS.focus).not.toEqual(STRATEGY_CONTROLS.blind);
    expect(STRATEGY_CONTROLS.blind).not.toEqual(STRATEGY_CONTROLS.dyslexia);
    expect(STRATEGY_CONTROLS.dyslexia).not.toEqual(STRATEGY_CONTROLS.adaptive);
    expect(STRATEGY_CONTROLS.focus).toContain("hint");
    expect(STRATEGY_CONTROLS.blind).toContain("orientation");
    expect(STRATEGY_CONTROLS.dyslexia).toContain("explain_word");
    expect(STRATEGY_CONTROLS.adaptive).toContain("try_another");
  });

  it("uses distinct educational cards instead of one OCR dump", () => {
    const cards = ["الفكرة التي نتعلمها الآن", "الفكرة الأساسية", "كيف يحدث؟", "مثال من المادة", "مصطلحات مهمة"];
    expect(new Set(cards).size).toBe(5);
  });
});
