import { describe, expect, it } from "vitest";
import { bandMeta, cellLabel, exportCsv, studentNoun } from "./teacherView";
import type { TeacherDashboard } from "../../types";

function sample(): TeacherDashboard {
  return {
    teacher: { id: "t1", name: "معلمة" },
    classInfo: { schoolName: null, subject: null, assignedCount: 1 },
    scope: { range: "week", material: null },
    updatedAt: "2026-09-06T12:00:00.000Z",
    overview: {
      assignedStudents: 1,
      completedStudents: 0,
      completionLabel: "0 / 1",
      averageUnderstanding: null,
      averageUnderstandingLabel: "لا توجد بيانات كافية",
      needsAdditionalExplanation: 0,
      explanationRequests: 0,
    },
    conceptColumns: [{ conceptId: "c1", name: "فكرة" }],
    students: [{
      studentId: "s1",
      name: "طالبة",
      modeCode: "focus",
      modeName: "Focus",
      lastActivityAt: null,
      cells: [{ conceptId: "c1", band: "يحتاج مراجعة", status: "review" }],
    }],
    studentTotal: 1,
    reviewPriority: [],
    modeDistribution: [],
    recommendations: [{ id: "empty", text: "لا توجد بيانات كافية لإصدار توصية بعد." }],
    actions: { review: false, parentNote: false, parentNoteStatus: "unavailable" },
    empty: { students: null, lessons: "لم يبدأ الطلاب التعلم بعد.", mastery: "لا توجد بيانات فهم كافية بعد.", review: "لا توجد مفاهيم تحتاج مراجعة حاليًا." },
  };
}

describe("teacher dashboard view", () => {
  it("exposes text status, not color alone", () => {
    expect(cellLabel("طالبة", "فكرة", "يحتاج مراجعة")).toBe("فكرة — طالبة — يحتاج مراجعة");
    expect(bandMeta("شرح إضافي").icon).toBe("■");
  });

  it("exports the loaded DTO without screenshot names", () => {
    const csv = exportCsv(sample());
    expect(csv).toContain("طالبة");
    expect(csv).not.toContain("سارة الحربي");
    expect(csv).not.toContain("74%");
  });

  it("uses honest empty copy", () => {
    expect(sample().empty.mastery).toContain("لا توجد بيانات فهم");
    expect(studentNoun(1)).toBe("طالب واحد");
  });
});
