import { VARIANT_BLURBS, VARIANT_LABELS } from "../../config/adaptive.js";
import type { TeachingVariant } from "../../config/teaching.js";
import type {
  AdaptiveEvidenceDto,
  AdaptiveHistoryItemDto,
  AdaptiveLessonState,
  AdaptiveStrategyStepDto,
} from "../../types/adaptive.js";
import type { LessonState, TeachingContent } from "../../types/teaching.js";

export function emptyAdaptiveState(): AdaptiveLessonState {
  return {
    previousExplanation: null,
    previousVariant: null,
    lastReasonCode: null,
    lastInsight: null,
    lastChangedAt: null,
    adaptationCount: 0,
    lastFeedback: null,
    lastFingerprint: null,
    cached: {},
  };
}

export function attachAdaptiveState(state: LessonState): AdaptiveLessonState {
  if (!state.adaptive) state.adaptive = emptyAdaptiveState();
  return state.adaptive;
}

export function explanationText(content: TeachingContent, variant: TeachingVariant): string {
  if (variant === "example" && content.example) return content.example;
  if (variant === "simplified" && content.simplifiedExplanation) return content.simplifiedExplanation;
  return content.mainIdea;
}

export function evidenceFingerprint(evidence: AdaptiveEvidenceDto): string {
  return [
    evidence.explanationRequests,
    evidence.incorrectAnswers,
    evidence.exampleRequests,
    evidence.replayCount,
    evidence.hintCount,
  ].join(":");
}

export function collectEvidence(
  state: LessonState,
  extra: { replayCount: number; incorrectAnswers: number; pauseSeconds: number | null },
): AdaptiveEvidenceDto {
  return {
    explanationRequests: state.explanationRequests,
    simplifyRequests: state.explanationRequests,
    exampleRequests: state.examplesRequested,
    incorrectAnswers: Math.max(state.consecutiveIncorrect, extra.incorrectAnswers),
    correctAnswers: state.consecutiveCorrect,
    replayCount: extra.replayCount,
    hintCount: state.hintsUsed,
    pauseSeconds: extra.pauseSeconds,
    adaptationCount: state.adaptive?.adaptationCount ?? 0,
  };
}

export function hasAnyEvidence(evidence: AdaptiveEvidenceDto): boolean {
  return (
    evidence.explanationRequests > 0 ||
    evidence.incorrectAnswers > 0 ||
    evidence.exampleRequests > 0 ||
    evidence.replayCount > 0 ||
    evidence.hintCount > 0 ||
    evidence.adaptationCount > 0
  );
}

export function buildInsight(
  evidence: AdaptiveEvidenceDto,
  reasonCode: string | null,
  nextVariant?: string,
): string | null {
  if (!hasAnyEvidence(evidence) && !reasonCode) return null;
  const parts: string[] = [];
  if (evidence.explanationRequests > 0) {
    parts.push(
      evidence.explanationRequests === 1
        ? "طلبت إعادة الشرح مرة واحدة"
        : `طلبت إعادة الشرح ${evidence.explanationRequests} مرات`,
    );
  }
  if (evidence.incorrectAnswers > 0) {
    parts.push(
      evidence.incorrectAnswers === 1
        ? "ظهرت إجابة غير دقيقة على هذه الفكرة"
        : `ظهرت ${evidence.incorrectAnswers} إجابات غير دقيقة`,
    );
  }
  if (evidence.replayCount > 0) {
    parts.push(
      evidence.replayCount === 1 ? "عدت إلى الفكرة مرة" : `عدت إلى الفكرة ${evidence.replayCount} مرات`,
    );
  }
  if (evidence.exampleRequests > 0) {
    parts.push("طلبت مثالًا أقرب إلى الحياة اليومية");
  }
  if (evidence.pauseSeconds && evidence.pauseSeconds >= 20 && parts.length > 0) {
    parts.push(`واستغرقت ${evidence.pauseSeconds} ثانية عند الفكرة`);
  }

  if (parts.length === 0) {
    return reasonCode ? reasonToAction(reasonCode, nextVariant) : null;
  }

  const observed = `لاحظ فَهْم أنك ${parts.join("، ")}`;
  return `${observed}، ${reasonToAction(reasonCode, nextVariant)}.`;
}

export function reasonToAction(reasonCode: string | null, nextVariant?: string): string {
  if (nextVariant === "example") return "لذلك سأشرحها بمثال واقعي";
  switch (reasonCode) {
    case "REPEATED_ERROR":
      return "لذلك سأعود إلى الفكرة بطريقة أوضح";
    case "EXPLANATION_REQUESTS":
    case "STUDENT_SIMPLIFY":
      return "لذلك سأستخدم شرحًا أبسط";
    case "STUDENT_EXAMPLE":
    case "REPLAY_DIFFICULTY":
      return "لذلك سأشرحها بمثال واقعي";
    case "GOOD_PERFORMANCE":
      return "لذلك نرفع مستوى التحقق تدريجيًا";
    default:
      return "لذلك سيجرّب فَهْم طريقة شرح مختلفة عند الحاجة";
  }
}

export function reasonLabel(reasonCode: string | null): string | null {
  switch (reasonCode) {
    case "REPEATED_ERROR":
      return "إجابات غير دقيقة متكررة";
    case "EXPLANATION_REQUESTS":
      return "طلبات إعادة الشرح";
    case "STUDENT_SIMPLIFY":
      return "طلب تبسيط الفكرة";
    case "STUDENT_EXAMPLE":
      return "طلب مثال";
    case "REPLAY_DIFFICULTY":
      return "إعادة الفكرة أكثر من مرة";
    case "GOOD_PERFORMANCE":
      return "إجابات صحيحة مستقلة";
    default:
      return null;
  }
}

export function variantLabel(variant: string): string {
  return VARIANT_LABELS[variant] ?? "شرح مباشر";
}

export function variantBlurb(variant: string): string {
  return VARIANT_BLURBS[variant] ?? VARIANT_BLURBS.standard;
}

export function strategySteps(
  current: TeachingVariant,
  previous: TeachingVariant | null,
  visualAvailable: boolean,
): AdaptiveStrategyStepDto[] {
  const tried = new Set<string>();
  if (previous) tried.add(normalizeStrategy(previous));
  const currentId = normalizeStrategy(current);
  const order: Array<{ id: string; label: string; variant: TeachingVariant | "visual" }> = [
    { id: "standard", label: "شرح مباشر", variant: current === "concise" ? "concise" : "standard" },
    { id: "simplified", label: "شرح مبسط", variant: "simplified" },
    { id: "example", label: "مثال واقعي", variant: "example" },
    { id: "visual", label: "تمثيل بصري", variant: "visual" },
    { id: "verbal", label: "شرح صوتي", variant: "verbal" },
  ];
  return order.map((item) => {
    if (item.id === "visual" && !visualAvailable) {
      return { ...item, state: "unavailable", note: "لا يوجد رسم في الصفحة يمكن استخدامه هنا." };
    }
    if (item.id === currentId) {
      return { ...item, state: "current", note: "الطريقة الحالية" };
    }
    if (tried.has(item.id)) {
      return { ...item, state: "past", note: "لم تنجح" };
    }
    return { ...item, state: "next", note: null };
  });
}

export function historyItem(
  previous: TeachingVariant | null,
  current: TeachingVariant,
  reasonCode: string | null,
): AdaptiveHistoryItemDto | null {
  if (!previous || previous === current) return null;
  return {
    reason: reasonLabel(reasonCode) ?? "تفاعل الجلسة",
    fromLabel: variantLabel(previous),
    toLabel: variantLabel(current),
  };
}

function normalizeStrategy(variant: TeachingVariant): string {
  if (variant === "concise") return "standard";
  return variant;
}
