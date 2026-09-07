import { describe, expect, it } from "vitest";
import { normalizeConceptName } from "../utils/conceptName.js";

describe("normalizeConceptName", () => {
  it("treats Arabic spelling variants as the same concept", () => {
    expect(normalizeConceptName("التكاثف")).toBe(normalizeConceptName("التكاثف"));
    expect(normalizeConceptName("إدارة")).toBe(normalizeConceptName("ادارة"));
  });
});
