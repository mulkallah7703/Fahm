import { describe, expect, it } from "vitest";
import { hasAnswerLeak } from "./answerLeak";

describe("hasAnswerLeak", () => {
  it("flags secret keys and accepts a public assessment payload", () => {
    expect(hasAnswerLeak({ assessment: { question: { correct: "أ" } } })).toBe("assessment.question.correct");
    expect(
      hasAnswerLeak({
        assessment: {
          active: true,
          question: { id: "q1", type: "multiple_choice", text: "؟", options: ["أ", "ب"], difficulty: "easy" },
        },
      }),
    ).toBeNull();
  });
});
