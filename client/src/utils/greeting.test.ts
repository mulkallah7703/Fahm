import { describe, expect, it } from "vitest";
import { firstNameOf, greetingForHour } from "./greeting";

describe("greetingForHour", () => {
  it("uses morning greeting before noon", () => {
    expect(greetingForHour(8)).toBe("صباح الخير");
  });

  it("uses evening greeting otherwise", () => {
    expect(greetingForHour(16)).toBe("مساء الخير");
    expect(greetingForHour(2)).toBe("مساء الخير");
  });
});

describe("firstNameOf", () => {
  it("prefers firstName when present", () => {
    expect(firstNameOf("سارة العتيبي", "سارة")).toBe("سارة");
  });
});
