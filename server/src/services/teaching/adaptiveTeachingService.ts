import { ADAPTATION_RULES } from "../../config/teaching.js";
import type { DifficultyLevel, TeachingVariant } from "../../config/teaching.js";
import type { AdaptationDecision } from "../../types/teaching.js";

export function decideAdaptation(input: {
  adaptiveEnabled: boolean;
  currentVariant: TeachingVariant;
  currentDifficulty: DifficultyLevel;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  explanationRequests: number;
  usedHintOnLastCorrect: boolean;
  replayCount?: number;
}): AdaptationDecision {
  const base = (
    reasonCode: string,
    nextVariant: TeachingVariant,
    nextDifficulty: DifficultyLevel,
    studentMessage: string,
    explainWhy: string,
  ): AdaptationDecision => ({
    changed:
      nextVariant !== input.currentVariant || nextDifficulty !== input.currentDifficulty,
    previousVariant: input.currentVariant,
    nextVariant,
    previousDifficulty: input.currentDifficulty,
    nextDifficulty,
    reasonCode,
    studentMessage,
    explainWhy,
  });

  const none = base("NONE", input.currentVariant, input.currentDifficulty, "", "");

  if (input.consecutiveIncorrect >= ADAPTATION_RULES.incorrectBeforeSimplify) {
    const nextVariant =
      input.currentVariant === "simplified" ? "example" : "simplified";
    return base(
      "REPEATED_ERROR",
      nextVariant,
      easier(input.currentDifficulty),
      "سأشرح هذه النقطة بطريقة أبسط.",
      "لاحظت أنك احتجت إلى مساعدة في هذا المفهوم، لذلك سأقسمه إلى خطوات أصغر.",
    );
  }

  if (input.explanationRequests >= ADAPTATION_RULES.explanationRequestsBeforeSimplify) {
    if (input.currentVariant === "example" || input.currentVariant === "verbal") {
      return none;
    }
    const nextVariant = input.currentVariant === "simplified" ? "example" : "simplified";
    return base(
      "EXPLANATION_REQUESTS",
      nextVariant,
      input.currentDifficulty,
      nextVariant === "example"
        ? "لنجرّب شرح الفكرة بمثال أقرب إلى الحياة اليومية."
        : "سأشرح هذه النقطة بطريقة أبسط.",
      nextVariant === "example"
        ? "طلبت إعادة الشرح بعد التبسيط، لذلك سأعرض مثالًا واقعيًا."
        : "طلبت تبسيطًا أكثر من مرة، لذلك سأعيد الشرح بجمل أقصر.",
    );
  }

  if (
    (input.replayCount ?? 0) >= 2 &&
    (input.currentVariant === "standard" || input.currentVariant === "concise")
  ) {
    return base(
      "REPLAY_DIFFICULTY",
      "example",
      input.currentDifficulty,
      "لنجرّب شرح الفكرة بمثال أقرب إلى الحياة اليومية.",
      "عدت إلى هذه الفكرة أكثر من مرة، لذلك سأعرضها بطريقة مختلفة.",
    );
  }

  if (
    input.adaptiveEnabled &&
    input.consecutiveCorrect >= ADAPTATION_RULES.correctBeforeHarder &&
    !input.usedHintOnLastCorrect
  ) {
    return base(
      "GOOD_PERFORMANCE",
      input.currentVariant === "simplified" ? "standard" : input.currentVariant,
      harder(input.currentDifficulty),
      "يبدو أنك أتقنت هذه النقطة، لننتقل إلى سؤال أكثر تحديًا.",
      "إجاباتك الأخيرة المستقلة كانت صحيحة، لذلك نرفع مستوى التحقق تدريجيًا.",
    );
  }

  return none;
}

function easier(level: DifficultyLevel): DifficultyLevel {
  if (level === "hard") return "medium";
  return "easy";
}

function harder(level: DifficultyLevel): DifficultyLevel {
  if (level === "easy") return "medium";
  return "hard";
}

export function initialVariant(mode: string): TeachingVariant {
  if (mode === "blind") return "verbal";
  if (mode === "dyslexia") return "simplified";
  if (mode === "focus") return "concise";
  return "standard";
}
