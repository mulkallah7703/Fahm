import { describe, expect, it } from "vitest";
import { extractLocalConcepts } from "../services/concepts/localConcepts.js";

describe("extractLocalConcepts", () => {
  it("extracts terms from the actual page text", () => {
    const result = extractLocalConcepts(
      "التبخر مهم في دورة الماء. التبخر يحول الماء إلى بخار. التكاثف يعيد البخار إلى قطرات. التبخر ثم التكاثف.",
    );
    const names = result.concepts.map((item) => item.name);
    expect(names.some((name) => name.includes("التبخر"))).toBe(true);
    expect(names.some((name) => name.includes("دورة الماء"))).toBe(true);
    expect(names.includes("دورة الماء في البحار المالحة جدا جدا")).toBe(false);
  });

  it("does not invent a grade when none is present", () => {
    const result = extractLocalConcepts("الماء موجود حولنا في كل مكان.");
    expect(result.gradeLevel).toBeNull();
  });

  it("reads an explicit grade from the text", () => {
    const result = extractLocalConcepts("هذا الدرس من كتاب الصف 6 العلوم.");
    expect(result.gradeLevel).toBe("6");
    expect(result.subject).toBe("العلوم");
  });
});
