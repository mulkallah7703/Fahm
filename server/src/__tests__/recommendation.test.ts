import { describe, expect, it } from "vitest";
import { recommendationService } from "../services/recommendationService.js";

describe("recommendationService", () => {
  it("prioritizes the weakest concept", () => {
    const result = recommendationService.build({
      reviewConcepts: [
        {
          conceptId: "1",
          name: "التكاثف",
          subject: "العلوم",
          masteryScore: 40,
          status: "needs_review",
        },
      ],
      continueLearning: null,
    });
    expect(result?.action).toBe("review");
    expect(result?.text).toContain("التكاثف");
  });

  it("falls back to continue, then upload", () => {
    const continueRec = recommendationService.build({
      reviewConcepts: [],
      continueLearning: {
        sessionId: "s1",
        materialId: "m1",
        title: "دورة الماء",
        pageNumber: 42,
        stoppedAtConcept: null,
        conceptCount: 3,
        modeCode: "adaptive",
        modeName: "Smart Adaptive Mode",
      },
    });
    expect(continueRec?.action).toBe("continue");
    expect(continueRec?.text).toContain("دورة الماء");

    const uploadRec = recommendationService.build({
      reviewConcepts: [],
      continueLearning: null,
    });
    expect(uploadRec?.action).toBe("upload");
  });
});
