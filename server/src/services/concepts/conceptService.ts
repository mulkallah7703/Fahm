import { extractLocalConcepts, inferGrade, inferSubject, sanitizeConcepts } from "./localConcepts.js";
import { aiService } from "../ai/aiService.js";
import { logger } from "../../utils/logger.js";
import type { ConceptPayload } from "../vision/visionSchema.js";

export const conceptService = {
  async extract(input: {
    ocrText: string;
    visionSummary?: string;
  }): Promise<ConceptPayload> {
    if (aiService.isEnabled() && input.ocrText.trim()) {
      try {
        return sanitizeConcepts(await aiService.extractConcepts(input));
      } catch {
        logger.warn("concept_ai_fallback", { category: "CONCEPTS" });
      }
    }
    const local = extractLocalConcepts(input.ocrText);
    if (!local.gradeLevel) {
      local.gradeLevel = inferGrade(input.ocrText);
      local.gradeConfidence = local.gradeLevel ? 0.7 : 0;
    }
    if (!local.subject) local.subject = inferSubject(input.ocrText);
    return sanitizeConcepts(local);
  },
};
