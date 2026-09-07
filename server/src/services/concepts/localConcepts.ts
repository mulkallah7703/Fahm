import { normalizeConceptName } from "../../utils/conceptName.js";
import type { ConceptPayload } from "../vision/visionSchema.js";
import { looksLikeOcrGarbage } from "../teaching/contentQualityService.js";

const STOP = new Set([
  "في", "من", "على", "إلى", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "تلك",
  "التي", "الذي", "كان", "كانت", "يكون", "أو", "او", "ثم", "قد", "لقد",
  "هو", "هي", "هم", "نحن", "أن", "ان", "إن", "ما", "لا", "لم", "لن",
  "كل", "بعض", "بعد", "قبل", "حيث", "عند", "بين", "حتى", "إذا", "اذا",
  "كيف", "لماذا", "ماذا", "متى", "أين", "اين", "هل", "هنا", "هناك",
  "أيضا", "ايضا", "جدا", "فقط", "مثل", "غير", "لكن", "ولكن", "كما",
  "أي", "اي", "حتى", "دون", "حول", "خلال", "بعدما", "عندما", "لو",
  "تفعل", "تفعلين", "يفعل", "نفعل", "نافذة", "جوها", "ذلكم", "هؤلاء",
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is",
  "are", "was", "were", "be", "as", "by", "with", "that", "this",
]);

const QUESTION_WORDS = new Set(["كيف", "لماذا", "ماذا", "متى", "أين", "اين", "هل"]);
const GENERIC_UNIGRAMS = new Set(["تفاعل", "عملية", "حالة", "شيء", "اشياء", "أشياء", "نوع", "شكل", "طريقة"]);

function tokens(text: string): string[] {
  return text
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => isConceptToken(token));
}

export function isConceptToken(token: string): boolean {
  const raw = token.trim();
  if (raw.length < 3) return false;
  const key = raw.toLowerCase();
  if (STOP.has(key) || QUESTION_WORDS.has(raw)) return false;
  if (/^\d+$/.test(raw)) return false;
  if (looksLikeOcrGarbage(raw)) return false;
  return true;
}

export function extractLocalConcepts(text: string): ConceptPayload {
  const words = tokens(text);
  const counts = new Map<string, { name: string; count: number; words: number }>();

  function add(name: string, weight = 1): void {
    const key = normalizeConceptName(name);
    if (key.length < 3 || STOP.has(key)) return;
    const wordCount = name.trim().split(/\s+/).length;
    if (wordCount === 1 && GENERIC_UNIGRAMS.has(key)) return;
    const current = counts.get(key);
    if (current) current.count += weight;
    else counts.set(key, { name: name.trim(), count: weight, words: wordCount });
  }

  for (const token of words) add(token, 1);
  for (let index = 0; index < words.length - 1; index += 1) {
    const bigram = `${words[index]} ${words[index + 1]}`;
    if (text.includes(bigram)) add(bigram, 2);
  }
  for (let index = 0; index < words.length - 2; index += 1) {
    const trigram = `${words[index]} ${words[index + 1]} ${words[index + 2]}`;
    if (text.includes(trigram)) add(trigram, 3);
  }

  const ranked = collapseParts([...counts.values()]).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return right.words - left.words;
  }).slice(0, 6);

  const max = ranked[0]?.count ?? 1;
  const concepts = ranked.map((item) => ({
    name: item.name,
    description: null,
    subject: inferSubject(text),
    importanceScore: Number((item.count / max).toFixed(2)),
    confidenceScore: item.words > 1 ? 0.7 : item.count >= 2 ? 0.55 : 0.35,
  }));

  const relationships = detectLocalRelationships(text, concepts.map((item) => item.name));
  return {
    concepts,
    relationships,
    title: null,
    subject: inferSubject(text),
    gradeLevel: inferGrade(text),
    gradeConfidence: inferGrade(text) ? 0.7 : 0,
  };
}

function collapseParts(
  rows: Array<{ name: string; count: number; words: number }>,
): Array<{ name: string; count: number; words: number }> {
  const phrases = rows.filter((item) => item.words > 1);
  return rows.filter((item) => {
    if (item.words > 1) return true;
    const parent = phrases.find((phrase) => phrase.name.includes(item.name));
    if (!parent) return true;
    return item.count > parent.count + 1;
  });
}

function inferSubject(text: string): string | null {
  if (/علوم|علم|science/i.test(text)) return "العلوم";
  if (/رياض|كسور|حساب|math/i.test(text)) return "الرياضيات";
  if (/لغة عربي|نحو|إملاء/i.test(text)) return "اللغة العربية";
  return null;
}

function inferGrade(text: string): string | null {
  const arabic = text.match(/(?:الصف|صف)\s*[:.]?\s*(\d+|الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)/);
  if (arabic?.[1]) return arabic[1];
  const english = text.match(/grade\s*(\d+)/i);
  if (english?.[1]) return english[1];
  return null;
}

function detectLocalRelationships(
  text: string,
  conceptNames: string[],
): ConceptPayload["relationships"] {
  const relations: ConceptPayload["relationships"] = [];
  const pattern = /(.{2,40}?)\s+(?:يؤدي إلى|يسبب|ثم)\s+(.{2,40}?)(?:\.|$)/g;
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match) {
    const source = conceptNames.find((name) => match![1].includes(name));
    const target = conceptNames.find((name) => match![2].includes(name));
    if (source && target && source !== target) {
      relations.push({
        source,
        target,
        type: "leads_to",
        confidenceScore: 0.4,
      });
    }
    match = pattern.exec(text);
  }
  return relations;
}

export function sanitizeConcepts(payload: ConceptPayload): ConceptPayload {
  return {
    ...payload,
    concepts: payload.concepts.filter((item) => {
      const parts = item.name.trim().split(/\s+/);
      return parts.every((part) => isConceptToken(part)) && item.name.trim().length >= 3;
    }),
  };
}

export { inferGrade, inferSubject };
