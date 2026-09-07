import type { LearningModeConfig } from "../../config/learningModes.js";
import type { TeachingVariant } from "../../config/teaching.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { TeachingContent } from "../../types/teaching.js";
import {
  REANALYZE_HINT,
  TEACHING_CONTENT_VERSION,
  UNREADABLE_MESSAGE,
  isReliableText,
  structuredTeachingContext,
  teachingQualityScore,
} from "./contentQualityService.js";
import { buildLessonModel } from "./lessonModel.js";
import { buildTeachingPlan } from "./teachingPlan.js";

export function buildTeachingContent(
  analysis: AnalysisDto,
  config: LearningModeConfig,
  variant: TeachingVariant,
): TeachingContent {
  const model = buildLessonModel(analysis);
  const plan = buildTeachingPlan({ analysis, mode: config.code, variant, model });
  const lessons = plan.concepts;
  const focus = lessons[0];
  const unreadable = !focus && model.missing.includes(UNREADABLE_MESSAGE);
  const explanation = explanationFor(config.code, variant, focus, model.mainIdea, unreadable);
  const hook = hookFor(config.code, focus, unreadable);
  const keyPoints = keyPointsFor(config, variant, lessons, model.keyPoints);
  const terms = termsFor(config, lessons);
  const visualDescription = visualFor(config, model.visuals, model.tables);
  const example = exampleFor(variant, config.code, focus);
  const relationship = relationshipFor(analysis, focus?.name ?? null);
  const simplifiedExplanation =
    variant === "simplified" || config.simplifyLanguage
      ? simplifyTutor(explanation)
      : null;

  const speechParts = speechFor(config.code, {
    title: model.title,
    explanation: simplifiedExplanation || explanation,
    hook,
    lessons,
    visualDescription,
    example,
    unreadable,
  });

  const steps = keyPoints
    .map((item) => item.text)
    .filter((text) => isReliableText(text) && !nearDuplicate(text, explanation) && !nearDuplicate(text, focus?.what ?? ""));
  const coreIdea = unreadable ? null : focus?.what && isReliableText(focus.what) ? focus.what : (isReliableText(model.mainIdea) ? model.mainIdea : null);

  return {
    title: model.title,
    mainIdea: explanation,
    hook,
    coreIdea,
    keyPoints: steps.length > 0 ? keyPoints.filter((item) => steps.includes(item.text)) : [],
    steps,
    terms,
    importantTerms: terms.map((item) => ({ term: item.name, meaning: item.definition })),
    visualDescription,
    example,
    relationship,
    whyItMatters: focus?.why && isReliableText(focus.why) && !nearDuplicate(focus.why, explanation) ? focus.why : null,
    simplifiedExplanation,
    speechText: speechParts.join(" "),
    unreadable,
    qualityScore: teachingQualityScore({
      sourceReliable: !unreadable && isReliableText(explanation),
      explanation,
      inventedVisual: false,
      unsupportedConcept: false,
    }),
    teachingVersion: TEACHING_CONTENT_VERSION,
  };
}

export function teachingAiContext(
  analysis: AnalysisDto,
  content: TeachingContent,
): string {
  const model = buildLessonModel(analysis);
  return structuredTeachingContext({
    title: content.title,
    concepts: content.terms.map((item) => item.name),
    definitions: content.terms.map((item) => item.definition),
    keyPoints: content.keyPoints.map((item) => item.text),
    reliableSentences: model.keyPoints.map((item) => item.text).filter((item) => isReliableText(item)),
    visuals: model.visuals,
    tables: model.tables,
  });
}

function hookFor(
  mode: LearningModeConfig["code"],
  lesson: ReturnType<typeof buildLessonModel>["concepts"][number] | undefined,
  unreadable: boolean,
): string | null {
  if (unreadable) return REANALYZE_HINT;
  if (!lesson) return null;
  if (mode === "focus") return `الفكرة التي نتعلمها الآن: «${lesson.name}».`;
  if (mode === "blind") return `سنبدأ بفكرة «${lesson.name}».`;
  if (mode === "dyslexia") return `اليوم نقرأ عن «${lesson.name}».`;
  return `نتعلم الآن: «${lesson.name}».`;
}

function explanationFor(
  mode: LearningModeConfig["code"],
  variant: TeachingVariant,
  lesson: ReturnType<typeof buildLessonModel>["concepts"][number] | undefined,
  fallback: string,
  unreadable: boolean,
): string {
  if (unreadable) return UNREADABLE_MESSAGE;
  if (!lesson) return isReliableText(fallback) ? fallback : UNREADABLE_MESSAGE;
  const what = teacherLine(lesson.name, lesson.what);
  if (mode === "focus") {
    return [what, lesson.why].filter((item): item is string => Boolean(item && isReliableText(item))).join(" ");
  }
  if (mode === "dyslexia") return simplifyTutor(what);
  if (mode === "blind") return `الفكرة الرئيسية: ${what}`;
  if (variant === "simplified") return simplifyTutor(what);
  if (variant === "example" && lesson.example) return `${what} ${lesson.example}`;
  return [what, lesson.how].filter((item): item is string => Boolean(item && isReliableText(item))).join(" ");
}

function teacherLine(name: string, source: string): string {
  if (!isReliableText(source) || source.includes("لا تحتوي الصفحة") || source.includes(UNREADABLE_MESSAGE)) {
    return `لا تحتوي الصفحة على معلومات كافية لشرح «${name}».`;
  }
  if (source.includes(name)) return source;
  return `${name}: ${source}`;
}

function keyPointsFor(
  config: LearningModeConfig,
  variant: TeachingVariant,
  lessons: ReturnType<typeof buildLessonModel>["concepts"],
  fallback: { text: string; source: string }[],
) {
  const max = Math.max(1, config.maxKeyPoints);
  const cleanFallback = fallback.filter((item) => isReliableText(item.text)).slice(0, max);
  if (config.code === "focus") {
    const lesson = lessons[0];
    if (!lesson) return cleanFallback.slice(0, 1);
    const rows = [];
    if (lesson.how && isReliableText(lesson.how)) {
      rows.push({ text: lesson.how, source: lesson.evidence });
    }
    if (rows.length === 0) {
      const fallback = cleanFallback.filter(
        (item) => isReliableText(item.text) && !nearDuplicate(item.text, lesson.what),
      );
      const sequenceLike = fallback.length >= 2 && fallback.every((item) => item.text.split(/\s+/).length <= 4);
      return fallback.slice(0, sequenceLike ? Math.min(5, fallback.length) : Math.min(2, max));
    }
    return rows.slice(0, Math.min(2, max));
  }
  if (config.code === "dyslexia") {
    return lessons.slice(0, max).map((item) => ({
      text: simplifyTutor(teacherLine(item.name, item.what)),
      source: item.evidence,
    })).filter((item) => isReliableText(item.text));
  }
  const rows = lessons.slice(0, max).map((item) => ({
    text: variant === "simplified" ? simplifyTutor(teacherLine(item.name, item.what)) : teacherLine(item.name, item.what),
    source: item.evidence,
  })).filter((item) => isReliableText(item.text));
  return rows.length > 0 ? rows : cleanFallback;
}

function termsFor(
  config: LearningModeConfig,
  lessons: ReturnType<typeof buildLessonModel>["concepts"],
) {
  const limit = config.code === "focus" ? Math.max(1, config.maxConceptsPerStep) : lessons.length;
  return lessons.slice(0, limit).map((item) => ({
    conceptId: item.conceptId,
    name: item.name,
    definition: teacherLine(item.name, item.what),
  }));
}

function visualFor(config: LearningModeConfig, visuals: string[], tables: string[]): string | null {
  if (config.code === "focus" || config.code === "dyslexia") return null;
  const parts = [...visuals, ...tables].filter((item) => isReliableText(item));
  if (parts.length === 0) return null;
  return parts.join(" ");
}

function exampleFor(
  variant: TeachingVariant,
  mode: LearningModeConfig["code"],
  lesson: ReturnType<typeof buildLessonModel>["concepts"][number] | undefined,
): string | null {
  if (mode === "focus" && lesson?.example && isReliableText(lesson.example)) return lesson.example;
  if (variant !== "example") return null;
  return lesson?.example && isReliableText(lesson.example) ? lesson.example : null;
}

function relationshipFor(analysis: AnalysisDto, name: string | null): string | null {
  if (!name) return null;
  const rel = analysis.relationships.find(
    (item) => (item.source === name || item.target === name) && item.source && item.target,
  );
  if (!rel || !isReliableText(rel.source) || !isReliableText(rel.target)) return null;
  return `${rel.source} يرتبط بـ ${rel.target}.`;
}

function speechFor(
  mode: LearningModeConfig["code"],
  input: {
    title: string;
    explanation: string;
    hook: string | null;
    lessons: ReturnType<typeof buildLessonModel>["concepts"];
    visualDescription: string | null;
    example: string | null;
    unreadable: boolean;
  },
): string[] {
  if (input.unreadable) return [UNREADABLE_MESSAGE, REANALYZE_HINT];
  if (mode === "blind") {
    return [
      `سنبدأ بصفحة بعنوان ${input.title}.`,
      input.hook,
      input.explanation,
      input.lessons.length > 0 ? `لدينا ${input.lessons.length} مفاهيم رئيسية.` : null,
      ...input.lessons.map((item, index) =>
        index === 0 ? `أولًا: ${item.name}. ${teacherLine(item.name, item.what)}` : `${item.name}. ${teacherLine(item.name, item.what)}`,
      ),
      input.visualDescription ? `وصف ما يظهر في الصفحة: ${input.visualDescription}` : "لا يوجد رسم موصوف في هذه الصفحة.",
    ].filter((item): item is string => Boolean(item));
  }
  return [input.hook, input.explanation, input.example].filter((item): item is string => Boolean(item));
}

function simplifyTutor(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/،/g, ".")
    .split(".")
    .map((part) => part.trim())
    .filter((part) => part && isReliableText(part))
    .slice(0, 2)
    .join(". ");
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
