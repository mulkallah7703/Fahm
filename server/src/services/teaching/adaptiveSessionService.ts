import { createHash } from "node:crypto";
import { INTERACTION_TYPES } from "../../config/learningModes.js";
import { ADAPTIVE_ACTIONS, ADAPTIVE_LIMITS, type AdaptiveAction } from "../../config/adaptive.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { LessonSessionDto, LessonState } from "../../types/teaching.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { analysisService } from "../analysis/analysisService.js";
import { learningInteractionService } from "../learning/learningInteractionService.js";
import { decideAdaptation } from "./adaptiveTeachingService.js";
import {
  attachAdaptiveState,
  buildInsight,
  collectEvidence,
  evidenceFingerprint,
} from "./adaptiveEvidence.js";
import { canChangeVariant, commitAdaptation, shouldUseAdaptiveExperience } from "./adaptiveExperience.js";
import { strategyFrom } from "./lessonPlanService.js";
import { containsCorruptTeaching } from "./contentQualityService.js";
import { teachingAiContext } from "./teachingContentService.js";
import { teachingAiService } from "./teachingAiService.js";
import { applyTeachingToState, composeGroundedTeaching } from "../gemini/teachingOrchestrator.js";
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

export function isAdaptiveAction(value: string): value is AdaptiveAction {
  return (ADAPTIVE_ACTIONS as readonly string[]).includes(value);
}

export const adaptiveSessionService = {
  async getExperience(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const dto = await lessonService.getSession(user, sessionId);
    if (!dto.adaptive) throw new ValidationError("هذه الجلسة ليست في الوضع التكيفي.");
    return dto;
  },

  async performAction(user: AuthUser, sessionId: string, action: string): Promise<LessonSessionDto> {
    if (!isAdaptiveAction(action)) throw new ValidationError("الإجراء غير صالح.");
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    let state = await loadState(sessionId);
    if (!state) {
      await lessonService.getSession(user, sessionId);
      state = await loadState(sessionId);
    }
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    if (!shouldUseAdaptiveExperience(state.strategy.mode)) {
      throw new ValidationError("هذه الجلسة ليست في الوضع التكيفي.");
    }
    const adaptive = attachAdaptiveState(state);
    const conceptId = state.steps[state.currentStepIndex]?.conceptId ?? null;
    let adaptationMessage: string | null = null;

    if (action === "understood") {
      if (adaptive.lastFeedback !== "understood") {
        adaptive.lastFeedback = "understood";
        await interactionRepository.insert({
          sessionId,
          studentProfileId: ctx.studentProfileId,
          interactionType: INTERACTION_TYPES.adaptationAccepted,
          conceptId,
          interactionData: { variant: state.strategy.variant },
        });
        await auditService.record({
          userId: user.userId,
          actionType: "ADAPTATION_ACCEPTED",
          entityName: "LearningSessions",
          entityId: sessionId,
          description: state.strategy.variant,
        });
      }
      const questionIndex = state.steps.findIndex((step) => step.type === "check_question");
      if (questionIndex >= 0) state.currentStepIndex = questionIndex;
      adaptationMessage = "رائع، نكمل.";
    } else if (action === "continue") {
      return lessonService.advance(user, sessionId);
    } else if (action === "test_me") {
      const questionIndex = state.steps.findIndex((step) => step.type === "check_question");
      if (questionIndex >= 0) state.currentStepIndex = questionIndex;
      await interactionRepository.insert({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        interactionType: INTERACTION_TYPES.questionPresented,
        conceptId,
        interactionData: { source: "adaptive" },
      });
    } else {
      const replayCount =
        (
          await interactionRepository.countTypes(sessionId, ctx.studentProfileId, [
            INTERACTION_TYPES.audioReplayed,
          ])
        )[INTERACTION_TYPES.audioReplayed] ?? 0;
      if (action === "not_understood" || action === "try_another") {
        if (action === "try_another" && adaptive.adaptationCount >= ADAPTIVE_LIMITS.maxVariantChanges) {
          adaptationMessage = "سنكمل بالطريقة الحالية. يمكنك طلب تلميح أو سؤال فَهْم.";
        } else {
          state.explanationRequests += 1;
          const evidence = collectEvidence(state, {
            replayCount,
            incorrectAnswers: state.consecutiveIncorrect,
            pauseSeconds: null,
          });
          const fingerprint = evidenceFingerprint(evidence);
          const decision = decideAdaptation({
            adaptiveEnabled: state.adaptiveEnabled,
            currentVariant: state.strategy.variant,
            currentDifficulty: state.difficulty,
            consecutiveCorrect: state.consecutiveCorrect,
            consecutiveIncorrect: state.consecutiveIncorrect,
            explanationRequests: state.explanationRequests,
            usedHintOnLastCorrect: false,
            replayCount,
          });
          const gate = canChangeVariant(state, fingerprint);
          if (decision.changed && gate.allowed) {
            const insight = buildInsight(evidence, decision.reasonCode, decision.nextVariant) ?? decision.explainWhy;
            commitAdaptation(state, decision, fingerprint, insight);
            state.strategy = strategyFrom(state.strategy.mode, decision.nextVariant);
            state.strategy.difficulty = decision.nextDifficulty;
            state.difficulty = decision.nextDifficulty;
            const composed = await composeGroundedTeaching({
              analysis,
              mode: state.strategy.mode,
              variant: decision.nextVariant,
              state,
              fileUrl: ctx.fileUrl,
              mimeType: ctx.mimeType,
              imageUrl: ctx.imageUrl,
              force: true,
            });
            applyTeachingToState(state, composed);
            const hash = createHash("sha256")
              .update(`${state.content.mainIdea}:${decision.nextVariant}:${state.content.teachingVersion ?? 3}`)
              .digest("hex");
            const key = `${decision.nextVariant}:${state.content.terms[0]?.name ?? "page"}:${hash.slice(0, 16)}`;
            const cached = adaptive.cached[key];
            if (cached && !containsCorruptTeaching(cached)) {
              if (decision.nextVariant === "example") state.content.example = cached;
              else if (decision.nextVariant === "simplified") state.content.simplifiedExplanation = cached;
              else state.content.mainIdea = cached;
            } else if ((state.content.qualityScore ?? 0) < 0.8) {
              const rewritten = await teachingAiService.rewrite({
                instruction:
                  decision.nextVariant === "example"
                    ? "Rewrite as one short everyday example. Keep the scientific meaning. Arabic. Use CONTEXT only."
                    : "Rewrite in shorter simpler Arabic sentences. Keep the scientific meaning. Use CONTEXT only.",
                context: teachingAiContext(analysis, state.content),
                concept: state.content.terms[0]?.name ?? null,
                mode: "adaptive",
                allowedConcepts: state.content.terms.map((item) => item.name),
                allowVisual: false,
                sourceSnippets: [state.content.coreIdea ?? state.content.mainIdea, ...state.content.keyPoints.map((item) => item.text)],
              });
              if (rewritten && !rewritten.includes("لا أجد") && !rewritten.includes("لا توجد معلومات")) {
                adaptive.cached[key] = rewritten;
                if (decision.nextVariant === "example") state.content.example = rewritten;
                else if (decision.nextVariant === "simplified") state.content.simplifiedExplanation = rewritten;
                else state.content.mainIdea = rewritten;
              }
            }
            await learningInteractionService.recordAdaptation({
              sessionId,
              studentProfileId: ctx.studentProfileId,
              conceptId,
              previousModeId: ctx.learningModeId,
              newModeId: ctx.learningModeId,
              triggerReason: `VARIANT:${decision.reasonCode}`.slice(0, 500),
              aiReasoning: decision.explainWhy,
            });
            await interactionRepository.insert({
              sessionId,
              studentProfileId: ctx.studentProfileId,
              interactionType: INTERACTION_TYPES.adaptationTriggered,
              conceptId,
              interactionData: { reason: decision.reasonCode, variant: decision.nextVariant },
            });
            await auditService.record({
              userId: user.userId,
              actionType: "ADAPTATION_TRIGGERED",
              entityName: "AdaptationEvents",
              entityId: sessionId,
              description: decision.reasonCode,
            });
            adaptationMessage = insight;
          } else {
            adaptationMessage = gate.limitReached
              ? "سنكمل بالطريقة الحالية. يمكنك طلب تلميح أو سؤال فَهْم."
              : "لا توجد إشارات كافية لتغيير الشرح الآن.";
          }
        }
      }
      adaptive.lastFeedback = "not_understood";
      await interactionRepository.insert({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        interactionType:
          action === "try_another"
            ? INTERACTION_TYPES.adaptationTryAnother
            : INTERACTION_TYPES.adaptationRejected,
        conceptId,
        interactionData: { variant: state.strategy.variant },
      });
      if (action === "not_understood") {
        await auditService.record({
          userId: user.userId,
          actionType: "ADAPTATION_REJECTED",
          entityName: "LearningSessions",
          entityId: sessionId,
          description: state.strategy.variant,
        });
      }
    }

    await persistState(sessionId, ctx.studentProfileId, state);
    const refreshed = await lessonService.getSession(user, sessionId);
    if (adaptationMessage) refreshed.adaptationMessage = adaptationMessage;
    return refreshed;
  },
};
