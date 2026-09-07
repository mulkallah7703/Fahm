export function normalizeArabic(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[\u0640\u064B-\u065F]/g, "")
    .replace(/[؟?!.،,;:«»"']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function tokensOf(input: string): string[] {
  return normalizeArabic(input)
    .split(" ")
    .filter((token) => token.length > 1);
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!؟\n])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 8);
}
