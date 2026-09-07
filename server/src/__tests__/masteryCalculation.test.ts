import { describe, expect, it } from "vitest";
import {
  computeConceptScore,
  computeOverallPulse,
  recencyWeight,
} from "../services/masteryCalculationService.js";
import { pulseStatusFromScore } from "../config/learningPulse.js";
import type { MasteryRow } from "../types/index.js";

function row(partial: Partial<MasteryRow>): MasteryRow {
  return {
    conceptId: "c1",
    conceptName: "التكاثف",
    subject: "العلوم",
    masteryScore: 50,
    masteryStatus: "needs_review",
    attemptsCount: 4,
    correctAnswers: 2,
    incorrectAnswers: 2,
    explanationCount: 1,
    lastInteractionAt: new Date(),
    ...partial,
  };
}

describe("pulseStatusFromScore", () => {
  it("maps deterministic thresholds", () => {
    expect(pulseStatusFromScore(0)).toBe("needs_significant_support");
    expect(pulseStatusFromScore(39)).toBe("needs_significant_support");
    expect(pulseStatusFromScore(40)).toBe("needs_review");
    expect(pulseStatusFromScore(69)).toBe("needs_review");
    expect(pulseStatusFromScore(70)).toBe("good");
    expect(pulseStatusFromScore(84)).toBe("good");
    expect(pulseStatusFromScore(85)).toBe("strong");
    expect(pulseStatusFromScore(100)).toBe("strong");
  });
});

describe("computeOverallPulse", () => {
  it("returns null when there is no mastery data", () => {
    expect(computeOverallPulse([])).toBeNull();
  });

  it("averages stored mastery scores", () => {
    const result = computeOverallPulse([
      row({ masteryScore: 80, lastInteractionAt: new Date() }),
      row({ conceptId: "c2", masteryScore: 60, lastInteractionAt: new Date() }),
    ]);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(70);
    expect(result!.status).toBe("good");
  });

  it("is reproducible for the same inputs", () => {
    const now = new Date("2026-09-06T12:00:00.000Z");
    const rows = [row({ lastInteractionAt: now, masteryScore: 74 })];
    expect(computeOverallPulse(rows, now)).toEqual(computeOverallPulse(rows, now));
  });
});

describe("computeConceptScore", () => {
  it("rewards accuracy and stays within 0-100", () => {
    const score = computeConceptScore(
      row({
        attemptsCount: 10,
        correctAnswers: 10,
        incorrectAnswers: 0,
        explanationCount: 0,
        lastInteractionAt: new Date(),
      }),
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(70);
  });
});

describe("recencyWeight", () => {
  it("is 1 when there is no interaction date", () => {
    expect(recencyWeight(null)).toBe(1);
  });
});
