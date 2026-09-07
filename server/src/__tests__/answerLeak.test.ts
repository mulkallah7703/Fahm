import { describe, expect, it } from "vitest";
import { hasAnswerLeak } from "../utils/answerLeak.js";

describe("hasAnswerLeak", () => {
  it("rejects correctAnswer before submission", () => {
    expect(hasAnswerLeak({ question: { id: "q", text: "؟", correctAnswer: "أ" } })).toBe("question.correctAnswer");
    expect(hasAnswerLeak({ question: { id: "q", text: "؟", options: ["أ", "ب"] } })).toBeNull();
  });
});
