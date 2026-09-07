import { describe, expect, it } from "vitest";
import { visionPayloadSchema } from "../services/vision/visionSchema.js";

describe("visionPayloadSchema", () => {
  it("rejects malformed AI output", () => {
    expect(visionPayloadSchema.safeParse({ summary: 12 }).success).toBe(false);
  });

  it("accepts a valid payload without inventing tables", () => {
    const parsed = visionPayloadSchema.parse({
      summary: "نص تعليمي",
      visualElements: [],
      tables: [],
      sections: [{ type: "paragraph", text: "الماء موجود." }],
    });
    expect(parsed.tables).toEqual([]);
    expect(parsed.visualElements).toEqual([]);
  });
});
