import { INTERACTION_TYPES } from "../../config/learningModes.js";
import { adaptationRepository } from "../../repositories/adaptationRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";

export const learningInteractionService = {
  async recordModeInteraction(input: {
    sessionId: string;
    studentProfileId: string;
    type: string;
    conceptId?: string | null;
    data?: Record<string, unknown> | null;
    durationSeconds?: number | null;
  }): Promise<void> {
    const owned = await sessionRepository.belongsToStudent(
      input.sessionId,
      input.studentProfileId,
    );
    if (!owned) {
      throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    }
    const type = input.type.trim();
    if (!type) {
      throw new ValidationError("نوع التفاعل غير صالح.");
    }
    await interactionRepository.insert({
      sessionId: input.sessionId,
      studentProfileId: input.studentProfileId,
      interactionType: type,
      conceptId: input.conceptId ?? null,
      interactionData: input.data ?? null,
      durationSeconds: input.durationSeconds ?? null,
    });
  },

  async recordAdaptation(input: {
    sessionId: string;
    studentProfileId: string;
    conceptId?: string | null;
    previousModeId?: number | null;
    newModeId?: number | null;
    triggerReason: string;
    aiReasoning?: string | null;
  }): Promise<void> {
    const owned = await sessionRepository.belongsToStudent(
      input.sessionId,
      input.studentProfileId,
    );
    if (!owned) {
      throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    }
    if (input.previousModeId === input.newModeId && !input.triggerReason.includes("VARIANT")) {
      return;
    }
    await adaptationRepository.insert({
      sessionId: input.sessionId,
      studentProfileId: input.studentProfileId,
      conceptId: input.conceptId ?? null,
      previousModeId: input.previousModeId ?? null,
      newModeId: input.newModeId ?? null,
      triggerReason: input.triggerReason.slice(0, 500),
      aiReasoning: input.aiReasoning ?? null,
    });
  },

  selectionPayload(modeCode: string, adaptiveEnabled: boolean) {
    return {
      type: INTERACTION_TYPES.modeSelection,
      data: { modeCode, adaptiveEnabled },
    };
  },
};
