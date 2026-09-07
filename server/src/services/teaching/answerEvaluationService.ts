import type { QuestionKind } from "../../config/teaching.js";
import type { QuestionSecret } from "../../types/teaching.js";
import { normalizeArabic, tokensOf } from "./arabicNormalize.js";

export function evaluateAnswer(input: {
  type: QuestionKind;
  submitted: string;
  secret: QuestionSecret;
}): { isCorrect: boolean; score: number } {
  const answer = normalizeArabic(input.submitted);
  if (!answer) return { isCorrect: false, score: 0 };

  const correct = normalizeArabic(input.secret.correct);
  const aliases = (input.secret.aliases ?? []).map(normalizeArabic);

  if (input.type === "multiple_choice" || input.type === "true_false") {
    const ok = answer === correct || aliases.includes(answer);
    return { isCorrect: ok, score: ok ? 100 : 0 };
  }

  if (answer === correct || aliases.includes(answer)) {
    return { isCorrect: true, score: 100 };
  }

  const needed = tokensOf(input.secret.correct);
  if (needed.length === 0) return { isCorrect: false, score: 0 };
  const given = new Set(tokensOf(input.submitted));
  const hits = needed.filter((token) => given.has(token)).length;
  const ratio = hits / needed.length;
  if (ratio >= 0.6) return { isCorrect: true, score: Math.round(ratio * 100) };
  return { isCorrect: false, score: Math.round(ratio * 100) };
}

export function feedbackFor(isCorrect: boolean, usedHint: boolean, explanation: string | null) {
  if (isCorrect && usedHint) {
    return {
      type: "partial" as const,
      message: "إجابتك صحيحة بعد المساعدة. هذا تقدم، وسنثبّت الفهم بسؤال لاحق.",
      explanation,
      usedHint: true,
    };
  }
  if (isCorrect) {
    return {
      type: "correct" as const,
      message: "أحسنت! إجابتك صحيحة.",
      explanation,
      usedHint: false,
    };
  }
  return {
    type: "incorrect" as const,
    message: "لنراجع هذه النقطة معًا.",
    explanation: explanation ?? "يبدو أن هذه النقطة تحتاج توضيحًا إضافيًا.",
    usedHint,
  };
}
