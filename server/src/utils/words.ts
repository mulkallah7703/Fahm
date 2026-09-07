export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0).length;
}

export function detectScriptLanguage(text: string): "ar" | "en" | "mixed" {
  const arabic = (text.match(/\p{Script=Arabic}/gu) ?? []).length;
  const latin = (text.match(/\p{Script=Latin}/gu) ?? []).length;
  if (arabic > 0 && latin > 0) return "mixed";
  if (arabic > latin) return "ar";
  if (latin > 0) return "en";
  return "ar";
}

export function truncateForAi(text: string, max = 8_000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…`;
}
