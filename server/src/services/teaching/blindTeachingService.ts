import { INTERACTION_TYPES } from "../../config/learningModes.js";
import {
  BLIND_MESSAGES,
  isBlindAction,
  isBlindSpeed,
  type BlindAction,
} from "../../config/blind.js";
import { accessibilityRepository } from "../../repositories/accessibilityRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { TtsResult } from "../../types/blind.js";
import type { LessonSessionDto, LessonState } from "../../types/teaching.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { analysisService } from "../analysis/analysisService.js";
import { learningInteractionService } from "../learning/learningInteractionService.js";
import { ttsService } from "../audio/ttsService.js";
import { decideAdaptation } from "./adaptiveTeachingService.js";
import {
  applyQuestionText,
  attachBlindState,
  findParagraphIndex,
  findSegmentIndex,
  shouldUseBlindExperience,
} from "./blindNarrativeService.js";
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

export const blindTeachingService = {
  async getExperience(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const dto = await lessonService.getSession(user, sessionId);
    if (!dto.blind) {
      throw new ValidationError("هذه الجلسة ليست في وضع القراءة الصوتية.");
    }
    return dto;
  },

  async performAction(
    user: AuthUser,
    sessionId: string,
    action: string,
    payload?: { paragraphIndex?: number; speed?: number; segmentId?: string },
  ): Promise<LessonSessionDto> {
    if (!isBlindAction(action)) {
      throw new ValidationError("الإجراء غير مدعوم.");
    }
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    let state = await loadState(sessionId);
    if (!state) {
      await lessonService.getSession(user, sessionId);
      state = await loadState(sessionId);
    }
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    if (!shouldUseBlindExperience(state.strategy.mode, state.strategy.variant)) {
      throw new ValidationError("هذه الجلسة ليست في وضع القراءة الصوتية.");
    }

    const prefs = await accessibilityRepository.findForStudent(ctx.studentProfileId);
    attachBlindState(state, analysis, null, prefs?.speechRate ?? undefined);
    const blind = state.blind!;
    let interactionType: string | null = null;
    let adaptationMessage: string | null = null;

    switch (action as BlindAction) {
      case "read_page":
        blind.currentSegmentIndex = 0;
        blind.detailOpen = false;
        blind.lastActionMessage = "سأقرأ الصفحة بالترتيب التعليمي.";
        interactionType = INTERACTION_TYPES.audioStarted;
        break;
      case "describe_diagram": {
        const index = findSegmentIndex(blind, "visual_description");
        if (index < 0) {
          blind.lastActionMessage = BLIND_MESSAGES.noDiagram;
        } else {
          blind.currentSegmentIndex = index;
          blind.lastActionMessage = "أنت الآن تستمع إلى وصف الرسم.";
        }
        interactionType = INTERACTION_TYPES.visualDescriptionRequested;
        break;
      }
      case "describe_table": {
        const index = findSegmentIndex(blind, "table_description");
        if (index < 0) {
          blind.lastActionMessage = BLIND_MESSAGES.noTable;
        } else {
          blind.currentSegmentIndex = index;
          blind.lastActionMessage = "أنت الآن تستمع إلى وصف الجدول.";
        }
        interactionType = INTERACTION_TYPES.visualDescriptionRequested;
        break;
      }
      case "read_paragraph": {
        const wanted = payload?.paragraphIndex ?? 2;
        const index = findParagraphIndex(blind, wanted);
        if (index < 0) {
          blind.lastActionMessage = BLIND_MESSAGES.noParagraph;
        } else {
          blind.currentSegmentIndex = index;
          blind.lastActionMessage = `أنت الآن تستمع إلى الفقرة ${wanted}.`;
        }
        interactionType = INTERACTION_TYPES.explanationViewed;
        break;
      }
      case "more_detail": {
        const current = blind.segments[blind.currentSegmentIndex];
        if (!current?.detailedText) {
          blind.lastActionMessage =
            current?.type === "visual_description" || current?.type === "table_description"
              ? BLIND_MESSAGES.noVisualDetail
              : "لا يتوفر وصف أكثر تفصيلًا لهذا الجزء.";
        } else {
          blind.detailOpen = true;
          blind.lastActionMessage = "إليك وصفًا أكثر تفصيلًا.";
          state.explanationRequests += 1;
        }
        interactionType = INTERACTION_TYPES.detailRequested;
        if (state.explanationRequests >= 2 && state.strategy.variant !== "simplified") {
          const decision = decideAdaptation({
            adaptiveEnabled: state.adaptiveEnabled,
            currentVariant: state.strategy.variant,
            currentDifficulty: state.difficulty,
            consecutiveCorrect: state.consecutiveCorrect,
            consecutiveIncorrect: state.consecutiveIncorrect,
            explanationRequests: state.explanationRequests,
            usedHintOnLastCorrect: false,
          });
          if (decision.changed) {
            state.strategy.variant = decision.nextVariant;
            state.strategy.difficulty = decision.nextDifficulty;
            state.difficulty = decision.nextDifficulty;
            adaptationMessage = decision.studentMessage;
            await learningInteractionService.recordAdaptation({
              sessionId,
              studentProfileId: ctx.studentProfileId,
              conceptId: current?.sourceConceptIds[0] ?? null,
              previousModeId: ctx.learningModeId,
              newModeId: ctx.learningModeId,
              triggerReason: `VARIANT:${decision.reasonCode}`.slice(0, 500),
              aiReasoning: decision.explainWhy,
            });
          }
        }
        break;
      }
      case "next_segment":
        if (blind.currentSegmentIndex < blind.segments.length - 1) {
          blind.currentSegmentIndex += 1;
          blind.detailOpen = false;
          const next = blind.segments[blind.currentSegmentIndex];
          blind.lastActionMessage = next ? `انتقلنا إلى ${next.title}.` : null;
        } else {
          blind.lastActionMessage = "هذه آخر عناصر الصفحة.";
        }
        interactionType = INTERACTION_TYPES.explanationViewed;
        break;
      case "previous_segment":
        if (blind.currentSegmentIndex > 0) {
          blind.currentSegmentIndex -= 1;
          blind.detailOpen = false;
          const prev = blind.segments[blind.currentSegmentIndex];
          blind.lastActionMessage = prev ? `انتقلنا إلى ${prev.title}.` : null;
        } else {
          blind.lastActionMessage = "هذا أول عناصر الصفحة.";
        }
        break;
      case "replay":
        blind.replayCount += 1;
        blind.lastActionMessage = "سأعيد قراءة هذا الجزء.";
        interactionType = INTERACTION_TYPES.audioReplayed;
        break;
      case "test_me": {
        const questionIndex = findSegmentIndex(blind, "question");
        const stepIndex = state.steps.findIndex((step) => step.type === "check_question");
        if (stepIndex >= 0) state.currentStepIndex = stepIndex;
        if (questionIndex >= 0) blind.currentSegmentIndex = questionIndex;
        blind.lastActionMessage = "سؤال للتحقق من فهمك.";
        interactionType = INTERACTION_TYPES.questionPresented;
        break;
      }
      case "set_speed": {
        const speed = payload?.speed;
        if (speed === undefined || !isBlindSpeed(speed)) {
          throw new ValidationError("سرعة القراءة غير مدعومة.");
        }
        blind.speechRate = speed;
        blind.lastActionMessage = `تم ضبط سرعة القراءة على ${speed}.`;
        await accessibilityRepository.updateSpeechPrefs(ctx.studentProfileId, { speechRate: speed });
        interactionType = INTERACTION_TYPES.audioSpeedChanged;
        break;
      }
      case "audio_started":
        interactionType = INTERACTION_TYPES.audioStarted;
        blind.lastActionMessage = BLIND_MESSAGES.audioStarted;
        break;
      case "audio_paused":
        interactionType = INTERACTION_TYPES.audioPaused;
        blind.lastActionMessage = BLIND_MESSAGES.audioPaused;
        break;
      case "mark_listened": {
        const id = payload?.segmentId ?? blind.segments[blind.currentSegmentIndex]?.id;
        if (id && !blind.listenedIds.includes(id)) blind.listenedIds.push(id);
        interactionType = INTERACTION_TYPES.audioCompleted;
        break;
      }
      case "where_am_i": {
        const current = blind.segments[blind.currentSegmentIndex];
        const concept = state.content.terms[0]?.name ?? state.content.title;
        blind.lastActionMessage = current
          ? `أنت الآن في «${current.title}». تتعلم «${concept}». العنصر ${blind.currentSegmentIndex + 1} من ${blind.segments.length}.`
          : `تتعلم «${concept}» من هذه الصفحة.`;
        interactionType = INTERACTION_TYPES.explanationViewed;
        break;
      }
      case "what_now": {
        const current = blind.segments[blind.currentSegmentIndex];
        blind.lastActionMessage = current
          ? `ماذا تتعلم الآن: ${current.title}. ${current.text}`
          : "لم يُحدد مقطع بعد.";
        interactionType = INTERACTION_TYPES.explanationViewed;
        break;
      }
      case "key_point": {
        blind.lastActionMessage = `أهم نقطة: ${state.content.mainIdea}`;
        interactionType = INTERACTION_TYPES.explanationViewed;
        break;
      }
      default:
        throw new ValidationError("الإجراء غير مدعوم.");
    }

    blind.lastAction = action as BlindAction;
    state.blind = blind;
    syncLessonStep(state);
    await persistState(sessionId, ctx.studentProfileId, state);

    if (interactionType) {
      await interactionRepository.insert({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        interactionType,
        conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
        interactionData: { action, segmentId: blind.segments[blind.currentSegmentIndex]?.id ?? null },
      });
    }

    if (action === "read_page") {
      await auditService.record({
        userId: user.userId,
        actionType: "BLIND_MODE_STARTED",
        entityName: "LearningSessions",
        entityId: sessionId,
        description: "read_page",
      });
    }
    if (action === "describe_diagram" || action === "more_detail") {
      await auditService.record({
        userId: user.userId,
        actionType: "VISUAL_DESCRIPTION_REQUESTED",
        entityName: "LearningSessions",
        entityId: sessionId,
        description: action,
      });
    }

    const refreshed = await lessonService.getSession(user, sessionId);
    if (adaptationMessage) refreshed.adaptationMessage = adaptationMessage;
    if (refreshed.blind) {
      refreshed.blind.lastActionMessage = blind.lastActionMessage;
      refreshed.blind.detailOpen = blind.detailOpen;
    }
    if (refreshed.question && refreshed.blind) {
      const withQuestion = applyQuestionText(blind.segments, refreshed.question);
      const qIndex = withQuestion.findIndex((item) => item.type === "question");
      if (qIndex >= 0 && refreshed.blind.segments[qIndex]) {
        refreshed.blind.segments[qIndex] = {
          ...refreshed.blind.segments[qIndex],
          text: withQuestion[qIndex]!.text,
          available: true,
        };
        if (refreshed.blind.currentSegment?.type === "question") {
          refreshed.blind.currentSegment = {
            ...refreshed.blind.currentSegment,
            text: withQuestion[qIndex]!.text,
            available: true,
          };
        }
      }
    }
    return refreshed;
  },

  async generateSegmentAudio(
    user: AuthUser,
    sessionId: string,
    segmentId: string,
  ): Promise<TtsResult & { segmentId: string }> {
    const ctx = await loadOwned(user, sessionId);
    const state = await loadState(sessionId);
    const segment = state?.blind?.segments.find((item) => item.id === segmentId);
    if (!segment) throw new NotFoundError("لم يتم العثور على مقطع القراءة.");
    const text = state?.blind?.detailOpen && segment.detailedText ? segment.detailedText : segment.text;
    const result = await ttsService.generate({
      text,
      studentProfileId: ctx.studentProfileId,
      sessionId,
    });
    await interactionRepository.insert({
      sessionId,
      studentProfileId: ctx.studentProfileId,
      interactionType: INTERACTION_TYPES.audioStarted,
      conceptId: segment.sourceConceptIds[0] ?? null,
      interactionData: { action: "tts", provider: result.provider, fallback: result.fallback },
    });
    if (result.audioId) {
      await auditService.record({
        userId: user.userId,
        actionType: "AUDIO_GENERATED",
        entityName: "AudioGenerations",
        entityId: result.audioId,
        description: result.provider,
      });
    }
    return { ...result, segmentId };
  },
};

function syncLessonStep(state: LessonState): void {
  const current = state.blind?.segments[state.blind.currentSegmentIndex];
  if (!current) return;
  const map: Record<string, string> = {
    main_idea: "main_idea",
    key_points: "key_points",
    terms: "terms",
    visual_description: "visual",
    question: "check_question",
  };
  const stepType = map[current.type];
  if (!stepType) return;
  const index = state.steps.findIndex((step) => step.type === stepType);
  if (index >= 0) state.currentStepIndex = index;
}
