import { describe, expect, it } from "vitest";
import { scoreModeEffectiveness } from "../services/learning/modeEffectivenessService.js";

describe("scoreModeEffectiveness", () => {
  it("returns empty when there is not enough data", () => {
    expect(scoreModeEffectiveness([])).toEqual([]);
    expect(
      scoreModeEffectiveness([{ isCorrect: true, modeCode: "focus", createdAt: new Date() }]),
    ).toEqual([]);
  });

  it("ranks modes by recent correctness without claiming causality", () => {
    const ranked = scoreModeEffectiveness([
      { isCorrect: true, modeCode: "focus", createdAt: new Date() },
      { isCorrect: true, modeCode: "focus", createdAt: new Date() },
      { isCorrect: false, modeCode: "adaptive", createdAt: new Date() },
      { isCorrect: false, modeCode: "adaptive", createdAt: new Date() },
    ]);
    expect(ranked[0]?.mode).toBe("focus");
    expect(ranked[0]?.score).toBe(1);
    expect(ranked[1]?.mode).toBe("adaptive");
    expect(ranked[1]?.score).toBe(0);
  });
});
