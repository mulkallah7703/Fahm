import { describe, expect, it } from "vitest";
import { analyzeLocally } from "../services/vision/localVision.js";

describe("analyzeLocally", () => {
  it("does not invent a table when the page has none", async () => {
    const result = await analyzeLocally({
      text: "الماء موجود حولنا في كل مكان. الشمس تسخن ماء البحر.",
    });
    expect(result.tables).toEqual([]);
    expect(result.visualElements).toEqual([]);
  });

  it("extracts a real table from aligned text", async () => {
    const result = await analyzeLocally({
      text: "الحالة | المثال\nسائل | بحر\nغاز | بخار",
    });
    expect(result.tables.length).toBe(1);
    expect(result.tables[0]?.headers.length).toBeGreaterThan(0);
  });
});
