import { createHash, randomUUID } from "node:crypto";
import {
  fontSizeFromPx,
  nearestLineSpacing,
  type DyslexiaFontSize,
  type DyslexiaLineSpacing,
} from "../../config/dyslexia.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type {
  DyslexiaExperienceDto,
  DyslexiaLessonState,
  DyslexiaSegment,
  DyslexiaVocabDto,
} from "../../types/dyslexia.js";
import type { LessonState, TeachingContent, TeachingTerm } from "../../types/teaching.js";

export function shouldUseDyslexiaExperience(mode: string): boolean {
  return mode === "dyslexia";
}

export function readingSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!؟\n])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);
}

export function latinTerm(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/[A-Za-z][A-Za-z-]{2,}/);
  return match?.[0] ?? null;
}

export function readingHash(analysis: AnalysisDto, content: TeachingContent, variant: string): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        variant,
        title: content.title,
        main: content.simplifiedExplanation || content.mainIdea,
        points: content.keyPoints.map((item) => item.text),
        terms: content.terms.map((item) => item.name),
        ocr: analysis.ocr?.text ?? "",
      }),
    )
    .digest("hex")
    .slice(0, 20);
}

export function buildReadingSegments(analysis: AnalysisDto, content: TeachingContent): DyslexiaSegment[] {
  const segments: DyslexiaSegment[] = [];
  const seen = new Set<string>();
  const terms = content.terms;

  const push = (type: DyslexiaSegment["type"], text: string) => {
    const clean = text.replace(/\s+/g, " ").trim();
    const key = clean.replace(/[.!؟]/g, "");
    if (!clean || seen.has(key)) return;
    seen.add(key);
    segments.push({
      id: randomUUID(),
      type,
      order: segments.length + 1,
      text: clean,
      conceptIds: matchingConceptIds(clean, terms),
    });
  };

  if (content.title.trim()) push("title", content.title);
  for (const sentence of readingSentences(content.simplifiedExplanation || content.mainIdea)) {
    push("sentence", sentence);
  }
  for (const point of content.keyPoints) {
    for (const sentence of readingSentences(point.text)) push("sentence", sentence);
  }
  for (const block of (analysis.ocr?.text ?? "").split(/\n{2,}|\r\n{2,}/)) {
    for (const sentence of readingSentences(block)) push("sentence", sentence);
  }
  for (const term of terms) {
    push("definition", `${term.name}: ${term.definition}`);
  }
  if (content.example) {
    for (const sentence of readingSentences(content.example)) push("example", sentence);
  }
  return segments;
}

export function attachDyslexiaState(
  state: LessonState,
  analysis: AnalysisDto,
  prefs?: { fontSize: number | null; lineSpacing: number | null },
): DyslexiaLessonState {
  const hash = readingHash(analysis, state.content, state.strategy.variant);
  const previous = state.dyslexia ?? null;
  if (previous && previous.contentHash === hash && previous.segments.length > 0) {
    state.dyslexia = previous;
    return previous;
  }
  const segments = buildReadingSegments(analysis, state.content);
  const next: DyslexiaLessonState = {
    contentHash: hash,
    currentSegmentIndex: Math.min(previous?.currentSegmentIndex ?? 0, Math.max(0, segments.length - 1)),
    highlightCurrent: previous?.highlightCurrent ?? true,
    autoRead: previous?.autoRead ?? false,
    wordClickEnabled: previous?.wordClickEnabled ?? true,
    fontSize: previous?.fontSize ?? fontSizeFromPx(prefs?.fontSize),
    lineSpacing: previous?.lineSpacing ?? nearestLineSpacing(prefs?.lineSpacing),
    replayCount: previous?.replayCount ?? 0,
    lastAction: previous?.lastAction ?? null,
    lastActionMessage: null,
    viewedIds: previous?.viewedIds ?? [],
    notes: previous?.notes ?? [],
    simplified: previous?.simplified ?? {},
    explanations: previous?.explanations ?? {},
    segments,
  };
  state.dyslexia = next;
  return next;
}

export function publicDyslexia(
  state: LessonState,
  speechRate: number | null,
): DyslexiaExperienceDto | null {
  if (!state.dyslexia || !shouldUseDyslexiaExperience(state.strategy.mode)) return null;
  const dyslexia = state.dyslexia;
  const total = dyslexia.segments.length;
  const current = total === 0 ? 0 : Math.min(dyslexia.currentSegmentIndex + 1, total);
  const segment = dyslexia.segments[dyslexia.currentSegmentIndex] ?? null;
  const vocabulary = toVocabulary(state.content.terms, dyslexia);
  const currentConcept = segment
    ? (vocabulary.find((item) => segment.conceptIds.includes(item.conceptId)) ?? null)
    : null;
  return {
    currentSegmentIndex: dyslexia.currentSegmentIndex,
    currentSegment: segment,
    segments: dyslexia.segments,
    progress: {
      current,
      total,
      label: progressLabel(current, total, dyslexia.segments),
    },
    emptyMessage: total === 0 ? "لا يوجد نص مقروء من هذه الصفحة." : null,
    highlightCurrent: dyslexia.highlightCurrent,
    autoRead: dyslexia.autoRead,
    wordClickEnabled: dyslexia.wordClickEnabled,
    fontSize: dyslexia.fontSize,
    lineSpacing: dyslexia.lineSpacing,
    speechRate,
    lastActionMessage: dyslexia.lastActionMessage,
    vocabulary,
    currentConcept,
    wordExplain: null,
    note: segment ? (dyslexia.notes.find((item) => item.segmentId === segment.id) ?? null) : null,
    quizReady: Boolean(state.steps.some((step) => step.type === "check_question")),
  };
}

export function findConceptByWord(terms: TeachingTerm[], word: string): TeachingTerm | null {
  const needle = normalize(word);
  return terms.find((term) => normalize(term.name) === needle || term.name.includes(word.trim())) ?? null;
}

export function applyPrefs(
  state: DyslexiaLessonState,
  prefs: {
    fontSize?: DyslexiaFontSize;
    lineSpacing?: DyslexiaLineSpacing;
    highlightCurrent?: boolean;
    autoRead?: boolean;
    wordClickEnabled?: boolean;
  },
): void {
  if (prefs.fontSize) state.fontSize = prefs.fontSize;
  if (prefs.lineSpacing) state.lineSpacing = prefs.lineSpacing;
  if (prefs.highlightCurrent !== undefined) state.highlightCurrent = prefs.highlightCurrent;
  if (prefs.autoRead !== undefined) state.autoRead = prefs.autoRead;
  if (prefs.wordClickEnabled !== undefined) state.wordClickEnabled = prefs.wordClickEnabled;
}

function matchingConceptIds(text: string, terms: TeachingTerm[]): string[] {
  return terms.filter((term) => text.includes(term.name)).map((term) => term.conceptId);
}

function toVocabulary(terms: TeachingTerm[], state: DyslexiaLessonState): DyslexiaVocabDto[] {
  return terms.map((term) => ({
    conceptId: term.conceptId,
    name: term.name,
    english: latinTerm(term.definition) ?? latinTerm(term.name),
    definition: term.definition,
    example: null,
    occurrences: state.segments.filter((segment) => segment.conceptIds.includes(term.conceptId)).length,
    simplified: state.simplified[term.conceptId] ?? null,
  }));
}

function progressLabel(current: number, total: number, segments: DyslexiaSegment[]): string {
  if (total === 0) return "لا مقاطع بعد";
  const sentences = segments.filter((item) => item.type === "sentence").length;
  const kind = sentences >= total / 2 ? "الجملة" : "المقطع";
  return `${kind} ${current} من ${total}`;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, "").trim();
}
