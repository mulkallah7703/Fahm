import { describe, expect, it } from "vitest";
import { applyAnswerToMastery } from "../services/teaching/masteryUpdateService.js";

describe("applyAnswerToMastery", () => {
  it("increases mastery after a correct answer", () => {
    const afterWrong = applyAnswerToMastery(null, {
      conceptId: "c1",
      conceptName: "التبخر",
      subject: "العلوم",
      correct: false,
      usedHint: false,
      explanationRequested: false,
    });
    const afterCorrect = applyAnswerToMastery(afterWrong, {
      conceptId: "c1",
      conceptName: "التبخر",
      subject: "العلوم",
      correct: true,
      usedHint: false,
      explanationRequested: false,
    });
    expect(afterCorrect.attemptsCount).toBe(2);
    expect(afterCorrect.correctAnswers).toBe(1);
    expect(afterCorrect.masteryScore).toBeGreaterThan(afterWrong.masteryScore);
  });

  it("penalizes hinted success versus independent success", () => {
    const hinted = applyAnswerToMastery(null, {
      conceptId: "c1",
      conceptName: "التبخر",
      subject: null,
      correct: true,
      usedHint: true,
      explanationRequested: false,
    });
    const independent = applyAnswerToMastery(null, {
      conceptId: "c1",
      conceptName: "التبخر",
      subject: null,
      correct: true,
      usedHint: false,
      explanationRequested: false,
    });
    expect(hinted.explanationCount).toBe(1);
    expect(independent.masteryScore).toBeGreaterThanOrEqual(hinted.masteryScore);
  });
});

describe("mastery update triggers", () => {
  it("updates mastery only from evaluated answers, not reading or listening", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const lesson = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../services/teaching/lessonService.ts"),
      "utf8",
    );
    const blind = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../services/teaching/blindTeachingService.ts"),
      "utf8",
    );
    const dyslexia = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../services/teaching/dyslexiaTeachingService.ts"),
      "utf8",
    );
    expect(lesson).toMatch(/async submitAnswer[\s\S]*applyAnswerToMastery\(/);
    expect(lesson.match(/applyAnswerToMastery\(/g)).toHaveLength(1);
    expect(lesson).not.toMatch(/async advance[\s\S]{0,800}applyAnswerToMastery/);
    expect(blind).not.toContain("applyAnswerToMastery");
    expect(dyslexia).not.toContain("applyAnswerToMastery");
  });
});
