import { describe, expect, it } from "vitest";
import { isTypingTarget } from "../services/audio/audioState";

describe("dyslexia shortcut safety", () => {
  it("does not treat a button as a typing field", () => {
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true);
  });
});
