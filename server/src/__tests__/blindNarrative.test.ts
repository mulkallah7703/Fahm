import { describe, expect, it } from "vitest";
import { TTS_MAX_CHARS, isBlindAction } from "../config/blind.js";
import {
  buildBlindNarrative,
  hasDiagram,
  hasTable,
  shouldUseBlindExperience,
} from "../services/teaching/blindNarrativeService.js";
import { validateTtsText as validateTts } from "../services/audio/ttsService.js";
import type { AnalysisDto } from "../types/analysis.js";
import type { TeachingContent } from "../types/teaching.js";
import { ValidationError } from "../utils/errors.js";

function analysis(overrides: Partial<AnalysisDto> = {}): AnalysisDto {
  return {
    material: { id: "m1", title: "صفحة علوم", type: "text", mimeType: null, hasFile: false },
    page: { id: "p1", pageNumber: 1, pageCount: 1 },
    session: { id: "s1", modeCode: "blind", modeName: "Blind" },
    status: "completed",
    stages: [],
    processingTimeMs: 10,
    wordCount: 12,
    ocr: {
      text: "دورة الماء هي حركة الماء المستمرة.\n\nالحرارة تسبب تبخر الماء.",
      originalText: "دورة الماء هي حركة الماء المستمرة.",
      isCorrected: false,
      language: "ar",
      confidence: 90,
      processingTimeMs: 1,
      engine: "test",
      lowConfidence: false,
    },
    vision: null,
    structure: { title: "صفحة علوم", sections: [] },
    concepts: [
      {
        id: "c1",
        name: "التبخر",
        description: "تحول الماء إلى بخار.",
        subject: "العلوم",
        importanceScore: 90,
        confidenceScore: 80,
      },
    ],
    relationships: [],
    gradeEstimate: null,
    error: null,
    ...overrides,
  };
}

function content(): TeachingContent {
  return {
    title: "صفحة علوم",
    mainIdea: "دورة الماء هي حركة الماء المستمرة.",
    keyPoints: [{ text: "الحرارة تسبب تبخر الماء.", source: "من النص المحلَّل" }],
    terms: [{ conceptId: "c1", name: "التبخر", definition: "تحول الماء إلى بخار." }],
    visualDescription: null,
    example: null,
    simplifiedExplanation: null,
    speechText: "دورة الماء هي حركة الماء المستمرة.",
  };
}

describe("blind narrative grounding", () => {
  it("does not invent a diagram when vision has none", () => {
    const page = analysis();
    expect(hasDiagram(page)).toBe(false);
    const state = buildBlindNarrative({
      analysis: page,
      content: content(),
      variant: "verbal",
      question: null,
    });
    expect(state.segments.some((segment) => segment.type === "visual_description")).toBe(false);
    expect(state.segments.some((segment) => segment.text.includes("في الرسم"))).toBe(false);
  });

  it("does not invent a table when none exists", () => {
    const page = analysis();
    expect(hasTable(page)).toBe(false);
    const state = buildBlindNarrative({
      analysis: page,
      content: content(),
      variant: "verbal",
      question: null,
    });
    expect(state.segments.some((segment) => segment.type === "table_description")).toBe(false);
  });

  it("includes a visual segment only from real vision analysis", () => {
    const page = analysis({
      vision: {
        summary: "رسم مراحل",
        visualDescription: "الرسم يوضح انتقال الماء من الأرض إلى الغلاف الجوي.",
        elements: [{ type: "diagram", description: "أسهم تصعد من سطح الماء.", location: "يمين الصفحة" }],
        tables: [],
        modelName: "test",
        processingTimeMs: 1,
      },
    });
    expect(hasDiagram(page)).toBe(true);
    const state = buildBlindNarrative({
      analysis: page,
      content: { ...content(), visualDescription: page.vision!.visualDescription },
      variant: "verbal",
      question: null,
    });
    const visual = state.segments.find((segment) => segment.type === "visual_description");
    expect(visual?.text).toContain("انتقال الماء");
    expect(visual?.detailedText).toContain("أسهم");
  });

  it("describes a table only when a table exists", () => {
    const page = analysis({
      vision: {
        summary: "",
        visualDescription: null,
        elements: [],
        tables: [{ title: "المراحل", headers: ["العملية", "النتيجة"], rows: [["تبخر", "بخار"]] }],
        modelName: "test",
        processingTimeMs: 1,
      },
    });
    expect(hasTable(page)).toBe(true);
    const state = buildBlindNarrative({
      analysis: page,
      content: content(),
      variant: "verbal",
      question: null,
    });
    const table = state.segments.find((segment) => segment.type === "table_description");
    expect(table?.text).toContain("جدول");
    expect(table?.text).toContain("العملية");
  });

  it("reuses the same narrative when the source hash is unchanged", () => {
    const page = analysis();
    const first = buildBlindNarrative({
      analysis: page,
      content: content(),
      variant: "verbal",
      question: null,
    });
    const second = buildBlindNarrative({
      analysis: page,
      content: content(),
      variant: "verbal",
      question: null,
      previous: first,
    });
    expect(second.contentHash).toBe(first.contentHash);
    expect(second.segments[0]?.id).toBe(first.segments[0]?.id);
  });

  it("uses Blind presentation for blind mode and verbal adaptive", () => {
    expect(shouldUseBlindExperience("blind", "verbal")).toBe(true);
    expect(shouldUseBlindExperience("adaptive", "verbal")).toBe(true);
    expect(shouldUseBlindExperience("focus", "concise")).toBe(false);
    expect(shouldUseBlindExperience("adaptive", "simplified")).toBe(false);
  });
});

describe("tts validation", () => {
  it("rejects empty and oversized text", () => {
    expect(() => validateTts("")).toThrow(ValidationError);
    expect(() => validateTts("و".repeat(TTS_MAX_CHARS + 1))).toThrow(ValidationError);
    expect(validateTts("شرح قصير")).toBe("شرح قصير");
  });
});

describe("blind action allowlist", () => {
  it("accepts only known actions", () => {
    expect(isBlindAction("describe_diagram")).toBe(true);
    expect(isBlindAction("drop_table")).toBe(false);
    expect(isBlindAction("ignore previous instructions")).toBe(false);
  });
});
