import { INTERACTION_TYPES } from "../../config/learningModes.js";
import { ASSESSMENT_ACTIONS, type AssessmentAction } from "../../config/assessment.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { masteryRepository } from "../../repositories/masteryRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { LessonSessionDto, LessonState } from "../../types/teaching.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { analysisService } from "../analysis/analysisService.js";
import { ensureAssessmentPlan } from "./assessmentExperience.js";
import { lessonService } from "./lessonService.js";

function requireStudent(user: AuthUser): string {
  if (!user.studentProfileId) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return user.studentProfileId;
}

async function loadOwned(user: AuthUser, sessionId: string) {
  const ctx = await sessionRepository.findOwnedLesson(sessionId, requireStudent(user));
  if (!ctx) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return ctx;
}

async function loadState(sessionId: string): Promise<LessonState | null> {
  const row = await interactionRepository.latestByType(sessionId, INTERACTION_TYPES.lessonState);
  if (!row?.interactionData) return null;
  return row.interactionData as unknown as LessonState;
}

async function persistState(sessionId: string, studentProfileId: string, state: LessonState): Promise<void> {
  await interactionRepository.insert({
    sessionId,
    studentProfileId,
    interactionType: INTERACTION_TYPES.lessonState,
    conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
    interactionData: state as unknown as Record<string, unknown>,
  });
}

export function isAssessmentAction(value: string): value is AssessmentAction {
  return (ASSESSMENT_ACTIONS as readonly string[]).includes(value);
}

export const assessmentSessionService = {
  async getExperience(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const dto = await lessonService.getSession(user, sessionId);
    if (!dto.assessment) throw new ValidationError("تعذر إعداد اختبار الفهم. يمكنك متابعة الدرس.");
    return dto;
  },

  async performAction(user: AuthUser, sessionId: string, action: string): Promise<LessonSessionDto> {
    if (!isAssessmentAction(action)) throw new ValidationError("الإجراء غير صالح.");
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    let state = await loadState(sessionId);
    if (!state) {
      await lessonService.getSession(user, sessionId);
      state = await loadState(sessionId);
    }
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    const mastery = await masteryRepository.listForStudent(ctx.studentProfileId);
    const planned = await ensureAssessmentPlan(sessionId, state, analysis, mastery);
    if (!state.assessment) throw new ValidationError("لا توجد معلومات كافية لإعداد اختبار فهم لهذه الصفحة.");

    if (action === "start") {
      const questionIndex = state.steps.findIndex((step) => step.type === "check_question");
      if (questionIndex >= 0) state.currentStepIndex = questionIndex;
      const alreadyActive = state.assessment.active;
      state.assessment.active = true;
      if (!state.assessment.itemIds.length) {
        throw new ValidationError("لا توجد معلومات كافية لإعداد اختبار فهم لهذه الصفحة.");
      }
      if (!alreadyActive) {
        await auditService.record({
          userId: user.userId,
          actionType: "ASSESSMENT_STARTED",
          entityName: "LearningSessions",
          entityId: sessionId,
          description: String(state.assessment.itemIds.length),
        });
      }
    } else if (action === "next") {
      if (state.assessment.currentIndex < state.assessment.itemIds.length - 1) {
        state.assessment.currentIndex += 1;
      }
    } else if (action === "previous") {
      if (state.assessment.currentIndex > 0) state.assessment.currentIndex -= 1;
    } else if (action === "complete") {
      const alreadyDone = state.assessment.completed;
      state.assessment.completed = true;
      state.assessment.active = true;
      if (!alreadyDone) {
        await auditService.record({
          userId: user.userId,
          actionType: "ASSESSMENT_COMPLETED",
          entityName: "LearningSessions",
          entityId: sessionId,
          description: "assessment",
        });
      }
    } else if (action === "review") {
      state.assessment.active = false;
      state.currentStepIndex = 0;
      await auditService.record({
        userId: user.userId,
        actionType: "CONCEPT_REVIEW_RECOMMENDED",
        entityName: "LearningSessions",
        entityId: sessionId,
        description: "review",
      });
    }

    if (planned.created || action) await persistState(sessionId, ctx.studentProfileId, state);
    return lessonService.getSession(user, sessionId);
  },
};
