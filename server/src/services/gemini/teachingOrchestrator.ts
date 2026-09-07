import { createHash } from "node:crypto";
import { LEARNING_MODE_CONFIGS, type LearningModeCode } from "../../config/learningModes.js";
import type { TeachingVariant } from "../../config/teaching.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { LessonState, MaterialUnderstandingSnapshot, TeachingContent } from "../../types/teaching.js";
import { prepareVisionImage } from "../ocr/preprocess.js";
import { storageService } from "../storage/storageService.js";
import {
  REANALYZE_HINT,
  TEACHING_CONTENT_VERSION,
  UNREADABLE_MESSAGE,
  containsCorruptTeaching,
  isReliableText,
} from "../teaching/contentQualityService.js";
import { buildTeachingContent } from "../teaching/teachingContentService.js";
import type { GeminiImagePart, GeminiJsonFn } from "./geminiClient.js";
import { understandMaterial } from "./geminiMaterialUnderstandingService.js";
import { generateGeminiTeaching } from "./geminiTeachingService.js";
import type { GeminiTeachingOutput, MaterialUnderstanding } from "./geminiSchemas.js";
import { buildStudentTeachingProfile, type StudentTeachingProfile } from "./studentTeachingProfile.js";

export const GEMINI_TEACHING_VERSION = TEACHING_CONTENT_VERSION;

export async function composeGroundedTeaching(input: {
  analysis: AnalysisDto;
  mode: LearningModeCode;
  variant: TeachingVariant;
  state: LessonState | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  imageUrl?: string | null;
  speechRate?: number | null;
  fontSize?: number | null;
  generate?: GeminiJsonFn;
  force?: boolean;
}): Promise<{ content: TeachingContent; understanding: MaterialUnderstanding; cacheKey: string }> {
  const profile = buildStudentTeachingProfile({
    state: input.state,
    mode: input.mode,
    variant: input.variant,
    speechRate: input.speechRate,
    fontSize: input.fontSize,
  });
  const understanding = await resolveUnderstanding(input);
  const cacheKey = teachingCacheKey({
    understanding,
    mode: input.mode,
    variant: input.variant,
    concept: understanding.concepts[0]?.name ?? "page",
  });
  if (!input.force && input.state?.content && sameCache(input.state, cacheKey, input.mode, input.variant)) {
    return { content: input.state.content, understanding, cacheKey };
  }

  if (understanding.sourceQuality === "low" && !understanding.cleanText && understanding.concepts.length === 0) {
    return {
      understanding,
      cacheKey,
      content: unreadableContent(input.analysis.material.title),
    };
  }

  const generated = await generateGeminiTeaching({
    understanding,
    profile,
    generate: input.generate,
  });
  if (generated.output) {
    return {
      understanding,
      cacheKey,
      content: contentFromGemini(generated.output, understanding, profile, generated.score),
    };
  }

  const overlay = overlayAnalysisWithUnderstanding(input.analysis, understanding);
  const fallback = buildTeachingContent(overlay, LEARNING_MODE_CONFIGS[input.mode], input.variant);
  fallback.teachingVersion = GEMINI_TEACHING_VERSION;
  if (containsCorruptTeaching(fallback.mainIdea)) {
    return { understanding, cacheKey, content: unreadableContent(understanding.pageTitle) };
  }
  return { understanding, cacheKey, content: fallback };
}

export function applyTeachingToState(
  state: LessonState,
  composed: { content: TeachingContent; understanding: MaterialUnderstanding; cacheKey: string },
): LessonState {
  state.content = composed.content;
  state.version = GEMINI_TEACHING_VERSION;
  state.teachingCacheKey = composed.cacheKey;
  state.materialUnderstanding = toSnapshot(composed.understanding);
  return state;
}

export function teachingCacheKey(input: {
  understanding: MaterialUnderstanding;
  mode: string;
  variant: string;
  concept: string;
}): string {
  const hash = createHash("sha256")
    .update(`${input.understanding.cleanText}|${input.understanding.concepts.map((item) => item.name).join(",")}`)
    .digest("hex")
    .slice(0, 16);
  return `teaching:v${GEMINI_TEACHING_VERSION}:${hash}:${input.mode}:${input.variant}:${input.concept}`;
}

export function shouldRefreshTeaching(state: LessonState | null, mode: LearningModeCode, variant: TeachingVariant): boolean {
  if (!state) return true;
  if ((state.version ?? 1) < GEMINI_TEACHING_VERSION) return true;
  if ((state.content.teachingVersion ?? 1) < GEMINI_TEACHING_VERSION) return true;
  if (state.strategy.mode !== mode || state.strategy.variant !== variant) return true;
  return containsCorruptTeaching(state.content.mainIdea) || containsCorruptTeaching(state.content.speechText);
}

export function overlayAnalysisWithUnderstanding(
  analysis: AnalysisDto,
  understanding: MaterialUnderstanding | MaterialUnderstandingSnapshot,
): AnalysisDto {
  const named = understanding.concepts.map((concept, index) => {
    const existing =
      analysis.concepts.find((item) => item.name === concept.name) ??
      analysis.concepts.find((item) => concept.name.includes(item.name) || item.name.includes(concept.name));
    return {
      id: existing?.id ?? analysis.concepts[index]?.id ?? `local-${index}`,
      name: concept.name,
      description: concept.definition,
      subject: existing?.subject ?? null,
      importanceScore: concept.importance === "core" ? 90 : 60,
      confidenceScore: 80,
    };
  });
  return {
    ...analysis,
    material: { ...analysis.material, title: understanding.pageTitle || analysis.material.title },
    ocr: analysis.ocr
      ? { ...analysis.ocr, text: understanding.cleanText || analysis.ocr.text }
      : understanding.cleanText
        ? {
            text: understanding.cleanText,
            originalText: understanding.cleanText,
            isCorrected: true,
            language: "ar",
            confidence: 80,
            processingTimeMs: 0,
            engine: "gemini-understanding",
            lowConfidence: false,
          }
        : analysis.ocr,
    concepts: named.length > 0 ? named : analysis.concepts,
    relationships: understanding.relationships.map((item) => ({
      source: item.from,
      target: item.to,
      type: item.relationship,
      confidenceScore: 0.6,
    })),
  };
}

async function resolveUnderstanding(input: {
  analysis: AnalysisDto;
  state: LessonState | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  imageUrl?: string | null;
  generate?: GeminiJsonFn;
  force?: boolean;
}): Promise<MaterialUnderstanding> {
  if (!input.force && reusableUnderstanding(input.state)) {
    return fromSnapshot(input.state!.materialUnderstanding!);
  }
  const image = await loadPageAsset(input.fileUrl, input.mimeType, input.imageUrl);
  return understandMaterial({
    analysis: input.analysis,
    image,
    generate: input.generate,
  });
}

function reusableUnderstanding(state: LessonState | null): boolean {
  const snap = state?.materialUnderstanding;
  if (!snap) return false;
  if ((state?.version ?? 1) < GEMINI_TEACHING_VERSION) return false;
  if (containsCorruptTeaching(snap.cleanText) || containsCorruptTeaching(snap.mainIdea)) return false;
  return snap.sourceQuality !== "low" || snap.concepts.length > 0;
}

async function loadPageAsset(
  fileUrl?: string | null,
  mimeType?: string | null,
  imageUrl?: string | null,
): Promise<GeminiImagePart | null> {
  const key = imageUrl || fileUrl;
  if (!key) return null;
  try {
    const buffer = await storageService.read(key);
    if (!imageUrl && (mimeType ?? "").includes("pdf")) {
      return { mime: "application/pdf", base64: buffer.toString("base64") };
    }
    const prepared = await prepareVisionImage(buffer);
    return { mime: prepared.mime, base64: prepared.base64 };
  } catch {
    return null;
  }
}

function sameCache(state: LessonState, cacheKey: string, mode: LearningModeCode, variant: TeachingVariant): boolean {
  return (
    state.content.teachingVersion === GEMINI_TEACHING_VERSION &&
    state.strategy.mode === mode &&
    state.strategy.variant === variant &&
    !containsCorruptTeaching(state.content.mainIdea) &&
    state.teachingCacheKey === cacheKey
  );
}

function contentFromGemini(
  output: GeminiTeachingOutput,
  understanding: MaterialUnderstanding,
  profile: StudentTeachingProfile,
  score: number,
): TeachingContent {
  const steps = unique(output.steps.filter((step) => isReliableText(step) && !nearDuplicate(step, output.explanation)));
  const hook =
    profile.mode === "blind"
      ? `لنبدأ بالفكرة الأساسية: «${output.concept}».`
      : profile.mode === "dyslexia"
        ? `اليوم نقرأ عن «${output.concept}».`
        : `الفكرة التي نتعلمها الآن: «${output.concept}».`;
  const speech =
    profile.mode === "blind"
      ? [
          "لنبدأ بالفكرة الأساسية.",
          output.coreIdea,
          output.explanation,
          ...steps.map((step, index) => (index === 0 ? `الفكرة الأولى: ${step}` : `الآن ننتقل إلى: ${step}`)),
          output.example ? `مثال من المادة: ${output.example}` : null,
          understanding.visuals[0] ? `وصف ما يظهر: ${understanding.visuals[0].description}` : "لا يوجد رسم موصوف في هذه الصفحة.",
        ]
          .filter(Boolean)
          .join(" ")
      : [hook, output.coreIdea, output.explanation].join(" ");
  return {
    title: output.title || understanding.pageTitle,
    mainIdea: profile.mode === "dyslexia" ? shorten(output.coreIdea) : output.explanation,
    hook,
    coreIdea: output.coreIdea,
    keyPoints: steps.map((text) => ({ text, source: "من فهم الصفحة" })),
    steps,
    terms: output.importantTerms.map((item, index) => ({
      conceptId: understanding.concepts[index]?.name ?? item.term,
      name: item.term,
      definition: item.meaning,
    })),
    importantTerms: output.importantTerms,
    visualDescription: profile.mode === "focus" || profile.mode === "dyslexia" ? null : understanding.visuals[0]?.description ?? null,
    example: output.example && isReliableText(output.example) ? output.example : null,
    relationship: output.relationship,
    whyItMatters: output.whyItMatters,
    simplifiedExplanation: profile.variant === "simplified" || profile.mode === "dyslexia" ? shorten(output.explanation) : null,
    speechText: speech,
    unreadable: false,
    qualityScore: score / 100,
    teachingVersion: GEMINI_TEACHING_VERSION,
  };
}

function unreadableContent(title: string): TeachingContent {
  return {
    title,
    mainIdea: UNREADABLE_MESSAGE,
    hook: REANALYZE_HINT,
    coreIdea: null,
    keyPoints: [],
    steps: [],
    terms: [],
    importantTerms: [],
    visualDescription: null,
    example: null,
    relationship: null,
    whyItMatters: null,
    simplifiedExplanation: null,
    speechText: `${UNREADABLE_MESSAGE} ${REANALYZE_HINT}`,
    unreadable: true,
    qualityScore: 0,
    teachingVersion: GEMINI_TEACHING_VERSION,
  };
}

function toSnapshot(value: MaterialUnderstanding): MaterialUnderstandingSnapshot {
  return {
    pageTitle: value.pageTitle,
    mainIdea: value.mainIdea,
    cleanText: value.cleanText,
    sourceQuality: value.sourceQuality,
    needsReanalysis: value.needsReanalysis,
    concepts: value.concepts,
    relationships: value.relationships,
    examples: value.examples,
    visuals: value.visuals,
  };
}

function fromSnapshot(value: MaterialUnderstandingSnapshot): MaterialUnderstanding {
  return {
    pageTitle: value.pageTitle,
    mainIdea: value.mainIdea,
    sections: [],
    concepts: value.concepts,
    relationships: value.relationships.map((item) => ({
      from: item.from,
      relationship: (["causes", "leads_to", "part_of", "contrasts_with", "sequence"].includes(item.relationship)
        ? item.relationship
        : "leads_to") as MaterialUnderstanding["relationships"][number]["relationship"],
      to: item.to,
      evidence: item.evidence,
    })),
    examples: value.examples,
    visuals: value.visuals.map((item) => ({
      type: (["diagram", "chart", "table", "illustration", "none"].includes(item.type)
        ? item.type
        : "none") as MaterialUnderstanding["visuals"][number]["type"],
      description: item.description,
      evidence: item.evidence,
    })),
    cleanText: value.cleanText,
    sourceQuality: value.sourceQuality,
    needsReanalysis: value.needsReanalysis,
  };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function nearDuplicate(left: string, right: string): boolean {
  const a = left.replace(/\s+/g, " ").trim();
  const b = right.replace(/\s+/g, " ").trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 28) return false;
  return longer.includes(shorter);
}

function shorten(text: string): string {
  return text
    .split(/(?<=[.!؟])\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
}
