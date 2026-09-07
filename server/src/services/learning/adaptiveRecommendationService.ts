import {
  ADAPTIVE_WEIGHTS,
  isLearningModeCode,
  type LearningModeCode,
} from "../../config/learningModes.js";
import type {
  AccessibilitySignals,
  ModeRecommendation,
  PublicComplexity,
} from "../../types/learning.js";
import { explicitPreferenceFromAccess } from "./contentComplexityService.js";
import type { ModeEffectivenessScore } from "./modeEffectivenessService.js";

export interface RecommendationInput {
  accessibility: AccessibilitySignals | null;
  defaultLearningMode: string | null;
  complexity: PublicComplexity;
  recentMastery: number | null;
  recentErrorRate: number | null;
  explanationNeed: number | null;
  pulseScore: number | null;
  reviewConceptCount: number;
  effectiveness: ModeEffectivenessScore[];
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function asMode(value: string | null | undefined): LearningModeCode | null {
  if (!value) return null;
  return isLearningModeCode(value) ? value : null;
}

function reasonFor(code: string, mode: LearningModeCode): string {
  switch (code) {
    case "EXPLICIT_BLIND_SUPPORT":
      return "أقترح هذا الوضع لأن تفضيلات الوصول التي اخترتها تتضمن دعمًا صوتيًا ووصفًا للعناصر البصرية.";
    case "EXPLICIT_READING_SUPPORT":
      return "أقترح هذا الوضع لأن تفضيلاتك تشير إلى أنك تستفيد من لغة أبسط وفقرات أقصر.";
    case "EXPLICIT_FOCUS_SUPPORT":
      return "أقترح وضع التركيز لأن تفضيلاتك تشير إلى أنك تستفيد من الشرح المختصر والخطوات القصيرة.";
    case "EXPLICIT_AUDIO_PREFERENCE":
      return "أقترح هذا الوضع لأنك فعّلت تفضيل الدعم الصوتي.";
    case "PROFILE_DEFAULT":
      return "أقترح هذه الطريقة لأنها طريقة التعلم المفضلة في ملفك.";
    case "NEW_LEARNER":
      return "ما زلنا نتعرف على طريقة تعلمك. سنبدأ بالوضع التكيفي ونتعلم من تفاعلك أثناء الدرس.";
    case "HIGH_LOAD_LOW_MASTERY":
      return "لأن المحتوى الحالي يحتوي على مفاهيم مترابطة، وأداؤك الأخير يشير إلى أنك تستفيد أكثر من الشرح المختصر والأسئلة التفاعلية.";
    case "HIGH_ERROR_COMPLEX_CONTENT":
      return "لأن إجاباتك الأخيرة تشير إلى استفادتك من التقسيم إلى أجزاء قصيرة مع تحقق متكرر.";
    case "HIGH_EXPLANATION_NEED":
      return "لأنك احتجت إلى تبسيط إضافي في المفاهيم السابقة.";
    case "RECENT_MODE_EFFECTIVENESS":
      return "الأداء الأخير في هذا الوضع كان أفضل.";
    case "HIGH_MASTERY_ADAPTIVE":
      return "أداؤك الأخير مستقر، لذلك يمكن لفَهْم أن يغيّر طريقة الشرح حسب تفاعلك أثناء الدرس.";
    case "COMPLEX_CONTENT_ADAPTIVE":
      return "لأن المحتوى الحالي يحتوي على مفاهيم مترابطة وقد تستفيد من التدرج في الشرح.";
    default:
      return mode === "adaptive"
        ? "فَهْم يتعلم من تفاعلك ليحسن طريقة الشرح حسب المحتوى وأدائك."
        : "يمكن تجربة هذه الطريقة حسب إشارات التعلم المتوفرة.";
  }
}

export function recommendMode(input: RecommendationInput): ModeRecommendation {
  const access = input.accessibility;
  const explicit = access
    ? explicitPreferenceFromAccess(access)
    : null;
  const explicitCode = explicit
    ? access?.blindSupport
      ? "EXPLICIT_BLIND_SUPPORT"
      : access?.dyslexiaSupport || access?.simplifiedLanguage
        ? "EXPLICIT_READING_SUPPORT"
        : access?.focusSupport
          ? "EXPLICIT_FOCUS_SUPPORT"
          : "EXPLICIT_AUDIO_PREFERENCE"
    : null;

  const historyAvailable =
    input.recentMastery !== null ||
    input.recentErrorRate !== null ||
    input.pulseScore !== null ||
    input.effectiveness.length > 0 ||
    input.reviewConceptCount > 0;

  const publicSignals = {
    contentComplexity: input.complexity.level === "unknown" ? null : input.complexity.score,
    recentMastery: input.recentMastery,
    recentErrorRate: input.recentErrorRate,
    historyAvailable,
    explicitPreference: Boolean(explicit),
  };

  if (explicit && explicitCode) {
    return {
      recommendedMode: explicit,
      confidence: 0.92,
      reasonCode: explicitCode,
      reasonText: reasonFor(explicitCode, explicit),
      isNewLearner: !historyAvailable,
      usedExplicitPreference: true,
      signals: publicSignals,
    };
  }

  const profileDefault = asMode(input.defaultLearningMode);
  if (profileDefault && profileDefault !== "adaptive") {
    return {
      recommendedMode: profileDefault,
      confidence: 0.78,
      reasonCode: "PROFILE_DEFAULT",
      reasonText: reasonFor("PROFILE_DEFAULT", profileDefault),
      isNewLearner: !historyAvailable,
      usedExplicitPreference: true,
      signals: { ...publicSignals, explicitPreference: true },
    };
  }

  if (!historyAvailable) {
    return {
      recommendedMode: "adaptive",
      confidence: 0.55,
      reasonCode: "NEW_LEARNER",
      reasonText: reasonFor("NEW_LEARNER", "adaptive"),
      isNewLearner: true,
      usedExplicitPreference: false,
      signals: publicSignals,
    };
  }

  const complexity = input.complexity.score;
  const mastery = input.recentMastery;
  const errorRate = input.recentErrorRate;
  const explanationNeed = input.explanationNeed;
  const highComplexity =
    input.complexity.level === "high" || complexity >= ADAPTIVE_WEIGHTS.highComplexityThreshold;
  const lowMastery =
    mastery !== null && mastery < ADAPTIVE_WEIGHTS.lowMasteryThreshold;
  const highError =
    errorRate !== null && errorRate >= ADAPTIVE_WEIGHTS.highErrorThreshold;

  if (highComplexity && lowMastery) {
    return finish("focus", "HIGH_LOAD_LOW_MASTERY", 0.84, publicSignals);
  }
  if (highComplexity && highError) {
    return finish("focus", "HIGH_ERROR_COMPLEX_CONTENT", 0.8, publicSignals);
  }
  if ((explanationNeed ?? 0) >= 0.45 && (lowMastery || highComplexity)) {
    return finish("focus", "HIGH_EXPLANATION_NEED", 0.76, publicSignals);
  }

  const best = input.effectiveness[0];
  const second = input.effectiveness[1];
  if (
    best &&
    best.score >= ADAPTIVE_WEIGHTS.effectivenessFloor &&
    (!second || best.score - second.score >= ADAPTIVE_WEIGHTS.effectivenessLead)
  ) {
    return finish(best.mode, "RECENT_MODE_EFFECTIVENESS", 0.74, publicSignals);
  }

  if (mastery !== null && mastery >= 0.75 && input.complexity.level !== "high") {
    return finish("adaptive", "HIGH_MASTERY_ADAPTIVE", 0.7, publicSignals);
  }

  if (highComplexity) {
    return finish("adaptive", "COMPLEX_CONTENT_ADAPTIVE", 0.68, publicSignals);
  }

  const focusNeed =
    ADAPTIVE_WEIGHTS.contentComplexity * complexity +
    ADAPTIVE_WEIGHTS.lowMastery * (mastery === null ? 0.4 : 1 - mastery) +
    ADAPTIVE_WEIGHTS.recentErrorRate * (errorRate ?? 0) +
    ADAPTIVE_WEIGHTS.explanationNeed * (explanationNeed ?? 0) +
    ADAPTIVE_WEIGHTS.pulseSupport * (input.pulseScore === null ? 0.4 : 1 - input.pulseScore);

  if (focusNeed >= 0.55) {
    return finish("focus", "HIGH_LOAD_LOW_MASTERY", clamp01(0.6 + focusNeed / 4), publicSignals);
  }

  return finish("adaptive", "ADAPTIVE_DEFAULT", 0.64, publicSignals);
}

function finish(
  mode: LearningModeCode,
  reasonCode: string,
  confidence: number,
  signals: ModeRecommendation["signals"],
): ModeRecommendation {
  return {
    recommendedMode: mode,
    confidence: round2(clamp01(confidence)),
    reasonCode,
    reasonText: reasonFor(reasonCode, mode),
    isNewLearner: false,
    usedExplicitPreference: false,
    signals,
  };
}

export const adaptiveRecommendationService = {
  recommend: recommendMode,
};
