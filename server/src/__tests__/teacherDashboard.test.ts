import { describe, expect, it } from "vitest";
import { teacherDashboardQuery, teacherRangeSchema } from "../validators/teacherValidators.js";
import {
  classAverage,
  escapeLike,
  percentParts,
  rangeStart,
  recommendTeacher,
} from "../services/teacher/teacherMetrics.js";
import type { MasteryRow } from "../types/index.js";

function mastery(score: number, attempts = 2): MasteryRow {
  return {
    conceptId: "c1",
    conceptName: "فكرة",
    subject: null,
    masteryScore: score,
    masteryStatus: score >= 85 ? "strong" : score <= 39 ? "weak" : "needs_review",
    attemptsCount: attempts,
    correctAnswers: score >= 70 ? 2 : 0,
    incorrectAnswers: score >= 70 ? 0 : 2,
    explanationCount: 0,
    lastInteractionAt: new Date("2026-09-01"),
  };
}

describe("teacher dashboard metrics", () => {
  it("uses real date ranges for week and month", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(now.getTime() - rangeStart("week", now).getTime()).toBe(7 * 86400000);
    expect(now.getTime() - rangeStart("month", now).getTime()).toBe(30 * 86400000);
  });

  it("rejects an invalid range", () => {
    expect(teacherRangeSchema.safeParse("year").success).toBe(false);
    expect(teacherDashboardQuery.safeParse({ range: "hack" }).success).toBe(false);
    expect(teacherDashboardQuery.safeParse({ range: "week" }).success).toBe(true);
  });

  it("does not invent an average when there is no assessed mastery", () => {
    expect(classAverage([])).toBeNull();
    expect(classAverage([mastery(0, 0)])).toBeNull();
    expect(classAverage([mastery(80)])).toBeGreaterThan(0);
  });

  it("keeps mode percentages at 100", () => {
    const parts = percentParts([3, 2, 1]);
    expect(parts.reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("returns an honest recommendation when evidence is missing", () => {
    expect(recommendTeacher({
      topReview: null,
      explanationRequests: 0,
      assignedStudents: 2,
      dominantMode: null,
    })[0]?.text).toContain("لا توجد بيانات كافية");
  });

  it("parameterizes search wildcards", () => {
    expect(escapeLike("100%'; DROP TABLE Users;--")).toContain("[%]");
    expect(escapeLike("a_b")).toContain("[_]");
  });
});
