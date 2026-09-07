import type { AllowedUploadMime } from "../config/limits.js";

interface SignatureRule {
  mime: AllowedUploadMime;
  test: (bytes: Buffer) => boolean;
}

const RULES: SignatureRule[] = [
  {
    mime: "image/png",
    test: (bytes) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    test: (bytes) =>
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff,
  },
  {
    mime: "application/pdf",
    test: (bytes) =>
      bytes.length >= 5 &&
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d,
  },
];

export function detectAllowedMime(buffer: Buffer): AllowedUploadMime | null {
  for (const rule of RULES) {
    if (rule.test(buffer)) return rule.mime;
  }
  return null;
}

export function isAllowedDeclaredMime(
  declared: string | undefined,
  detected: AllowedUploadMime,
): boolean {
  if (!declared) return true;
  const normalized = declared.toLowerCase();
  if (detected === "image/jpeg") {
    return normalized === "image/jpeg" || normalized === "image/jpg";
  }
  return normalized === detected;
}
