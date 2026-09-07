import { describe, expect, it } from "vitest";
import {
  detectAllowedMime,
  isAllowedDeclaredMime,
} from "../utils/fileSignature.js";

describe("detectAllowedMime", () => {
  it("detects PNG magic bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    expect(detectAllowedMime(png)).toBe("image/png");
  });

  it("detects JPEG magic bytes", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(detectAllowedMime(jpeg)).toBe("image/jpeg");
  });

  it("detects PDF magic bytes", () => {
    const pdf = Buffer.from("%PDF-1.7 rest");
    expect(detectAllowedMime(pdf)).toBe("application/pdf");
  });

  it("rejects unknown bytes even if the name looks valid", () => {
    expect(detectAllowedMime(Buffer.from("not-a-real-file"))).toBeNull();
  });
});

describe("isAllowedDeclaredMime", () => {
  it("accepts jpeg/jpg aliases", () => {
    expect(isAllowedDeclaredMime("image/jpg", "image/jpeg")).toBe(true);
    expect(isAllowedDeclaredMime("image/jpeg", "image/jpeg")).toBe(true);
  });

  it("rejects a mismatched declared type", () => {
    expect(isAllowedDeclaredMime("application/pdf", "image/png")).toBe(false);
  });
});
