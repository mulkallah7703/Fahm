import type {
  ContinueLearning,
  Recommendation,
  ReviewConcept,
} from "../types/index.js";

export const recommendationService = {
  build(input: {
    reviewConcepts: ReviewConcept[];
    continueLearning: ContinueLearning | null;
  }): Recommendation | null {
    const weakest = input.reviewConcepts[0];
    if (weakest) {
      return {
        text: `اقتراح فَهْم: خمس دقائق مراجعة لـ«${weakest.name}» قبل الدرس التالي.`,
        action: "review",
        conceptId: weakest.conceptId,
      };
    }

    if (input.continueLearning) {
      return {
        text: `اقتراح فَهْم: أكمل درس «${input.continueLearning.title}» من حيث توقفت.`,
        action: "continue",
        sessionId: input.continueLearning.sessionId,
        materialId: input.continueLearning.materialId ?? undefined,
      };
    }

    return {
      text: "اقتراح فَهْم: ارفع صفحة من كتابك لنبدأ رحلة التعلم معًا.",
      action: "upload",
    };
  },
};
