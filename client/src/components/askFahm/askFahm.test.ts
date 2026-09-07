import { describe, expect, it } from "vitest";
import { hasAnswerLeak } from "../../utils/answerLeak";

describe("ask FAHM payload safety", () => {
  it("accepts a public conversation without scoring secrets", () => {
    expect(
      hasAnswerLeak({
        conversation: {
          messages: [{ id: "1", role: "fahm", text: "التبخر تحول الماء إلى بخار.", sourceLabel: "المصدر: مفهوم التبخر" }],
        },
      }),
    ).toBeNull();
  });
});
