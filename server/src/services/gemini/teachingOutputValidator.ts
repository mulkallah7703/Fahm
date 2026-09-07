import { containsCorruptTeaching, isReliableText, looksLikeOcrGarbage } from "../teaching/contentQualityService.js";
import { geminiTeachingSchema, type GeminiTeachingOutput, type MaterialUnderstanding } from "./geminiSchemas.js";

export interface TeachingValidation {
  ok: boolean;
  score: number;
  errors: string[];
  output: GeminiTeachingOutput | null;
}

export function validateTeachingOutput(input: {
  raw: unknown;
  understanding: MaterialUnderstanding;
  allowVisual: boolean;
}): TeachingValidation {
  const errors: string[] = [];
  const parsed = geminiTeachingSchema.safeParse(input.raw);
  if (!parsed.success) {
    return { ok: false, score: 0, errors: ["invalid_schema"], output: null };
  }
  const output = parsed.data;
  const allowed = new Set(input.understanding.concepts.map((item) => item.name));
  const blobs = [
    output.coreIdea,
    output.explanation,
    output.quickCheck.question,
    ...output.steps,
    ...output.importantTerms.map((item) => `${item.term} ${item.meaning}`),
    ...(output.example ? [output.example] : []),
  ];
  if (blobs.some((text) => containsCorruptTeaching(text) || !isReliableText(text))) {
    errors.push("ocr_garbage");
  }
  if (!allowed.has(output.concept) && ![...allowed].some((name) => output.concept.includes(name) || name.includes(output.concept))) {
    errors.push("unknown_concept");
  }
  if (output.sourceEvidence.length === 0) errors.push("missing_evidence");
  if (output.quality.unsupportedClaims > 0 || !output.quality.grounded) errors.push("unsupported_claims");
  if (!input.allowVisual && /في الرسم|يوضح الرسم|في الجدول|كما يظهر في الصورة/.test(`${output.explanation} ${output.coreIdea}`)) {
    errors.push("fake_visual");
  }
  if (output.example && (nearDuplicate(output.example, output.explanation) || nearDuplicate(output.example, output.coreIdea))) {
    errors.push("fake_example");
  }
  if (nearDuplicate(output.coreIdea, output.explanation) && output.steps.every((step) => nearDuplicate(step, output.explanation))) {
    errors.push("duplicated_explanation");
  }
  if (/ignore previous|system prompt|OPENAI|GEMINI_API_KEY|correctAnswer|الإجابة الصحيحة/i.test(JSON.stringify(output))) {
    errors.push("prompt_leak");
  }
  if (output.explanation.length > 850) errors.push("too_long");
  if (output.steps.some((step) => looksLikeOcrGarbage(step.split(/\s+/)[0] ?? ""))) errors.push("ocr_garbage");
  const score = teachingQualityTotal({
    grounded: errors.length === 0,
    conceptOk: !errors.includes("unknown_concept"),
    arabicOk: !errors.includes("ocr_garbage"),
    structured: output.steps.length > 0 && Boolean(output.coreIdea),
    visualOk: !errors.includes("fake_visual"),
  });
  return {
    ok: errors.length === 0 && score >= 80,
    score,
    errors,
    output,
  };
}

export function teachingQualityTotal(input: {
  grounded: boolean;
  conceptOk: boolean;
  arabicOk: boolean;
  structured: boolean;
  visualOk: boolean;
}): number {
  return (
    (input.grounded ? 30 : 8) +
    (input.conceptOk ? 20 : 4) +
    (input.arabicOk ? 20 : 4) +
    (input.structured ? 15 : 5) +
    10 +
    (input.visualOk ? 5 : 0)
  );
}

export function looksLikeCorruptToken(token: string): boolean {
  return looksLikeOcrGarbage(token);
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
