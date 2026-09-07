import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ownedOnly } from "../services/teacher/teacherMetrics.js";

describe("teacher isolation", () => {
  it("drops rows that are not in the assigned student set", () => {
    const allowed = new Set(["sara"]);
    const rows = ownedOnly(
      [
        { studentProfileId: "sara", name: "سارة" },
        { studentProfileId: "other", name: "شخص آخر" },
      ],
      allowed,
    );
    expect(rows.map((item) => item.studentProfileId)).toEqual(["sara"]);
  });

  it("scopes teacher SQL to TeacherStudents and TeacherProfileId", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../repositories/teacherRepository.ts"),
      "utf8",
    );
    expect(source).toContain("fahm.TeacherStudents");
    expect(source).toContain("TeacherProfileId = @teacherProfileId");
    expect(source).not.toMatch(/\$\{search\}/);
    expect(source).toContain("LIKE @search");
  });

  it("does not query one student at a time for dashboard aggregates", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../repositories/teacherRepository.ts"),
      "utf8",
    );
    expect(source).toContain("StudentProfileId IN");
    expect(source).toMatch(/COUNT\(\*\)/);
  });
});
