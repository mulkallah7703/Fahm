import { describe, expect, it } from "vitest";
import { countWords, detectScriptLanguage } from "../utils/words.js";

describe("countWords", () => {
  it("counts Arabic and English tokens", () => {
    expect(countWords("الماء موجود حولنا في كل مكان")).toBe(6);
    expect(countWords("The water cycle")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});

describe("detectScriptLanguage", () => {
  it("detects Arabic, English, and mixed pages", () => {
    expect(detectScriptLanguage("دورة الماء")).toBe("ar");
    expect(detectScriptLanguage("Water cycle")).toBe("en");
    expect(detectScriptLanguage("Water دورة")).toBe("mixed");
  });
});
