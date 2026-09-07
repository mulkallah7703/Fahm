import { ADAPTIVE_LIMITS } from "../../config/adaptive.js";
import { INTERACTION_TYPES } from "../../config/learningModes.js";
import type { TeachingVariant } from "../../config/teaching.js";
import { adaptationRepository } from "../../repositories/adaptationRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import type { AdaptiveExperienceDto } from "../../types/adaptive.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type { AdaptationDecision, LessonState } from "../../types/teaching.js";
import {
  attachAdaptiveState,
  buildInsight,
  collectEvidence,
  explanationText,
  hasAnyEvidence,
  historyItem,
  reasonLabel,
  reasonToAction,
  strategySteps,
  variantBlurb,
  variantLabel,
} from "./adaptiveEvidence.js";

export function shouldUseAdaptiveExperience(mode: string): boolean {
  return mode === "adaptive";
}

export function commitAdaptation(
  state: LessonState,
  decision: Pick<AdaptationDecision, "previousVariant" | "nextVariant" | "reasonCode" | "explainWhy">,
  evidenceFingerprintValue: string,
  insight: string,
): void {
  const adaptive = attachAdaptiveState(state);
  adaptive.previousExplanation = explanationText(state.content, decision.previousVariant);
  adaptive.previousVariant = decision.previousVariant;
  adaptive.lastReasonCode = decision.reasonCode;
  adaptive.lastInsight = insight;
  adaptive.lastChangedAt = new Date().toISOString();
  adaptive.adaptationCount += 1;
  adaptive.lastFeedback = null;
  adaptive.lastFingerprint = evidenceFingerprintValue;
}

export function canChangeVariant(state: LessonState, nextFingerprint: string): {
  allowed: boolean;
  limitReached: boolean;
} {
  const adaptive = attachAdaptiveState(state);
  const limitReached = adaptive.adaptationCount >= ADAPTIVE_LIMITS.maxVariantChanges;
  if (limitReached) return { allowed: false, limitReached: true };
  if (adaptive.lastFingerprint && adaptive.lastFingerprint === nextFingerprint) {
    return { allowed: false, limitReached: false };
  }
  return { allowed: true, limitReached: false };
}

export async function publicAdaptive(
  state: LessonState,
  analysis: AnalysisDto,
  sessionId: string,
  studentProfileId: string,
): Promise<AdaptiveExperienceDto | null> {
  if (!shouldUseAdaptiveExperience(state.strategy.mode)) return null;
  const adaptive = attachAdaptiveState(state);
  const counts = await interactionRepository.countTypes(sessionId, studentProfileId, [
    INTERACTION_TYPES.explanationRequested,
    INTERACTION_TYPES.exampleRequested,
    INTERACTION_TYPES.audioReplayed,
    INTERACTION_TYPES.hintRequested,
  ]);
  const [incorrectAnswers, pauseSeconds, events] = await Promise.all([
    interactionRepository.incorrectAnswerCount(sessionId, studentProfileId),
    interactionRepository.pauseSeconds(sessionId, studentProfileId),
    adaptationRepository.listForOwnedSession(sessionId, studentProfileId),
  ]);
  const evidence = collectEvidence(state, {
    replayCount: counts[INTERACTION_TYPES.audioReplayed] ?? 0,
    incorrectAnswers,
    pauseSeconds,
  });
  const reason = adaptive.lastReasonCode;
  const insight = adaptive.lastInsight ?? buildInsight(evidence, reason, state.strategy.variant);
  const visualAvailable = Boolean(state.content.visualDescription || analysis.vision);
  const history = [
    historyItem(adaptive.previousVariant, state.strategy.variant, reason),
    ...events.slice(0, 3).map((event) => ({
      reason: reasonLabel(event.triggerReason.replace("VARIANT:", "")) ?? "تفاعل الجلسة",
      fromLabel: "طريقة سابقة",
      toLabel: variantLabel(state.strategy.variant),
    })),
  ].filter((item, index, list): item is NonNullable<typeof item> => {
    if (!item) return false;
    return list.findIndex((other) => other?.reason === item.reason && other.toLabel === item.toLabel) === index;
  });
  const limitReached = adaptive.adaptationCount >= ADAPTIVE_LIMITS.maxVariantChanges;
  const canTryAnother =
    !limitReached &&
    (evidence.explanationRequests > 0 || evidence.incorrectAnswers > 0 || evidence.replayCount > 0);
  return {
    currentVariant: state.strategy.variant,
    currentLabel: variantLabel(state.strategy.variant),
    currentBlurb: variantBlurb(state.strategy.variant),
    insight: insight && (hasAnyEvidence(evidence) || reason) ? insight : null,
    emptyMessage: hasAnyEvidence(evidence) || reason ? null : "لا توجد إشارات كافية للتكيف بعد.",
    reasonLabel: reasonLabel(reason),
    actionLabel: reason ? reasonToAction(reason) : null,
    evidence,
    strategies: strategySteps(state.strategy.variant, adaptive.previousVariant, visualAvailable),
    previousExplanation: adaptive.previousExplanation,
    currentExplanation: explanationText(state.content, state.strategy.variant),
    visualAvailable,
    visualDescription: visualAvailable ? state.content.visualDescription : null,
    history,
    canTryAnother,
    limitReached,
    nextAction: state.steps.some((step) => step.type === "check_question") ? "question" : "continue",
    lastFeedback: adaptive.lastFeedback,
  };
}

export function cacheKey(variant: TeachingVariant, concept: string | null, contentHash: string): string {
  return `${variant}:${concept ?? "page"}:${contentHash.slice(0, 16)}`;
}
