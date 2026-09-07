import type { AnalysisDto } from "../../types/analysis.js";
import { extractLocalConcepts, isConceptToken } from "../concepts/localConcepts.js";
import {
  UNREADABLE_MESSAGE,
  cleanTeachingText,
  isReliableText,
  looksLikeOcrGarbage,
  reliableSentences,
  validateTeachingSource,
} from "./contentQualityService.js";

export interface GroundedConceptLesson {
  conceptId: string;
  name: string;
  importance: number;
  what: string;
  why: string | null;
  how: string | null;
  example: string | null;
  evidence: string;
}

export interface GroundedLessonModel {
  title: string;
  mainIdea: string;
  concepts: GroundedConceptLesson[];
  keyPoints: { text: string; source: string }[];
  sections: { type: string; text: string }[];
  definitions: { conceptId: string; name: string; definition: string }[];
  visuals: string[];
  tables: string[];
  sourceEvidence: string[];
  missing: string[];
  hasDiagram: boolean;
  hasTable: boolean;
}

export function buildLessonModel(analysis: AnalysisDto): GroundedLessonModel {
  const rawOcr = analysis.ocr?.text ?? "";
  const ocrQuality = validateTeachingSource(rawOcr);
  const heading = cleanTeachingText(analysis.structure.title ?? "");
  const title = preferredTitle(analysis.material.title, heading);
  const concepts = refineStoredConcepts(analysis).sort((left, right) => right.importanceScore - left.importanceScore);
  const sentences = ocrQuality.reliable
    ? reliableSentences(rawOcr)
    : reliableSentences([heading, ...concepts.map((item) => item.description ?? "")].filter(Boolean).join(". "));
  const sourceEvidence = [
    ocrQuality.reliable ? "ocr" : null,
    analysis.vision?.visualDescription ? "vision" : null,
    concepts.length > 0 ? "page_concepts" : null,
    analysis.structure.sections.length > 0 ? "structure" : null,
  ].filter((item): item is string => Boolean(item));

  const missing: string[] = [];
  if (!ocrQuality.reliable && concepts.length === 0 && !isReliableText(heading)) {
    missing.push(UNREADABLE_MESSAGE);
  }

  const lessons = concepts.map((concept) => groundedConcept(concept, sentences, title));
  const visuals = visualEvidence(analysis);
  const tables = tableEvidence(analysis);

  const mainIdea =
    (isReliableText(sentences[0]) ? sentences[0] : null) ??
    (isReliableText(lessons[0]?.what) ? lessons[0]!.what : null) ??
    (isReliableText(heading) ? heading : null) ??
    missing[0] ??
    UNREADABLE_MESSAGE;

  const sequence = sequenceFrom(ocrQuality.cleanText || cleanTeachingText(rawOcr));
  const keyPoints = sequence.length >= 2
    ? sequence.map((text) => ({ text, source: "من تسلسل الصفحة" }))
    : lessons.slice(0, 5).map((item) => ({
        text: item.what,
        source: item.evidence,
      }));
  if (keyPoints.length === 0 && sentences.length > 1) {
    sentences.slice(1, 4).forEach((sentence, index) => {
      keyPoints.push({ text: sentence, source: `من الفقرة ${index + 1}` });
    });
  }

  const sections = analysis.structure.sections
    .map((section) => ({
      type: section.type,
      text: (section.text ?? section.description ?? "").trim(),
    }))
    .filter((section) => section.text.length > 0);

  return {
    title,
    mainIdea,
    concepts: lessons,
    keyPoints,
    sections,
    definitions: lessons.map((item) => ({
      conceptId: item.conceptId,
      name: item.name,
      definition: item.what,
    })),
    visuals,
    tables,
    sourceEvidence,
    missing,
    hasDiagram: visuals.length > 0,
    hasTable: tables.length > 0,
  };
}

function groundedConcept(
  concept: AnalysisDto["concepts"][number],
  sentences: string[],
  title: string,
): GroundedConceptLesson {
  const hit = sentences.find((sentence) => sentence.includes(concept.name) && isReliableText(sentence));
  const description = isReliableText(concept.description) ? concept.description!.trim() : null;
  const pageSentence = sentences[0] ?? "";
  const descriptionIsPageDump = Boolean(description && pageSentence && nearSame(description, pageSentence));
  const usableDescription = description && !descriptionIsPageDump ? description : null;
  const sharedSource = Boolean(hit && pageSentence && nearSame(hit, pageSentence));
  const titleConcept = isReliableText(title) && (title.includes(concept.name) || concept.name.includes(title));
  const what =
    usableDescription ||
    (titleConcept && isReliableText(pageSentence) ? pageSentence : null) ||
    (hit && !sharedSource ? hit : null) ||
    (hit || pageSentence.includes(concept.name)
      ? `تظهر «${concept.name}» في هذه الصفحة ضمن «${title}».`
      : looksLikeOcrGarbage(concept.name)
        ? UNREADABLE_MESSAGE
        : "لا تحتوي الصفحة على معلومات كافية لشرح هذه النقطة.");
  const why = whyFrom(concept.name, title, sentences);
  const how = howFrom(concept.name, sentences, hit, description || hit || null);
  const example = exampleFrom(hit ?? sentences.find((item) => /مثال|مثل|كأن|عندما|حين/.test(item)) ?? null);
  return {
    conceptId: concept.id,
    name: concept.name,
    importance: concept.importanceScore,
    what,
    why,
    how,
    example,
    evidence: description ? "من تعريف المفهوم المستخرج" : hit ? "من النص المحلَّل" : "غير كافٍ في الصفحة",
  };
}

function whyFrom(name: string, title: string, sentences: string[]): string | null {
  const important = sentences.find(
    (sentence) =>
      isReliableText(sentence) &&
      sentence.includes(name) &&
      /مهم|أساسي|يساعد|لذلك|سبب|يفيد|يفسر/i.test(sentence),
  );
  if (important) return important;
  if (isReliableText(title) && title.includes(name) && isReliableText(sentences[0])) {
    return `هذه الفكرة مرتبطة بعنوان الصفحة: «${title}».`;
  }
  return null;
}

function howFrom(name: string, sentences: string[], hit: string | undefined, what: string | null): string | null {
  const process = sentences.find(
    (sentence) =>
      isReliableText(sentence) &&
      sentence.includes(name) &&
      /يتحول|ينتقل|يحدث|يتم|تصبح|يصير|يمر|يؤدي/i.test(sentence) &&
      !nearSame(sentence, what),
  );
  if (process) return process;
  if (hit && isReliableText(hit) && !nearSame(hit, what)) return hit;
  return null;
}

function exampleFrom(source: string | null): string | null {
  if (!source || !isReliableText(source) || source.includes("لا تحتوي الصفحة")) return null;
  if (!/مثال|مثل|كأن|عندما|حينما|حين /.test(source)) return null;
  return source;
}

function nearSame(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  const a = left.replace(/\s+/g, " ").trim();
  const b = right.replace(/\s+/g, " ").trim();
  return a === b || a.includes(b) || b.includes(a);
}

function preferredTitle(materialTitle: string, heading: string): string {
  const material = cleanTeachingText(materialTitle);
  if (isReliableText(material) && material.length >= 3) return material;
  if (isReliableText(heading) && heading.length >= 3) return heading;
  return "درس";
}

function refineStoredConcepts(analysis: AnalysisDto): AnalysisDto["concepts"] {
  const stored = analysis.concepts.filter((item) => {
    const parts = item.name.trim().split(/\s+/);
    return parts.length > 0 && parts.every((part) => isConceptToken(part)) && !looksLikeOcrGarbage(item.name);
  });
  const ocr = analysis.ocr?.text ?? "";
  if (!ocr.trim()) return stored;
  const phrases = extractLocalConcepts(ocr).concepts.filter((item) => item.name.includes(" "));
  const consumed = new Set<string>();
  const refined: AnalysisDto["concepts"] = [];
  for (const phrase of phrases) {
    if (!ocr.includes(phrase.name)) continue;
    const already = stored.find((item) => item.name === phrase.name);
    const parts = stored.filter((item) => item.name !== phrase.name && phrase.name.includes(item.name));
    if (already) {
      refined.push(already);
      consumed.add(already.id);
      parts.forEach((item) => consumed.add(item.id));
      continue;
    }
    if (parts.length === 0) continue;
    const primary = [...parts].sort((left, right) => right.importanceScore - left.importanceScore)[0]!;
    refined.push({ ...primary, name: phrase.name });
    parts.forEach((item) => consumed.add(item.id));
  }
  for (const item of stored) {
    if (!consumed.has(item.id)) refined.push(item);
  }
  return refined;
}

function visualEvidence(analysis: AnalysisDto): string[] {
  const parts: string[] = [];
  if (analysis.vision?.visualDescription?.trim()) parts.push(analysis.vision.visualDescription.trim());
  for (const element of analysis.vision?.elements ?? []) {
    if (element.description?.trim()) parts.push(element.description.trim());
  }
  for (const section of analysis.structure.sections) {
    if ((section.type === "diagram" || section.type === "image") && section.description?.trim()) {
      parts.push(section.description.trim());
    }
  }
  return unique(parts);
}

function tableEvidence(analysis: AnalysisDto): string[] {
  const parts: string[] = [];
  for (const table of analysis.vision?.tables ?? []) {
    parts.push(`جدول${table.title ? ` بعنوان ${table.title}` : ""} يتضمن: ${table.headers.join("، ")}.`);
  }
  for (const section of analysis.structure.sections) {
    if (section.type === "table" && section.table) {
      parts.push(`جدول${section.table.title ? ` بعنوان ${section.table.title}` : ""} يتضمن: ${section.table.headers.join("، ")}.`);
    }
  }
  return unique(parts);
}

function sequenceFrom(text: string): string[] {
  if (!text.includes(" ثم ")) return [];
  const body = text.replace(/^[^:]{2,40}:\s*/, "").replace(/[.!؟]+$/g, "").trim();
  const parts = body
    .split(/\s+ثم\s+/)
    .map((part) => part.replace(/^[،,]\s*/, "").trim())
    .filter((part) => part.length >= 3 && isConceptToken(part.split(/\s+/)[0] ?? ""));
  return parts.length >= 2 ? parts : [];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
