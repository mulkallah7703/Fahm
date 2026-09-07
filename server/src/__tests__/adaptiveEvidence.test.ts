import { describe, expect, it } from "vitest";
import { ADAPTIVE_LIMITS } from "../config/adaptive.js";
import { isAdaptiveAction } from "../services/teaching/adaptiveSessionService.js";
import {
  buildInsight,
  collectEvidence,
  evidenceFingerprint,
  hasAnyEvidence,
  reasonLabel,
} from "../services/teaching/adaptiveEvidence.js";
import { canChangeVariant } from "../services/teaching/adaptiveExperience.js";
import { shouldUseAdaptiveExperience } from "../services/teaching/adaptiveExperience.js";
import type { LessonState } from "../types/teaching.js";

function state(partial: Partial<LessonState> = {}): LessonState {
  return {
    version: 1,
    currentStepIndex: 0,
    difficulty: "medium",
    strategy: {
      mode: "adaptive",
      variant: "standard",
      explanationStyle: "direct",
      explanationLength: "medium",
      chunkSize: 2,
      questionFrequency: "medium",
      interactionType: "teaching",
      difficulty: "medium",
      visualSupport: true,
      audioSupport: false,
    },
    adaptiveEnabled: true,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    hintsUsed: 0,
    explanationRequests: 0,
    examplesRequested: 0,
    lastHintQuestionId: null,
    completed: false,
    content: {
      title: "درس",
      mainIdea: "شرح من الصفحة.",
      keyPoints: [],
      terms: [],
      visualDescription: null,
      example: null,
      simplifiedExplanation: null,
      speechText: "",
    },
    steps: [],
    ...partial,
  };
}

describe("adaptive evidence", () => {
  it("hides empty evidence instead of inventing metrics", () => {
    const evidence = collectEvidence(state(), {
      replayCount: 0,
      incorrectAnswers: 0,
      pauseSeconds: null,
    });
    expect(hasAnyEvidence(evidence)).toBe(false);
    expect(evidence.pauseSeconds).toBeNull();
    expect(buildInsight(evidence, null)).toBeNull();
  });

  it("names only signals that actually happened", () => {
    const evidence = collectEvidence(state({ explanationRequests: 2, consecutiveIncorrect: 1 }), {
      replayCount: 0,
      incorrectAnswers: 1,
      pauseSeconds: null,
    });
    const insight = buildInsight(evidence, "EXPLANATION_REQUESTS") ?? "";
    expect(insight).toContain("إعادة الشرح");
    expect(insight).toContain("إجابة غير دقيقة");
    expect(insight).not.toContain("عسر");
    expect(insight).not.toContain("اضطراب");
    expect(reasonLabel("EXPLANATION_REQUESTS")).toBe("طلبات إعادة الشرح");
  });

  it("does not treat a single pause as enough evidence", () => {
    const evidence = collectEvidence(state(), {
      replayCount: 0,
      incorrectAnswers: 0,
      pauseSeconds: 40,
    });
    expect(hasAnyEvidence(evidence)).toBe(false);
    expect(buildInsight(evidence, null)).toBeNull();
  });

  it("blocks a second adaptation when evidence has not changed", () => {
    const lesson = state({
      adaptive: {
        previousExplanation: "سابق",
        previousVariant: "standard",
        lastReasonCode: "EXPLANATION_REQUESTS",
        lastInsight: "لاحظ فَهْم",
        lastChangedAt: new Date().toISOString(),
        adaptationCount: 1,
        lastFeedback: null,
        lastFingerprint: "2:1:0:0:0",
        cached: {},
      },
    });
    expect(canChangeVariant(lesson, "2:1:0:0:0").allowed).toBe(false);
    expect(canChangeVariant(lesson, "3:1:0:0:0").allowed).toBe(true);
  });

  it("stops after the per-session strategy-change limit", () => {
    const lesson = state({
      adaptive: {
        previousExplanation: null,
        previousVariant: null,
        lastReasonCode: null,
        lastInsight: null,
        lastChangedAt: null,
        adaptationCount: ADAPTIVE_LIMITS.maxVariantChanges,
        lastFeedback: null,
        lastFingerprint: null,
        cached: {},
      },
    });
    expect(canChangeVariant(lesson, "9:9:9:9:9").limitReached).toBe(true);
  });

  it("keeps accessibility mode out of the adaptive experience", () => {
    expect(shouldUseAdaptiveExperience("adaptive")).toBe(true);
    expect(shouldUseAdaptiveExperience("dyslexia")).toBe(false);
    expect(shouldUseAdaptiveExperience("blind")).toBe(false);
    expect(shouldUseAdaptiveExperience("focus")).toBe(false);
    expect(isAdaptiveAction("understood")).toBe(true);
    expect(isAdaptiveAction("diagnose")).toBe(false);
  });

  it("fingerprints evidence without exposing scores", () => {
    const first = collectEvidence(state({ explanationRequests: 2 }), {
      replayCount: 0,
      incorrectAnswers: 0,
      pauseSeconds: null,
    });
    const second = collectEvidence(state({ explanationRequests: 3 }), {
      replayCount: 0,
      incorrectAnswers: 0,
      pauseSeconds: null,
    });
    expect(evidenceFingerprint(first)).not.toBe(evidenceFingerprint(second));
  });
});
