import { describe, expect, it } from "vitest";
import { hasAnswerLeak } from "../utils/answerLeak.js";
import { recommendTeacher, reviewAction } from "../services/teacher/teacherMetrics.js";

describe("teacher insights", () => {
  it("recommends a group review from real weak-concept evidence", () => {
    const items = recommendTeacher({
      topReview: { name: "مفهوم مخزّن", affectedStudents: 2 },
      explanationRequests: 4,
      assignedStudents: 2,
      dominantMode: { name: "Focus", percent: 50 },
    });
    expect(items[0]?.text).toContain("مفهوم مخزّن");
    expect(JSON.stringify(items)).not.toContain("سارة الحربي");
    expect(JSON.stringify(items)).not.toContain("74%");
  });

  it("never exposes answer secrets in a teacher DTO shape", () => {
    const dto = {
      student: { name: "طالبة" },
      recentAnswers: [{ isCorrect: false, conceptName: "فكرة" }],
      adaptations: [{ reason: "VARIANT:STUDENT_SIMPLIFY" }],
    };
    expect(hasAnswerLeak(dto)).toBeNull();
    expect(JSON.stringify(dto)).not.toMatch(/correctAnswer|system prompt|OPENAI/i);
  });

  it("maps review actions from existing mastery bands", () => {
    expect(reviewAction("شرح إضافي", 3)).toContain("أعد شرح");
    expect(reviewAction("يحتاج مراجعة", 2)).toContain("مراجعة");
  });
});
