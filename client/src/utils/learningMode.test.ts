import { describe, expect, it } from "vitest";
import { conceptCountLabel } from "./format";

describe("learning mode labels", () => {
  it("keeps page-ready concept counts honest", () => {
    expect(conceptCountLabel(0)).toBe("بدون مفاهيم بعد");
    expect(conceptCountLabel(3)).toBe("3 مفاهيم");
  });
});
