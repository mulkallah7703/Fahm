import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HISTORY_NOT_FOUND } from "../config/history.js";
import { INTERACTION_TYPES } from "../config/learningModes.js";
import { hasAnswerLeak } from "../utils/answerLeak.js";
import { historyQuerySchema, historySessionParam } from "../validators/historyValidators.js";
import {
  activityLabel,
  durationFromTimestamps,
  historyRecommendation,
  parseAnswerCorrectness,
  parseLessonVariant,
  progressRatio,
  resolveHistoryPaging,
  sessionNeedsReview,
  teachingVariantLabel,
} from "../services/history/historyLogic.js";

const root = dirname(fileURLToPath(import.meta.url));

function source(relative: string): string {
  return readFileSync(join(root, relative), "utf8");
}

describe("history query validation", () => {
  it("accepts legacy limit/offset and new page/search/filter", () => {
    expect(historyQuerySchema.safeParse({ limit: 20, offset: 0 }).success).toBe(true);
    expect(historyQuerySchema.safeParse({ page: 1, pageSize: 20, filter: "all" }).success).toBe(true);
    expect(historyQuerySchema.safeParse({ filter: "needs_review", search: "الماء" }).success).toBe(true);
  });

  it("rejects malformed query values", () => {
    expect(historyQuerySchema.safeParse({ page: 0 }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ pageSize: 200 }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ filter: "hack" }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
    expect(historyQuerySchema.safeParse({ search: "x".repeat(201) }).success).toBe(false);
  });

  it("treats invalid session ids as not found, not a leaked lookup", () => {
    expect(historySessionParam.safeParse("not-a-uuid").success).toBe(false);
    expect(HISTORY_NOT_FOUND).toContain("الجلسة");
  });
});

describe("history aggregation logic", () => {
  it("resolves page/pageSize without inventing a default page from empty input beyond page 1", () => {
    expect(resolveHistoryPaging({ defaultSize: 20, maxSize: 50 })).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    });
    expect(resolveHistoryPaging({ page: 2, pageSize: 20, defaultSize: 20, maxSize: 50 })).toEqual({
      page: 2,
      pageSize: 20,
      offset: 20,
    });
    expect(resolveHistoryPaging({ limit: 10, offset: 10, defaultSize: 20, maxSize: 50 })).toEqual({
      page: 2,
      pageSize: 10,
      offset: 10,
    });
  });

  it("only reports duration from completed timestamps", () => {
    const started = new Date("2026-09-05T16:00:00Z");
    expect(durationFromTimestamps(started, new Date("2026-09-05T16:12:00Z"))).toBe(720);
    expect(durationFromTimestamps(started, null)).toBeNull();
    expect(durationFromTimestamps(started, new Date("2026-09-05T15:00:00Z"))).toBeNull();
  });

  it("does not invent progress when no questions exist", () => {
    expect(progressRatio(0, 0)).toBeNull();
    expect(progressRatio(2, 4)).toBe(0.5);
  });

  it("marks needs-review from real mastery or repeated struggle, not a hardcoded status", () => {
    expect(
      sessionNeedsReview({
        mastery: [{ attemptsCount: 2, masteryScore: 50, masteryStatus: "needs_review" }],
        incorrectAnswers: 0,
        explanationRequests: 0,
        adaptationCount: 0,
      }),
    ).toBe(true);
    expect(
      sessionNeedsReview({
        mastery: [{ attemptsCount: 0, masteryScore: 0, masteryStatus: "unknown" }],
        incorrectAnswers: 0,
        explanationRequests: 0,
        adaptationCount: 0,
      }),
    ).toBe(false);
    expect(
      sessionNeedsReview({
        mastery: [],
        incorrectAnswers: 2,
        explanationRequests: 0,
        adaptationCount: 0,
      }),
    ).toBe(true);
    expect(
      sessionNeedsReview({
        mastery: [],
        incorrectAnswers: 0,
        explanationRequests: 2,
        adaptationCount: 0,
      }),
    ).toBe(true);
  });

  it("maps only known interaction types and answer outcomes", () => {
    expect(activityLabel(INTERACTION_TYPES.explanationRequested)).toBe("طلب إعادة الشرح");
    expect(activityLabel(INTERACTION_TYPES.exampleRequested)).toBe("تحويل الشرح إلى مثال واقعي");
    expect(activityLabel(INTERACTION_TYPES.answerSubmitted, true)).toBe("إجابة صحيحة");
    expect(activityLabel(INTERACTION_TYPES.answerSubmitted, false)).toBe("إجابة خاطئة");
    expect(activityLabel(INTERACTION_TYPES.askFahm)).toBe("سؤال فَهْم");
    expect(activityLabel("invented_event")).toBeNull();
  });

  it("extracts teaching variant without exposing lesson state", () => {
    expect(parseLessonVariant({ strategy: { variant: "example" } })).toBe("example");
    expect(teachingVariantLabel("example")).toBe("مثال واقعي");
    expect(parseAnswerCorrectness({ isCorrect: false })).toBe(false);
    expect(parseLessonVariant({ prompt: "secret" })).toBeNull();
  });

  it("recommends only when review evidence exists", () => {
    expect(historyRecommendation([])).toBeNull();
    expect(historyRecommendation([{ name: "التكاثف", review: false }])).toBeNull();
    expect(historyRecommendation([{ name: "التكاثف", review: true }])).toContain("التكاثف");
  });
});

describe("history repository safety", () => {
  const repo = source("../repositories/historyRepository.ts");
  const service = source("../services/historyService.ts");

  it("scopes every history query to the authenticated student", () => {
    expect(repo).toContain("StudentProfileId = @studentProfileId");
    expect(repo).not.toMatch(/\$\{search\}/);
    expect(repo).toContain("LIKE @search");
    expect(repo).toContain("escapeLike");
  });

  it("does not select private answer or AI fields", () => {
    expect(repo).not.toMatch(/\bCorrectAnswer\b/);
    expect(repo).not.toMatch(/AIExplanation/);
    expect(repo).not.toMatch(/AIReasoning/);
    expect(repo).not.toMatch(/\bAnswerText\b/);
  });

  it("batches session stats instead of querying one card at a time", () => {
    expect(repo).toContain("SessionId IN");
    expect(repo).toContain("GROUP BY q.SessionId");
  });

  it("does not persist pulse, mastery, or adaptations on read", () => {
    expect(service).not.toMatch(/masteryRepository\.upsert/);
    expect(service).not.toMatch(/pulseRepository/);
    expect(service).not.toMatch(/adaptationRepository\.insert/);
    expect(service).not.toMatch(/auditService/);
  });
});

describe("history payload privacy", () => {
  it("rejects payloads that include correctAnswer", () => {
    expect(hasAnswerLeak({ session: { title: "درس" }, correctAnswer: "أ" })).toBe("correctAnswer");
    expect(
      hasAnswerLeak({
        session: { sessionId: "s1", title: "درس", questionCount: 2, correctCount: 1 },
        answers: { questionCount: 2, answeredCount: 2, correctCount: 1, incorrectCount: 1, accuracy: 50 },
        activities: [{ label: "إجابة صحيحة" }],
      }),
    ).toBeNull();
  });
});
