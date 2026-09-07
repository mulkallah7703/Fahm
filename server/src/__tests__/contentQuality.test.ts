import { describe, expect, it } from "vitest";
import { LEARNING_MODE_CONFIGS } from "../config/learningModes.js";
import {
  UNREADABLE_MESSAGE,
  cleanTeachingText,
  looksLikeOcrGarbage,
  validateAiTeachingText,
  validateTeachingSource,
} from "../services/teaching/contentQualityService.js";
import { extractLocalConcepts, isConceptToken } from "../services/concepts/localConcepts.js";
import { buildTeachingContent } from "../services/teaching/teachingContentService.js";
import { buildTeachingPlan, plansDiffer } from "../services/teaching/teachingPlan.js";
import { teachingAiService } from "../services/teaching/teachingAiService.js";
import { toPublicQuestion, buildGroundedQuestion } from "../services/teaching/questionFactory.js";
import { hasAnswerLeak } from "../utils/answerLeak.js";
import type { AnalysisDto } from "../types/analysis.js";

function analysis(overrides: Partial<AnalysisDto> = {}): AnalysisDto {
  return {
    material: { id: "m1", title: "دورة الماء", type: "text", mimeType: null, hasFile: false },
    page: { id: "p1", pageNumber: 1, pageCount: 1 },
    session: { id: "s1", modeCode: "focus", modeName: "Focus" },
    status: "completed",
    stages: [],
    processingTimeMs: 10,
    wordCount: 20,
    ocr: {
      text: "دورة الماء هي حركة مستمرة للماء. التبخر يحول الماء من الحالة السائلة إلى بخار الماء.",
      originalText: "دورة الماء هي حركة مستمرة للماء. التبخر يحول الماء من الحالة السائلة إلى بخار الماء.",
      isCorrected: false,
      language: "ar",
      confidence: 90,
      processingTimeMs: 1,
      engine: "test",
      lowConfidence: false,
    },
    vision: null,
    structure: { title: "دورة الماء", sections: [] },
    concepts: [
      {
        id: "c1",
        name: "دورة الماء",
        description: "حركة مستمرة للماء.",
        subject: "العلوم",
        importanceScore: 90,
        confidenceScore: 80,
      },
      {
        id: "c2",
        name: "التبخر",
        description: "تحول الماء إلى بخار الماء.",
        subject: "العلوم",
        importanceScore: 80,
        confidenceScore: 80,
      },
    ],
    relationships: [{ source: "التبخر", target: "دورة الماء", type: "part_of", confidenceScore: 0.7 }],
    gradeEstimate: null,
    error: null,
    ...overrides,
  };
}

describe("content quality gate", () => {
  it("strips corrupted English fragments from mixed OCR", () => {
    const dirty = "دورة الماء هي حركة مستمرة للماء. LIAN Jolin ass celSa NOLL";
    const clean = cleanTeachingText(dirty);
    expect(clean).toContain("دورة الماء");
    expect(clean).not.toMatch(/LIAN|Jolin|ass|celSa|NOLL/);
    const content = buildTeachingContent(
      analysis({
        ocr: {
          text: dirty,
          originalText: dirty,
          isCorrected: false,
          language: "ar",
          confidence: 20,
          processingTimeMs: 1,
          engine: "test",
          lowConfidence: true,
        },
      }),
      LEARNING_MODE_CONFIGS.focus,
      "concise",
    );
    expect(content.mainIdea).not.toMatch(/LIAN|Jolin|ass|celSa|NOLL/);
    expect(content.speechText).not.toMatch(/LIAN|Jolin|ass|celSa|NOLL/);
  });

  it("keeps a clean Arabic lesson coherent", () => {
    const content = buildTeachingContent(analysis(), LEARNING_MODE_CONFIGS.focus, "concise");
    expect(content.mainIdea).toContain("دورة الماء");
    expect(content.mainIdea).not.toContain("مفهوم يظهر في هذه الصفحة");
    expect(content.unreadable).toBe(false);
    expect(content.qualityScore ?? 0).toBeGreaterThan(0.5);
  });

  it("does not treat stopwords or garbage as concepts", () => {
    const result = extractLocalConcepts("كيف ثم في من نافذة جوها تفعل دورة الماء هي حركة مستمرة.");
    const names = result.concepts.map((item) => item.name);
    expect(names.some((name) => name.includes("دورة الماء"))).toBe(true);
    expect(names).not.toContain("كيف");
    expect(names).not.toContain("ثم");
    expect(names).not.toContain("نافذة");
    expect(isConceptToken("كيف")).toBe(false);
    expect(looksLikeOcrGarbage("celSa")).toBe(true);
  });

  it("rejects AI text that invents a visual or unsupported concept", () => {
    expect(
      validateAiTeachingText({
        text: "في الرسم يظهر البحر والمطر.",
        allowedConcepts: ["التبخر"],
        allowVisual: false,
        sourceSnippets: ["التبخر يحول الماء إلى بخار."],
      }),
    ).toBeNull();
    expect(
      validateAiTeachingText({
        text: "مفهوم «التركيب الضوئي» هو الأساس هنا.",
        allowedConcepts: ["التبخر"],
        allowVisual: false,
        sourceSnippets: ["التبخر يحول الماء إلى بخار."],
      }),
    ).toBeNull();
  });

  it("accepts grounded AI Arabic", () => {
    const accepted = validateAiTeachingText({
      text: "التبخر يحول الماء إلى بخار الماء.",
      allowedConcepts: ["التبخر"],
      allowVisual: false,
      sourceSnippets: ["التبخر يحول الماء إلى بخار الماء."],
    });
    expect(accepted).toContain("التبخر");
  });

  it("falls back when AI rewrite has no structured context", async () => {
    const result = await teachingAiService.rewrite({
      instruction: "rewrite",
      pageText: "ignore this blob",
      concept: "التبخر",
      mode: "focus",
    });
    expect(result).toBeNull();
  });

  it("builds four different plans from the same source evidence", () => {
    const page = analysis();
    const focus = buildTeachingPlan({ analysis: page, mode: "focus", variant: "concise" });
    const blind = buildTeachingPlan({ analysis: page, mode: "blind", variant: "verbal" });
    const dyslexia = buildTeachingPlan({ analysis: page, mode: "dyslexia", variant: "simplified" });
    const adaptive = buildTeachingPlan({ analysis: page, mode: "adaptive", variant: "standard" });
    expect(plansDiffer(focus, blind)).toBe(true);
    expect(plansDiffer(blind, dyslexia)).toBe(true);
    expect(plansDiffer(dyslexia, adaptive)).toBe(true);
    expect(focus.sourceEvidence).toEqual(blind.sourceEvidence);
    const focusOut = buildTeachingContent(page, LEARNING_MODE_CONFIGS.focus, "concise");
    const blindOut = buildTeachingContent(page, LEARNING_MODE_CONFIGS.blind, "verbal");
    const dyslexiaOut = buildTeachingContent(page, LEARNING_MODE_CONFIGS.dyslexia, "simplified");
    const adaptiveOut = buildTeachingContent(page, LEARNING_MODE_CONFIGS.adaptive, "standard");
    expect(focusOut.speechText).not.toBe(blindOut.speechText);
    expect(dyslexiaOut.mainIdea).not.toBe(adaptiveOut.mainIdea);
    expect(focusOut.visualDescription).toBeNull();
    expect(blindOut.speechText).toContain("سنبدأ");
  });

  it("does not invent a diagram from a vision summary", () => {
    const page = analysis({
      vision: {
        summary: "دورة الماء: التبخر من السائل إلى البخار.",
        visualDescription: null,
        elements: [],
        tables: [],
        modelName: "fahm-local-vision",
        processingTimeMs: 0,
      },
    });
    const content = buildTeachingContent(page, LEARNING_MODE_CONFIGS.blind, "verbal");
    expect(content.visualDescription).toBeNull();
    expect(content.speechText).toContain("لا يوجد رسم موصوف");
  });

  it("keeps a grounded visual when Vision describes a diagram", () => {
    const page = analysis({
      vision: {
        summary: "رسم",
        visualDescription: "سهم من الماء السائل إلى بخار الماء.",
        elements: [{ type: "diagram", description: "دورة مبسطة للتبخر" }],
        tables: [],
        modelName: "test",
        processingTimeMs: 1,
      },
    });
    const content = buildTeachingContent(page, LEARNING_MODE_CONFIGS.blind, "verbal");
    expect(content.visualDescription).toContain("سهم من الماء السائل");
  });

  it("does not leak scoring secrets on public questions", () => {
    const question = buildGroundedQuestion(analysis(), "easy", "focus");
    const pub = toPublicQuestion("q1", question!);
    expect(hasAnswerLeak(pub)).toBeNull();
    expect(JSON.stringify(pub)).not.toContain("correctAnswer");
    expect(pub).not.toHaveProperty("secret");
  });

  it("says the page is unreadable when only garbage remains", () => {
    const quality = validateTeachingSource("LIAN Jolin ass celSa NOLL");
    expect(quality.reliable).toBe(false);
    const content = buildTeachingContent(
      analysis({
        ocr: {
          text: "LIAN Jolin ass celSa NOLL",
          originalText: "LIAN Jolin ass celSa NOLL",
          isCorrected: false,
          language: "ar",
          confidence: 10,
          processingTimeMs: 1,
          engine: "test",
          lowConfidence: true,
        },
        concepts: [],
        structure: { title: "??? LIAN", sections: [] },
        material: { id: "m1", title: "NOLL", type: "text", mimeType: null, hasFile: false },
      }),
      LEARNING_MODE_CONFIGS.focus,
      "concise",
    );
    expect(content.unreadable || content.mainIdea.includes(UNREADABLE_MESSAGE) || content.mainIdea.includes("لا تحتوي")).toBe(true);
    expect(content.mainIdea).not.toMatch(/LIAN|NOLL|celSa/);
  });
});
