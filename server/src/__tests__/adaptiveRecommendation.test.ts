import { describe, expect, it } from "vitest";
import { recommendMode } from "../services/learning/adaptiveRecommendationService.js";
import type { AccessibilitySignals, PublicComplexity } from "../types/learning.js";

const emptyAccess: AccessibilitySignals = {
  visualSupport: false,
  audioSupport: false,
  simplifiedLanguage: false,
  focusSupport: false,
  dyslexiaSupport: false,
  blindSupport: false,
  fontSize: null,
  lineSpacing: null,
  speechRate: null,
  preferredVoice: null,
};

const lowComplexity: PublicComplexity = {
  score: 0.2,
  level: "low",
  signals: {
    conceptCount: 2,
    relationshipCount: 1,
    wordCount: 40,
    hasDiagram: false,
    hasTable: false,
    sectionCount: 1,
    analysisReady: true,
  },
};

const highComplexity: PublicComplexity = {
  score: 0.78,
  level: "high",
  signals: {
    conceptCount: 7,
    relationshipCount: 6,
    wordCount: 380,
    hasDiagram: true,
    hasTable: false,
    sectionCount: 5,
    analysisReady: true,
  },
};

function base() {
  return {
    accessibility: emptyAccess,
    defaultLearningMode: "adaptive",
    complexity: lowComplexity,
    recentMastery: null as number | null,
    recentErrorRate: null as number | null,
    explanationNeed: null as number | null,
    pulseScore: null as number | null,
    reviewConceptCount: 0,
    effectiveness: [] as { mode: "focus" | "blind" | "dyslexia" | "adaptive"; score: number; sampleSize: number }[],
  };
}

describe("recommendMode", () => {
  it("recommends adaptive for a new student", () => {
    const result = recommendMode(base());
    expect(result.recommendedMode).toBe("adaptive");
    expect(result.isNewLearner).toBe(true);
    expect(result.reasonCode).toBe("NEW_LEARNER");
    expect(result.reasonText).toContain("نتعرف");
  });

  it("respects explicit blind support over performance", () => {
    const result = recommendMode({
      ...base(),
      accessibility: { ...emptyAccess, blindSupport: true },
      recentMastery: 0.9,
      complexity: highComplexity,
    });
    expect(result.recommendedMode).toBe("blind");
    expect(result.usedExplicitPreference).toBe(true);
    expect(result.reasonText).not.toMatch(/إعاقة|تشخيص|مصاب/);
  });

  it("respects dyslexia and simplified-language preferences", () => {
    const dyslexia = recommendMode({
      ...base(),
      accessibility: { ...emptyAccess, dyslexiaSupport: true },
    });
    expect(dyslexia.recommendedMode).toBe("dyslexia");

    const simplified = recommendMode({
      ...base(),
      accessibility: { ...emptyAccess, simplifiedLanguage: true },
    });
    expect(simplified.recommendedMode).toBe("dyslexia");
  });

  it("respects explicit focus support", () => {
    const result = recommendMode({
      ...base(),
      accessibility: { ...emptyAccess, focusSupport: true },
    });
    expect(result.recommendedMode).toBe("focus");
  });

  it("recommends focus when mastery is low and content is complex", () => {
    const result = recommendMode({
      ...base(),
      recentMastery: 0.35,
      recentErrorRate: 0.4,
      complexity: highComplexity,
      reviewConceptCount: 2,
    });
    expect(result.recommendedMode).toBe("focus");
    expect(result.reasonCode).toBe("HIGH_LOAD_LOW_MASTERY");
  });

  it("recommends focus when error rate is high on complex content", () => {
    const result = recommendMode({
      ...base(),
      recentMastery: 0.7,
      recentErrorRate: 0.62,
      complexity: highComplexity,
      reviewConceptCount: 1,
    });
    expect(result.recommendedMode).toBe("focus");
    expect(result.reasonCode).toBe("HIGH_ERROR_COMPLEX_CONTENT");
  });

  it("recommends adaptive when mastery is high and content is simple", () => {
    const result = recommendMode({
      ...base(),
      recentMastery: 0.86,
      recentErrorRate: 0.1,
      pulseScore: 0.82,
      reviewConceptCount: 0,
    });
    expect(result.recommendedMode).toBe("adaptive");
  });

  it("uses recent mode effectiveness when one mode clearly leads", () => {
    const result = recommendMode({
      ...base(),
      recentMastery: 0.6,
      reviewConceptCount: 1,
      effectiveness: [
        { mode: "focus", score: 0.82, sampleSize: 6 },
        { mode: "adaptive", score: 0.5, sampleSize: 4 },
      ],
    });
    expect(result.recommendedMode).toBe("focus");
    expect(result.reasonCode).toBe("RECENT_MODE_EFFECTIVENESS");
    expect(result.reasonText).toContain("أفضل");
  });

  it("uses profile default when no accessibility flag is set", () => {
    const result = recommendMode({
      ...base(),
      defaultLearningMode: "focus",
    });
    expect(result.recommendedMode).toBe("focus");
    expect(result.reasonCode).toBe("PROFILE_DEFAULT");
  });

  it("does not diagnose the student", () => {
    const result = recommendMode({
      ...base(),
      accessibility: { ...emptyAccess, dyslexiaSupport: true },
    });
    expect(result.reasonText).not.toMatch(/ADHD|يعالج|تشخيص|مصاب/);
  });
});
