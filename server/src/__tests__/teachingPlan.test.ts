import { describe, expect, it } from "vitest";
import { LEARNING_MODE_CONFIGS } from "../config/learningModes.js";
import { hasAnswerLeak } from "../utils/answerLeak.js";
import type { AnalysisDto } from "../types/analysis.js";
import { stepTypesFor } from "../services/teaching/lessonPlanService.js";
import { buildTeachingContent } from "../services/teaching/teachingContentService.js";
import { buildGroundedQuestion, toPublicQuestion } from "../services/teaching/questionFactory.js";
import { buildTeachingPlan, plansDiffer } from "../services/teaching/teachingPlan.js";
import { extractLocalConcepts, isConceptToken } from "../services/concepts/localConcepts.js";

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
    relationships: [],
    gradeEstimate: null,
    error: null,
    ...overrides,
  };
}

describe("mode-specific teaching plans", () => {
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
    expect(focus.teachOneConceptAtATime).toBe(true);
    expect(blind.audioFirst).toBe(true);
    expect(dyslexia.readingFirst).toBe(true);
    expect(adaptive.observesEvidence).toBe(true);
    expect(focus.sequence.map((item) => item.kind).join(">")).not.toBe(
      adaptive.sequence.map((item) => item.kind).join(">"),
    );
  });

  it("keeps focus concise and checks after teaching", () => {
    const focus = buildTeachingPlan({ analysis: analysis(), mode: "focus", variant: "concise" });
    expect(focus.concepts.length).toBeLessThanOrEqual(3);
    expect(focus.questionStyle).toBe("short_direct");
    expect(focus.sequence.some((item) => item.kind === "check")).toBe(true);
    expect(focus.sequence.some((item) => item.kind === "orientation")).toBe(false);
    expect(stepTypesFor("focus", analysis()).includes("check_question")).toBe(true);
  });

  it("keeps blind audio-first and never invents a diagram", () => {
    const blind = buildTeachingPlan({ analysis: analysis(), mode: "blind", variant: "verbal" });
    expect(blind.sequence[0]?.kind).toBe("orientation");
    expect(blind.sequence.some((item) => item.kind === "visual")).toBe(false);
    const content = buildTeachingContent(analysis(), LEARNING_MODE_CONFIGS.blind, "verbal");
    expect(content.visualDescription).toBeNull();
    expect(content.speechText).toContain("سنبدأ بصفحة");
  });

  it("keeps dyslexia reading-first with vocabulary and short chunks", () => {
    const dyslexia = buildTeachingPlan({ analysis: analysis(), mode: "dyslexia", variant: "simplified" });
    expect(dyslexia.readingFirst).toBe(true);
    expect(dyslexia.controls).toContain("explain_word");
    const content = buildTeachingContent(analysis(), LEARNING_MODE_CONFIGS.dyslexia, "simplified");
    expect(content.simplifiedExplanation).toBeTruthy();
    expect(content.terms[0]?.name).toBe("دورة الماء");
  });

  it("collapses split stored tokens into a multiword educational phrase", () => {
    const page = analysis({
      concepts: [
        { id: "c1", name: "دورة", description: null, subject: "العلوم", importanceScore: 90, confidenceScore: 40 },
        { id: "c2", name: "الماء", description: null, subject: "العلوم", importanceScore: 80, confidenceScore: 40 },
        { id: "c3", name: "التبخر", description: "تحول الماء إلى بخار الماء.", subject: "العلوم", importanceScore: 70, confidenceScore: 80 },
      ],
    });
    const focus = buildTeachingPlan({ analysis: page, mode: "focus", variant: "concise" });
    const names = focus.concepts.map((item) => item.name);
    expect(names).toContain("دورة الماء");
    expect(names).not.toContain("دورة");
  });

  it("is deterministic for the same material and mode", () => {
    const page = analysis();
    const first = buildTeachingPlan({ analysis: page, mode: "focus", variant: "concise" });
    const second = buildTeachingPlan({ analysis: page, mode: "focus", variant: "concise" });
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.sequence.map((item) => item.kind)).toEqual(second.sequence.map((item) => item.kind));
  });

  it("keeps adaptive observing evidence without changing mode", () => {
    const adaptive = buildTeachingPlan({ analysis: analysis(), mode: "adaptive", variant: "simplified" });
    expect(adaptive.mode).toBe("adaptive");
    expect(adaptive.variant).toBe("simplified");
    expect(adaptive.observesEvidence).toBe(true);
    expect(adaptive.label).toBe("يتكيف مع فهمك");
  });

  it("does not treat a Vision summary as a diagram", () => {
    const summaryOnly = analysis({
      vision: {
        summary: "دورة الماء: التبخر من السائل إلى البخار.",
        visualDescription: null,
        elements: [],
        tables: [],
        modelName: "fahm-local-vision",
        processingTimeMs: 0,
      },
    });
    const blind = buildTeachingPlan({ analysis: summaryOnly, mode: "blind", variant: "verbal" });
    expect(blind.sequence.some((item) => item.kind === "visual")).toBe(false);
    const content = buildTeachingContent(summaryOnly, LEARNING_MODE_CONFIGS.blind, "verbal");
    expect(content.visualDescription).toBeNull();
  });

  it("describes a visual only when Vision evidence exists", () => {
    const withDiagram = analysis({
      vision: {
        summary: "رسم يوضح تحول الماء.",
        visualDescription: "سهم من الماء السائل إلى بخار الماء.",
        elements: [{ type: "diagram", description: "دورة مبسطة للتبخر" }],
        tables: [],
        modelName: "test",
        processingTimeMs: 1,
      },
    });
    const blind = buildTeachingPlan({ analysis: withDiagram, mode: "blind", variant: "verbal" });
    expect(blind.sequence.some((item) => item.kind === "visual")).toBe(true);
    const content = buildTeachingContent(withDiagram, LEARNING_MODE_CONFIGS.blind, "verbal");
    expect(content.visualDescription).toContain("سهم من الماء السائل");
    const focus = buildTeachingContent(withDiagram, LEARNING_MODE_CONFIGS.focus, "concise");
    expect(focus.visualDescription).toBeNull();
  });

  it("writes grounded explanations and refuses missing facts", () => {
    const content = buildTeachingContent(analysis(), LEARNING_MODE_CONFIGS.focus, "concise");
    expect(content.mainIdea).toContain("دورة الماء");
    expect(content.mainIdea).not.toContain("مفهوم يظهر في هذه الصفحة");
    const empty = analysis({
      ocr: null,
      concepts: [{ id: "c9", name: "الهطول", description: null, subject: null, importanceScore: 10, confidenceScore: 10 }],
    });
    const missing = buildTeachingContent(empty, LEARNING_MODE_CONFIGS.focus, "concise");
    expect(missing.terms[0]?.definition).toContain("لا تحتوي الصفحة");
  });

  it("asks different grounded questions per mode without leaking answers", () => {
    const page = analysis();
    const focus = buildGroundedQuestion(page, "easy", "focus");
    const blind = buildGroundedQuestion(page, "easy", "blind");
    const adaptive = buildGroundedQuestion(page, "easy", "adaptive");
    expect(focus?.type).toBe("true_false");
    expect(blind?.text).toContain("أجب بنعم أو لا");
    expect(adaptive?.type).toBe("multiple_choice");
    const publicFocus = toPublicQuestion("q-focus", focus!);
    expect(hasAnswerLeak(publicFocus)).toBeNull();
    expect(JSON.stringify(publicFocus)).not.toContain("correctAnswer");
    expect(publicFocus).not.toHaveProperty("secret");
  });
});

describe("concept quality", () => {
  it("filters generic words and preserves multiword educational phrases", () => {
    const result = extractLocalConcepts(
      "كيف ثم في من تفعل نافذة جوها. دورة الماء هي حركة مستمرة للماء. التبخر يحول الماء إلى بخار.",
    );
    const names = result.concepts.map((item) => item.name);
    expect(names.some((name) => name.includes("دورة الماء"))).toBe(true);
    expect(names).not.toContain("كيف");
    expect(names).not.toContain("ثم");
    expect(names).not.toContain("تفعل");
    expect(names).not.toContain("نافذة");
    expect(isConceptToken("كيف")).toBe(false);
  });
});
