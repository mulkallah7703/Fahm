import { splitSentences } from "./arabicNormalize.js";

export const TEACHING_CONTENT_VERSION = 5;
export const UNREADABLE_MESSAGE = "تعذر قراءة هذا الجزء من الصفحة بشكل موثوق.";
export const REANALYZE_HINT = "يمكنك إعادة تحليل الصفحة.";

const TECH_LATIN = new Set([
  "dna", "rna", "atp", "co2", "h2o", "nacl", "ph", "ai", "ocr", "pdf", "http", "url", "api",
  "html", "css", "sql", "cpu", "gpu", "led", "uv", "ir",
]);

const GARBAGE_LATIN = new Set(["ass", "noll", "lian", "jolin", "celsa", "celSa"]);

export interface SourceQuality {
  reliable: boolean;
  score: number;
  arabicRatio: number;
  latinRatio: number;
  garbageRatio: number;
  reasons: string[];
  cleanText: string;
}

export function cleanTeachingText(text: string): string {
  const normalized = text
    .normalize("NFC")
    .replace(/\uFFFD/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[|¦]+/g, " ")
    .replace(/[.]{3,}/g, "…")
    .replace(/[!?]{3,}/g, "؟")
    .replace(/[،,]{2,}/g, "،")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = normalized.split(" ").filter(Boolean);
  const kept: string[] = [];
  let previous = "";
  for (const token of tokens) {
    if (looksLikeOcrGarbage(token)) continue;
    if (token === previous) continue;
    kept.push(token);
    previous = token;
  }
  return collapseRepeatedPhrases(kept.join(" ")).trim();
}

export function validateTeachingSource(text: string): SourceQuality {
  const originalTokens = text.normalize("NFC").split(/\s+/).filter(Boolean);
  const originalGarbage = originalTokens.filter((token) => looksLikeOcrGarbage(token)).length;
  const garbageRatio = originalTokens.length ? originalGarbage / originalTokens.length : 1;
  const cleanText = cleanTeachingText(text);
  const reasons: string[] = [];
  if (!cleanText) {
    return { reliable: false, score: 0, arabicRatio: 0, latinRatio: 0, garbageRatio: 1, reasons: ["empty"], cleanText };
  }
  const letters = cleanText.replace(/[^\p{L}]/gu, "");
  const arabic = (cleanText.match(/\p{Script=Arabic}/gu) ?? []).length;
  const latin = (cleanText.match(/[A-Za-z]/g) ?? []).length;
  const letterCount = Math.max(1, letters.length);
  const arabicRatio = arabic / letterCount;
  const latinRatio = latin / letterCount;
  const tokens = cleanText.split(/\s+/).filter(Boolean);
  if (arabicRatio < 0.45 && latinRatio > 0.35 && !looksLikeTechnicalEnglish(cleanText)) {
    reasons.push("mixed_script");
  }
  if (garbageRatio > 0.35) reasons.push("ocr_garbage");
  if (/(.)\1{4,}/.test(cleanText)) reasons.push("repeated_chars");
  if (tokens.length >= 4 && uniqueRatio(tokens) < 0.35) reasons.push("repeated_fragments");
  const coherence = reliableSentenceCount(cleanText);
  if (coherence === 0 && tokens.length > 3) reasons.push("low_coherence");
  const score = Number(
    Math.max(
      0,
      1 - Math.min(0.5, garbageRatio) - (reasons.includes("mixed_script") ? 0.35 : 0) - (reasons.includes("low_coherence") ? 0.25 : 0),
    ).toFixed(2),
  );
  return {
    reliable: score >= 0.5 && arabicRatio >= 0.4 && !reasons.includes("low_coherence"),
    score,
    arabicRatio: Number(arabicRatio.toFixed(2)),
    latinRatio: Number(latinRatio.toFixed(2)),
    garbageRatio: Number(garbageRatio.toFixed(2)),
    reasons,
    cleanText,
  };
}

export function isReliableText(text: string | null | undefined): boolean {
  if (!text?.trim()) return false;
  if (text.includes(UNREADABLE_MESSAGE)) return false;
  return validateTeachingSource(text).reliable;
}

export function reliableSentences(text: string): string[] {
  return splitSentences(cleanTeachingText(text)).filter((sentence) => isReliableText(sentence));
}

export function looksLikeOcrGarbage(token: string): boolean {
  const raw = token.trim();
  if (!raw) return true;
  if (/[A-Za-z]/.test(raw) && /\p{Script=Arabic}/u.test(raw)) return true;
  if (/(.)\1{3,}/.test(raw)) return true;
  if (raw.length > 28) return true;
  if (/[A-Za-z]/.test(raw) && /[0-9]{3,}/.test(raw)) return true;
  const latin = raw.replace(/[^A-Za-z]/g, "");
  if (!latin) return false;
  const lower = latin.toLowerCase();
  if (GARBAGE_LATIN.has(lower)) return true;
  if (TECH_LATIN.has(lower)) return false;
  if (/^[A-Z][a-z]?\d+[A-Za-z0-9]*$/.test(raw)) return false;
  if (latin.length <= 4 && !TECH_LATIN.has(lower)) return true;
  if (/[A-Z]{2,}[a-z]+[A-Z]/.test(latin)) return true;
  if (/[a-z]+[A-Z][a-z]+/.test(latin)) return true;
  if (latin.length >= 5 && !/[aeiouyAEIOUY]/.test(latin)) return true;
  return false;
}

export function teachingQualityScore(input: {
  sourceReliable: boolean;
  explanation: string;
  inventedVisual: boolean;
  unsupportedConcept: boolean;
}): number {
  let score = input.sourceReliable ? 0.7 : 0.2;
  if (isReliableText(input.explanation)) score += 0.2;
  else score -= 0.3;
  if (input.inventedVisual) score -= 0.3;
  if (input.unsupportedConcept) score -= 0.3;
  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

export function validateAiTeachingText(input: {
  text: string;
  allowedConcepts: string[];
  allowVisual: boolean;
  sourceSnippets: string[];
}): string | null {
  const quality = validateTeachingSource(input.text);
  if (!quality.reliable) return null;
  const clean = quality.cleanText;
  if (/ignore previous|system prompt|OPENAI/i.test(clean)) return null;
  if (!input.allowVisual && /في الرسم|يوضح الرسم|في الجدول|كما يظهر في الصورة/.test(clean)) return null;
  if (input.allowedConcepts.length > 0) {
    const introduced = /(?:مفهوم|مصطلح)\s+«([^»]+)»/.exec(clean)?.[1];
    if (introduced && !input.allowedConcepts.some((name) => introduced.includes(name) || name.includes(introduced))) {
      return null;
    }
  }
  if (input.sourceSnippets.length > 0) {
    const grounded = input.sourceSnippets.some((snippet) => sharesEducationalTokens(clean, snippet));
    if (!grounded && !input.allowedConcepts.some((name) => clean.includes(name))) return null;
  }
  return clean;
}

export function structuredTeachingContext(input: {
  title: string;
  concepts: string[];
  definitions: string[];
  keyPoints: string[];
  reliableSentences: string[];
  visuals: string[];
  tables: string[];
}): string {
  return JSON.stringify({
    title: input.title,
    concepts: input.concepts.slice(0, 6),
    definitions: input.definitions.slice(0, 6).map((item) => clip(item, 160)),
    keyPoints: input.keyPoints.slice(0, 5).map((item) => clip(item, 140)),
    paragraphs: input.reliableSentences.slice(0, 4).map((item) => clip(item, 180)),
    visuals: input.visuals.slice(0, 2),
    tables: input.tables.slice(0, 2),
  });
}

export function containsCorruptTeaching(text: string | null | undefined): boolean {
  if (!text) return false;
  if (text.includes("مفهوم يظهر في هذه الصفحة")) return true;
  return text.split(/\s+/).some((token) => looksLikeOcrGarbage(token));
}

function looksLikeTechnicalEnglish(text: string): boolean {
  const words = text.split(/\s+/);
  const latinWords = words.filter((word) => /^[A-Za-z][A-Za-z0-9-]*$/.test(word));
  if (latinWords.length < 4) return false;
  return latinWords.filter((word) => looksLikeOcrGarbage(word)).length / latinWords.length < 0.2;
}

function reliableSentenceCount(text: string): number {
  return splitSentences(text).filter((sentence) => !sentence.split(/\s+/).some((token) => looksLikeOcrGarbage(token))).length;
}

function uniqueRatio(tokens: string[]): number {
  return new Set(tokens.map((item) => item.toLowerCase())).size / tokens.length;
}

function sharesEducationalTokens(left: string, right: string): boolean {
  const a = new Set(left.split(/\s+/).filter((item) => item.length > 3));
  return right.split(/\s+/).some((item) => item.length > 3 && a.has(item));
}

function collapseRepeatedPhrases(text: string): string {
  return text.replace(/(.{8,40})\s+\1/g, "$1");
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max).trim()}…`;
}
