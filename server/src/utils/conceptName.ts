export function normalizeConceptName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function conceptNameVariants(name: string): string[] {
  const trimmed = name.replace(/\s+/g, " ").trim();
  const unique = new Set<string>([trimmed, normalizeConceptName(trimmed)]);
  return [...unique].filter((item) => item.length > 0);
}
