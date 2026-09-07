import { describe, expect, it } from "vitest";
import { LEARNING_MODE_CONFIGS } from "../config/learningModes.js";
import { buildTeachingContent } from "../services/teaching/teachingContentService.js";
import { buildConceptQuestion, buildFollowUpQuestion, buildGroundedQuestion, toPublicQuestion } from "../services/teaching/questionFactory.js";
import { hasAnswerLeak } from "../utils/answerLeak.js";
import type { AnalysisDto } from "../types/analysis.js";

function analysis(): AnalysisDto {
  return {
    material: { id: "m1", title: "صفحة علوم", type: "text", mimeType: null, hasFile: false },
    page: { id: "p1", pageNumber: 1, pageCount: 1 },
    session: { id: "s1", modeCode: "focus", modeName: "Focus" },
    status: "completed",
    stages: [],
    processingTimeMs: 10,
    wordCount: 12,
    ocr: {
      text: "دورة الماء هي حركة الماء المستمرة. الحرارة تسبب تبخر الماء.",
      originalText: "دورة الماء هي حركة الماء المستمرة. الحرارة تسبب تبخر الماء.",
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
      {
        id: "c2",
        name: "التكاثف",
        description: "تحول البخار إلى سائل.",
        subject: "العلوم",
        importanceScore: 70,
        confidenceScore: 80,
      },
    ],
    relationships: [],
    gradeEstimate: null,
    error: null,
  };
}

describe("buildTeachingContent", () => {
  it("uses analyzed text and concepts only", () => {
    const content = buildTeachingContent(analysis(), LEARNING_MODE_CONFIGS.focus, "concise");
    expect(content.mainIdea).toContain("التبخر");
    expect(content.mainIdea).not.toContain("مفهوم يظهر في هذه الصفحة");
    expect(content.keyPoints.length).toBeGreaterThan(0);
    expect(content.terms.map((term) => term.name)).toContain("التبخر");
    expect(content.visualDescription).toBeNull();
  });
});

describe("buildGroundedQuestion", () => {
  it("does not invent extra options", () => {
    const question = buildGroundedQuestion(analysis(), "easy", "adaptive");
    expect(question).not.toBeNull();
    expect(question?.type).toBe("multiple_choice");
    expect(question?.options).toEqual(["التبخر", "التكاثف"]);
    expect(question?.secret.correct).toBe("التبخر");
  });

  it("builds a per-concept question from page concepts only", () => {
    const page = analysis();
    const question = buildConceptQuestion(page, page.concepts[1], [page.concepts[0]], "medium");
    expect(question.conceptId).toBe("c2");
    expect(question.options?.every((option) => option.includes("التبخر") || option.includes("التكاثف") || option.includes("بخار") || option.includes("سائل"))).toBe(true);
    expect(question.options?.join(" ")).not.toContain("البرمجة");
    expect(JSON.stringify(question)).not.toContain("correctAnswer");
    const publicQuestion = toPublicQuestion("q1", question);
    expect(hasAnswerLeak(publicQuestion)).toBeNull();
    expect(publicQuestion).not.toHaveProperty("secret");
    expect(publicQuestion).not.toHaveProperty("correctAnswer");
  });

  it("asks a grounded follow-up without inventing options", () => {
    const follow = buildFollowUpQuestion(analysis(), "c1", "easy");
    expect(follow?.type).toBe("true_false");
    expect(follow?.text).toContain("التكاثف");
    expect(follow?.secret.correct).toBe("نعم");
  });
});
