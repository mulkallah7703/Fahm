import { describe, expect, it } from "vitest";
import { decideAdaptation } from "../services/teaching/adaptiveTeachingService.js";

describe("decideAdaptation", () => {
  it("does not change after a single answer", () => {
    const result = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "concise",
      currentDifficulty: "easy",
      consecutiveCorrect: 1,
      consecutiveIncorrect: 0,
      explanationRequests: 0,
      usedHintOnLastCorrect: false,
    });
    expect(result.changed).toBe(false);
  });

  it("simplifies after repeated errors", () => {
    const result = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "concise",
      currentDifficulty: "medium",
      consecutiveCorrect: 0,
      consecutiveIncorrect: 2,
      explanationRequests: 0,
      usedHintOnLastCorrect: false,
    });
    expect(result.changed).toBe(true);
    expect(result.reasonCode).toBe("REPEATED_ERROR");
    expect(result.nextVariant).toBe("simplified");
    expect(result.nextDifficulty).toBe("easy");
    expect(result.studentMessage).toContain("أبسط");
  });

  it("raises difficulty after independent success", () => {
    const result = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "standard",
      currentDifficulty: "easy",
      consecutiveCorrect: 2,
      consecutiveIncorrect: 0,
      explanationRequests: 0,
      usedHintOnLastCorrect: false,
    });
    expect(result.changed).toBe(true);
    expect(result.reasonCode).toBe("GOOD_PERFORMANCE");
    expect(result.nextDifficulty).toBe("medium");
  });

  it("does not adapt after a single explanation request", () => {
    const result = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "standard",
      currentDifficulty: "medium",
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      explanationRequests: 1,
      usedHintOnLastCorrect: false,
    });
    expect(result.changed).toBe(false);
  });

  it("simplifies after repeated explanation requests", () => {
    const result = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "standard",
      currentDifficulty: "medium",
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      explanationRequests: 2,
      usedHintOnLastCorrect: false,
    });
    expect(result.changed).toBe(true);
    expect(result.reasonCode).toBe("EXPLANATION_REQUESTS");
    expect(result.nextVariant).toBe("simplified");
  });

  it("moves from simplified to example after more explanation requests", () => {
    const result = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "simplified",
      currentDifficulty: "easy",
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      explanationRequests: 2,
      usedHintOnLastCorrect: false,
    });
    expect(result.nextVariant).toBe("example");
    expect(result.reasonCode).toBe("EXPLANATION_REQUESTS");
  });

  it("uses replay only when it is a repeated signal on a direct explanation", () => {
    const weak = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "standard",
      currentDifficulty: "medium",
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      explanationRequests: 0,
      usedHintOnLastCorrect: false,
      replayCount: 1,
    });
    expect(weak.changed).toBe(false);
    const ready = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "standard",
      currentDifficulty: "medium",
      consecutiveCorrect: 0,
      consecutiveIncorrect: 0,
      explanationRequests: 0,
      usedHintOnLastCorrect: false,
      replayCount: 2,
    });
    expect(ready.changed).toBe(true);
    expect(ready.reasonCode).toBe("REPLAY_DIFFICULTY");
    expect(ready.nextVariant).toBe("example");
  });

  it("does not raise difficulty when the last correct used a hint", () => {
    const result = decideAdaptation({
      adaptiveEnabled: true,
      currentVariant: "standard",
      currentDifficulty: "easy",
      consecutiveCorrect: 2,
      consecutiveIncorrect: 0,
      explanationRequests: 0,
      usedHintOnLastCorrect: true,
    });
    expect(result.changed).toBe(false);
  });
});
