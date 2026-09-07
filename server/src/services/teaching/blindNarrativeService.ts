import { createHash, randomUUID } from "node:crypto";
import { BLIND_MESSAGES, SEGMENT_TITLES, type BlindSegmentType } from "../../config/blind.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { BlindLessonState, BlindSegment, BlindSegmentDto, BlindExperienceDto } from "../../types/blind.js";
import type { LessonState, PublicQuestion, TeachingContent } from "../../types/teaching.js";
import { env } from "../../config/env.js";

export function hasDiagram(analysis: AnalysisDto): boolean {
  if (analysis.vision?.visualDescription?.trim()) return true;
  if (analysis.structure.sections.some((section) => section.type === "diagram" || section.type === "image")) {
    return true;
  }
  return (analysis.vision?.elements ?? []).some((element) =>
    /diagram|image|drawing|illustration|رسم|صورة/i.test(`${element.type} ${element.description}`),
  );
}

export function hasTable(analysis: AnalysisDto): boolean {
  if ((analysis.vision?.tables.length ?? 0) > 0) return true;
  return analysis.structure.sections.some((section) => section.type === "table" && Boolean(section.table));
}

export function paragraphsFrom(analysis: AnalysisDto): string[] {
  const structured = analysis.structure.sections
    .filter((section) => section.type === "paragraph" && section.text?.trim())
    .map((section) => section.text!.trim());
  if (structured.length > 0) return structured;
  return (analysis.ocr?.text ?? "")
    .split(/\n{2,}|\r\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 12);
}

export function narrativeHash(analysis: AnalysisDto, variant: string): string {
  const seed = JSON.stringify({
    variant,
    text: analysis.ocr?.text ?? "",
    vision: analysis.vision?.visualDescription ?? "",
    tables: analysis.vision?.tables ?? [],
    concepts: analysis.concepts.map((item) => item.name),
    title: analysis.material.title,
  });
  return createHash("sha256").update(seed).digest("hex").slice(0, 20);
}

export function shouldUseBlindExperience(mode: string, variant: string): boolean {
  return mode === "blind" || (mode === "adaptive" && variant === "verbal");
}

export function toSegmentDto(segment: BlindSegment, detailOpen: boolean): BlindSegmentDto {
  return {
    id: segment.id,
    type: segment.type,
    order: segment.order,
    title: segment.title,
    text: detailOpen && segment.detailedText ? segment.detailedText : segment.text,
    detailedAvailable: Boolean(segment.detailedText),
    available: segment.available,
    unavailableReason: segment.unavailableReason,
    paragraphIndex: segment.paragraphIndex,
  };
}

export function toBlindExperience(
  state: BlindLessonState,
  analysis: AnalysisDto,
  prefs: { speechRate: number | null; preferredVoice: string | null; fontSize: number | null },
): BlindExperienceDto {
  const total = Math.max(1, state.segments.length);
  const current = Math.min(state.currentSegmentIndex + 1, total);
  const segment = state.segments[state.currentSegmentIndex] ?? state.segments[0] ?? null;
  return {
    currentSegmentIndex: state.currentSegmentIndex,
    currentSegment: segment ? toSegmentDto(segment, state.detailOpen) : null,
    segments: state.segments.map((item) => toSegmentDto(item, false)),
    progress: {
      current,
      total,
      label: `العنصر ${current} من ${total}`,
    },
    speechRate: state.speechRate,
    preferredVoice: prefs.preferredVoice,
    fontSize: prefs.fontSize,
    hasDiagram: hasDiagram(analysis),
    hasTable: hasTable(analysis),
    paragraphCount: paragraphsFrom(analysis).length,
    ttsConfigured: Boolean(env.elevenLabs.apiKey),
    recommendedSpeed: state.replayCount >= 3 && state.speechRate > 0.8 ? 0.8 : null,
    lastActionMessage: state.lastActionMessage,
    detailOpen: state.detailOpen,
  };
}

export function buildBlindNarrative(input: {
  analysis: AnalysisDto;
  content: TeachingContent;
  variant: string;
  question: PublicQuestion | null;
  previous?: BlindLessonState | null;
  speechRate?: number;
}): BlindLessonState {
  const hash = narrativeHash(input.analysis, input.variant);
  if (input.previous && input.previous.contentHash === hash && input.previous.segments.length > 0) {
    return {
      ...input.previous,
      segments: applyQuestionText(input.previous.segments, input.question),
    };
  }

  const segments = createSegments(input.analysis, input.content, input.variant, input.question);
  const previousIndex = input.previous?.currentSegmentIndex ?? 0;
  return {
    contentHash: hash,
    currentSegmentIndex: Math.min(previousIndex, Math.max(0, segments.length - 1)),
    replayCount: input.previous?.replayCount ?? 0,
    speechRate: (input.previous?.speechRate ?? input.speechRate ?? 1) as BlindLessonState["speechRate"],
    lastAction: input.previous?.lastAction ?? null,
    lastActionMessage: null,
    detailOpen: false,
    listenedIds: input.previous?.listenedIds ?? [],
    segments,
  };
}

export function applyQuestionText(segments: BlindSegment[], question: PublicQuestion | null): BlindSegment[] {
  if (!question) return segments;
  return segments.map((segment) =>
    segment.type === "question"
      ? { ...segment, text: speakQuestion(question), available: true, unavailableReason: null }
      : segment,
  );
}

export function speakQuestion(question: PublicQuestion): string {
  const options = (question.options ?? []).map((option, index) => `الخيار ${arabicOrdinal(index + 1)}: ${option}.`);
  return ["سؤال للتحقق من فهمك.", question.text, ...options].join(" ");
}

function createSegments(
  analysis: AnalysisDto,
  content: TeachingContent,
  variant: string,
  question: PublicQuestion | null,
): BlindSegment[] {
  const segments: BlindSegment[] = [];
  const concepts = [...analysis.concepts].sort((a, b) => b.importanceScore - a.importanceScore);
  const paragraphs = paragraphsFrom(analysis);
  const diagram = hasDiagram(analysis);
  const table = hasTable(analysis);

  push(segments, "orientation", "نظرة عامة", orientationText(content, concepts, diagram, table, paragraphs.length), {
    sourceConceptIds: concepts.map((item) => item.id),
  });

  const title = content.title.trim() || analysis.structure.title?.trim();
  if (title) {
    push(segments, "title", "العنوان", `عنوان الصفحة هو: ${title}.`);
  }

  push(segments, "main_idea", SEGMENT_TITLES.main_idea, speechFriendly(content.simplifiedExplanation || content.mainIdea), {
    sourceConceptIds: concepts[0] ? [concepts[0].id] : [],
  });

  if (content.keyPoints.length > 0) {
    const points = content.keyPoints
      .map((point, index) => `النقطة ${arabicOrdinal(index + 1)}: ${speechFriendly(point.text)}`)
      .join(" ");
    push(segments, "key_points", SEGMENT_TITLES.key_points, `أهم النقاط في هذه الصفحة. ${points}`);
  }

  if (content.terms.length > 0) {
    const terms = content.terms
      .map((term) => `${term.name}: ${speechFriendly(term.definition)}`)
      .join(" ");
    push(segments, "terms", SEGMENT_TITLES.terms, `المصطلحات الأساسية. ${terms}`, {
      sourceConceptIds: content.terms.map((term) => term.conceptId),
    });
  }

  if (diagram) {
    const visual = visualNarration(analysis, false);
    const detailed = visualNarration(analysis, true);
    push(segments, "visual_description", SEGMENT_TITLES.visual_description, visual || BLIND_MESSAGES.noVisualDetail, {
      detailedText: detailed && detailed !== visual ? detailed : null,
      available: Boolean(visual),
      unavailableReason: visual ? null : BLIND_MESSAGES.noVisualDetail,
    });
  }

  if (table) {
    const { summary, detail } = tableNarration(analysis);
    push(segments, "table_description", SEGMENT_TITLES.table_description, summary, {
      detailedText: detail,
    });
  }

  paragraphs.forEach((paragraph, index) => {
    push(segments, "paragraph", `الفقرة ${arabicOrdinal(index + 1)}`, speechFriendly(paragraph), {
      paragraphIndex: index + 1,
    });
  });

  if (variant === "example" && content.example) {
    push(segments, "example", SEGMENT_TITLES.example, speechFriendly(content.example));
  }

  push(segments, "question", SEGMENT_TITLES.question, question ? speakQuestion(question) : "بعد الاستماع يمكنك طلب اختبار قصير للتأكد من الفهم.", {
    available: Boolean(question),
    unavailableReason: question ? null : null,
  });

  return segments;
}

function push(
  segments: BlindSegment[],
  type: BlindSegmentType,
  title: string,
  text: string,
  extra?: Partial<Pick<BlindSegment, "detailedText" | "available" | "unavailableReason" | "sourceConceptIds" | "paragraphIndex">>,
): void {
  segments.push({
    id: randomUUID(),
    type,
    order: segments.length + 1,
    title,
    text,
    detailedText: extra?.detailedText ?? null,
    available: extra?.available ?? true,
    unavailableReason: extra?.unavailableReason ?? null,
    sourceConceptIds: extra?.sourceConceptIds ?? [],
    paragraphIndex: extra?.paragraphIndex ?? null,
  });
}

function orientationText(
  content: TeachingContent,
  concepts: AnalysisDto["concepts"],
  diagram: boolean,
  table: boolean,
  paragraphCount: number,
): string {
  const parts = [`سأشرح لك الصفحة أولًا`];
  if (diagram) parts.push("ثم أصف الرسم");
  if (table) parts.push("ثم أوضح الجدول");
  parts.push("وبعد ذلك يمكنك طلب سؤال قصير للتأكد من الفهم.");

  const inventory: string[] = [];
  if (content.title) inventory.push(`شرحًا لـ «${content.title}»`);
  if (concepts.length > 0) inventory.push(`${concepts.length} مفاهيم أساسية`);
  if (paragraphCount > 0) inventory.push(`${paragraphCount} فقرة`);
  if (diagram) inventory.push("رسمًا توضيحيًا");
  if (table) inventory.push("جدولًا");

  const intro =
    inventory.length > 0
      ? `تحتوي الصفحة على ${joinArabic(inventory)}.`
      : "تحتوي الصفحة على النص الذي تم تحليله.";

  return `${intro} ${parts.join("، ")}`;
}

function visualNarration(analysis: AnalysisDto, detailed: boolean): string | null {
  const parts: string[] = [];
  if (analysis.vision?.visualDescription?.trim()) parts.push(speechFriendly(analysis.vision.visualDescription));
  else if (analysis.vision?.summary?.trim() && (analysis.vision.elements.length > 0 || hasDiagram(analysis))) {
    parts.push(speechFriendly(analysis.vision.summary));
  }
  for (const element of analysis.vision?.elements ?? []) {
    if (!element.description?.trim()) continue;
    const where = element.location ? ` في ${element.location}` : "";
    parts.push(`${speechFriendly(element.description)}${where}.`);
  }
  for (const section of analysis.structure.sections) {
    if ((section.type === "diagram" || section.type === "image") && section.description) {
      parts.push(speechFriendly(section.description));
    }
  }
  if (parts.length === 0) return null;
  if (!detailed) return parts[0] ?? null;
  return parts.join(" ");
}

function tableNarration(analysis: AnalysisDto): { summary: string; detail: string | null } {
  const tables = [
    ...(analysis.vision?.tables ?? []),
    ...analysis.structure.sections.filter((section) => section.table).map((section) => section.table!),
  ];
  const first = tables[0];
  if (!first) {
    return { summary: BLIND_MESSAGES.noTable, detail: null };
  }
  const columns = first.headers.length || first.rows[0]?.length || 0;
  const title = first.title ? ` بعنوان ${first.title}` : "";
  const headers = first.headers.filter(Boolean).join("، ");
  const summary = `يوجد في الصفحة جدول${title} يتكون من ${columns || "عدة"} أعمدة${headers ? `: ${headers}` : ""}.`;
  const rowPreview = first.rows
    .slice(0, 4)
    .map((row, index) => `الصف ${arabicOrdinal(index + 1)}: ${row.filter(Boolean).join("، ")}`)
    .join(". ");
  return { summary, detail: rowPreview || null };
}

export function speechFriendly(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/Heading|Paragraph|Diagram placeholder|placeholder/gi, "")
    .replace(/\s+([.!?؟])/g, "$1")
    .trim();
}

function joinArabic(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} و${items[1]}`;
  return `${items.slice(0, -1).join("، ")} و${items[items.length - 1]}`;
}

function arabicOrdinal(value: number): string {
  const names = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة"];
  return names[value - 1] ?? String(value);
}

export function findSegmentIndex(state: BlindLessonState, type: BlindSegmentType): number {
  return state.segments.findIndex((segment) => segment.type === type);
}

export function findParagraphIndex(state: BlindLessonState, paragraphIndex: number): number {
  return state.segments.findIndex((segment) => segment.type === "paragraph" && segment.paragraphIndex === paragraphIndex);
}

export function attachBlindState(
  state: LessonState,
  analysis: AnalysisDto,
  question: PublicQuestion | null,
  speechRate?: number,
): BlindLessonState {
  const next = buildBlindNarrative({
    analysis,
    content: state.content,
    variant: state.strategy.variant,
    question,
    previous: state.blind ?? null,
    speechRate: speechRate ?? state.blind?.speechRate,
  });
  state.blind = next;
  return next;
}

export function publicBlind(
  state: LessonState,
  analysis: AnalysisDto,
  prefs: { speechRate: number | null; preferredVoice: string | null; fontSize: number | null },
): BlindExperienceDto | null {
  if (!state.blind || !shouldUseBlindExperience(state.strategy.mode, state.strategy.variant)) {
    return null;
  }
  return toBlindExperience(state.blind, analysis, prefs);
}
