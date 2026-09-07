import { describe, expect, it } from "vitest";
import { evaluateAnswer, feedbackFor } from "../services/teaching/answerEvaluationService.js";

describe("evaluateAnswer", () => {
  it("scores multiple choice server-side", () => {
    const correct = evaluateAnswer({
      type: "multiple_choice",
      submitted: "التبخر",
      secret: { correct: "التبخر", options: ["التبخر", "الهطول"] },
    });
    const wrong = evaluateAnswer({
      type: "multiple_choice",
      submitted: "الهطول",
      secret: { correct: "التبخر", options: ["التبخر", "الهطول"] },
    });
    expect(correct.isCorrect).toBe(true);
    expect(wrong.isCorrect).toBe(false);
  });

  it("normalizes Arabic variants", () => {
    const result = evaluateAnswer({
      type: "short_answer",
      submitted: "إبخر",
      secret: { correct: "أبخر", aliases: ["تبخر"] },
    });
    expect(result.isCorrect).toBe(true);
  });
});

describe("feedbackFor", () => {
  it("does not shame the student", () => {
    const feedback = feedbackFor(false, false, "راجع الفكرة الأساسية.");
    expect(feedback.message).toContain("لنراجع");
    expect(feedback.message).not.toMatch(/خطأ!|أنت لا تفهم/);
  });

  it("treats hinted success as partial", () => {
    const feedback = feedbackFor(true, true, null);
    expect(feedback.type).toBe("partial");
  });
});
