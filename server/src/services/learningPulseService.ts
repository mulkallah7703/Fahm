import { pulseStatusFromScore } from "../config/learningPulse.js";
import { masteryRepository } from "../repositories/masteryRepository.js";
import { pulseRepository } from "../repositories/pulseRepository.js";
import type { LearningPulseResult, ReviewConcept } from "../types/index.js";
import { computeOverallPulse } from "./masteryCalculationService.js";

export const learningPulseService = {
  async getPulse(studentProfileId: string): Promise<LearningPulseResult | null> {
    const mastery = await masteryRepository.listForStudent(studentProfileId);
    const computed = computeOverallPulse(mastery);

    if (computed) {
      const pulse: LearningPulseResult = {
        score: computed.score,
        status: computed.status,
        recommendedAction: recommendationForStatus(computed.status),
      };
      await persistQuietly(studentProfileId, pulse);
      return pulse;
    }

    const stored = await pulseRepository.latestOverall(studentProfileId);
    if (!stored) return null;
    return {
      ...stored,
      status: pulseStatusFromScore(stored.score),
    };
  },

  async getReviewConcepts(studentProfileId: string): Promise<ReviewConcept[]> {
    return masteryRepository.listNeedingReview(studentProfileId);
  },
};

function recommendationForStatus(status: string): string {
  if (status === "needs_significant_support") {
    return "يحتاج دعماً إضافياً قبل المتابعة";
  }
  if (status === "needs_review") {
    return "راجع المفاهيم الضعيفة قبل الدرس التالي";
  }
  if (status === "good") {
    return "مستوى جيد — يمكن المتابعة مع مراجعة قصيرة";
  }
  return "مستوى قوي — جاهز لدرس جديد";
}

async function persistQuietly(
  studentProfileId: string,
  pulse: LearningPulseResult,
): Promise<void> {
  try {
    await pulseRepository.insertOverall(studentProfileId, pulse);
  } catch {
    /* persistence is best-effort so the dashboard still renders */
  }
}
