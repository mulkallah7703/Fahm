import { INTERACTION_TYPES } from "../../config/learningModes.js";
import {
  FONT_SIZE_PX,
  NOTE_MAX_LENGTH,
  WORD_MAX_LENGTH,
  isDyslexiaAction,
  type DyslexiaAction,
  type DyslexiaFontSize,
  type DyslexiaLineSpacing,
} from "../../config/dyslexia.js";
import { accessibilityRepository } from "../../repositories/accessibilityRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { DyslexiaWordExplain } from "../../types/dyslexia.js";
import type { LessonSessionDto, LessonState } from "../../types/teaching.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { analysisService } from "../analysis/analysisService.js";
import { learningInteractionService } from "../learning/learningInteractionService.js";
import { decideAdaptation } from "./adaptiveTeachingService.js";
import {
  applyPrefs,
  attachDyslexiaState,
  findConceptByWord,
  shouldUseDyslexiaExperience,
} from "./dyslexiaReadingService.js";
import { teachingAiService } from "./teachingAiService.js";
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

export const dyslexiaTeachingService = {
  async getExperience(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const dto = await lessonService.getSession(user, sessionId);
    if (!dto.dyslexia) throw new ValidationError("هذه الجلسة ليست في وضع القراءة الميسّرة.");
    return dto;
  },

  async performAction(
    user: AuthUser,
    sessionId: string,
    action: string,
    payload?: {
      word?: string;
      segmentId?: string;
      note?: string;
      fontSize?: DyslexiaFontSize;
      lineSpacing?: DyslexiaLineSpacing;
      speechRate?: number;
      highlightCurrent?: boolean;
      autoRead?: boolean;
      wordClickEnabled?: boolean;
    },
  ): Promise<LessonSessionDto> {
    if (!isDyslexiaAction(action)) throw new ValidationError("الإجراء غير مدعوم.");
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    let state = await loadState(sessionId);
    if (!state) {
      await lessonService.getSession(user, sessionId);
      state = await loadState(sessionId);
    }
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    if (!shouldUseDyslexiaExperience(state.strategy.mode)) {
      throw new ValidationError("هذه الجلسة ليست في وضع القراءة الميسّرة.");
    }
    const prefs = await accessibilityRepository.findForStudent(ctx.studentProfileId);
    attachDyslexiaState(state, analysis, prefs ?? undefined);
    const dyslexia = state.dyslexia!;
    let interactionType: string | null = null;
    let adaptationMessage: string | null = null;
    let wordExplain: DyslexiaWordExplain | null = null;

    switch (action as DyslexiaAction) {
      case "next_segment":
        if (dyslexia.currentSegmentIndex >= dyslexia.segments.length - 1) {
          dyslexia.lastActionMessage = "هذا آخر مقطع.";
        } else {
          dyslexia.currentSegmentIndex += 1;
          dyslexia.lastActionMessage = `انتقلت إلى المقطع ${dyslexia.currentSegmentIndex + 1}.`;
          interactionType = INTERACTION_TYPES.segmentViewed;
        }
        break;
      case "previous_segment":
        if (dyslexia.currentSegmentIndex <= 0) {
          dyslexia.lastActionMessage = "هذا أول مقطع.";
        } else {
          dyslexia.currentSegmentIndex -= 1;
          dyslexia.lastActionMessage = `انتقلت إلى المقطع ${dyslexia.currentSegmentIndex + 1}.`;
          interactionType = INTERACTION_TYPES.segmentViewed;
        }
        break;
      case "set_prefs":
        applyPrefs(dyslexia, payload ?? {});
        if (payload?.fontSize || payload?.lineSpacing) {
          await accessibilityRepository.updateReadingPrefs(ctx.studentProfileId, {
            fontSize: payload.fontSize ? FONT_SIZE_PX[payload.fontSize] : undefined,
            lineSpacing: payload.lineSpacing,
          });
        }
        if (payload?.speechRate) {
          await accessibilityRepository.updateSpeechPrefs(ctx.studentProfileId, {
            speechRate: payload.speechRate,
          });
        }
        dyslexia.lastActionMessage = "تم حفظ إعدادات القراءة.";
        break;
      case "reset_prefs":
        applyPrefs(dyslexia, {
          fontSize: "medium",
          lineSpacing: 2.1,
          highlightCurrent: true,
          autoRead: false,
          wordClickEnabled: true,
        });
        await accessibilityRepository.updateReadingPrefs(ctx.studentProfileId, {
          fontSize: FONT_SIZE_PX.medium,
          lineSpacing: 2.1,
        });
        dyslexia.lastActionMessage = "أُعيدت إعدادات العرض.";
        break;
      case "focus_segment": {
        const index = dyslexia.segments.findIndex((item) => item.id === payload?.segmentId);
        if (index < 0) throw new ValidationError("المقطع غير صالح.");
        dyslexia.currentSegmentIndex = index;
        dyslexia.lastActionMessage = `انتقلت إلى المقطع ${index + 1}.`;
        interactionType = INTERACTION_TYPES.segmentViewed;
        break;
      }
      case "explain_word": {
        const word = (payload?.word ?? "").trim();
        if (!word || word.length > WORD_MAX_LENGTH) throw new ValidationError("الكلمة غير صالحة.");
        if (payload?.segmentId) {
          const jump = dyslexia.segments.findIndex((item) => item.id === payload.segmentId);
          if (jump >= 0) dyslexia.currentSegmentIndex = jump;
        }
        const segment = dyslexia.segments.find((item) => item.id === payload?.segmentId)
          ?? dyslexia.segments[dyslexia.currentSegmentIndex];
        const cached = dyslexia.explanations[word];
        if (cached) {
          wordExplain = cached;
          dyslexia.lastActionMessage = wordExplain.known ? "تم شرح الكلمة." : wordExplain.simpleExplanation;
          break;
        }
        wordExplain = await explainWord(
          word,
          segment?.text ?? "",
          JSON.stringify({
            term: word,
            sentence: segment?.text ?? "",
            definitions: state.content.terms.map((item) => `${item.name}: ${item.definition}`),
          }),
          state.content.terms,
        );
        dyslexia.explanations[word] = wordExplain;
        dyslexia.lastActionMessage = wordExplain.known ? "تم شرح الكلمة." : wordExplain.simpleExplanation;
        interactionType = INTERACTION_TYPES.wordExplanationRequested;
        await auditService.record({
          userId: user.userId,
          actionType: "WORD_EXPLANATION_REQUESTED",
          entityName: "LearningSessions",
          entityId: sessionId,
          description: "word",
        });
        break;
      }
      case "simplify_word": {
        const word = (payload?.word ?? state.content.terms[0]?.name ?? "").trim();
        const term = findConceptByWord(state.content.terms, word);
        if (!term) {
          dyslexia.lastActionMessage = "لا توجد معلومات إضافية عن هذه الكلمة في الصفحة.";
          break;
        }
        const existing = dyslexia.simplified[term.conceptId];
        if (existing) {
          dyslexia.lastActionMessage = "تم تبسيط الكلمة.";
          wordExplain = {
            term: term.name,
            simpleExplanation: existing,
            contextualMeaning: term.definition,
            example: null,
            known: true,
          };
          break;
        }
        const currentSentence = dyslexia.segments[dyslexia.currentSegmentIndex]?.text ?? "";
        const rewritten = await teachingAiService.rewrite({
          instruction: `Explain the term "${term.name}" in one short simple Arabic sentence. Keep the scientific meaning. Do not replace the term with an inaccurate synonym.`,
          context: JSON.stringify({ term: term.name, definition: term.definition, sentence: currentSentence }),
          concept: term.name,
          mode: "dyslexia",
          allowedConcepts: [term.name, ...state.content.terms.map((item) => item.name)],
          allowVisual: false,
          sourceSnippets: [term.definition, currentSentence],
        });
        dyslexia.simplified[term.conceptId] = rewritten && !rewritten.includes("لا أجد")
          ? rewritten
          : term.definition;
        state.explanationRequests += 1;
        dyslexia.lastActionMessage = "تم تبسيط الكلمة.";
        interactionType = INTERACTION_TYPES.explanationRequested;
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
              conceptId: term.conceptId,
              previousModeId: ctx.learningModeId,
              newModeId: ctx.learningModeId,
              triggerReason: `VARIANT:${decision.reasonCode}`.slice(0, 500),
              aiReasoning: decision.explainWhy,
            });
          }
        }
        await auditService.record({
          userId: user.userId,
          actionType: "SIMPLIFICATION_REQUESTED",
          entityName: "LearningSessions",
          entityId: sessionId,
          description: "concept",
        });
        break;
      }
      case "save_note": {
        const segment = dyslexia.segments.find((item) => item.id === payload?.segmentId)
          ?? dyslexia.segments[dyslexia.currentSegmentIndex];
        const text = (payload?.note ?? "").trim();
        if (!segment) throw new ValidationError("المقطع غير صالح.");
        if (!text || text.length > NOTE_MAX_LENGTH) throw new ValidationError("الملاحظة غير صالحة.");
        const existing = dyslexia.notes.find((item) => item.segmentId === segment.id);
        if (existing) {
          existing.text = text;
          existing.updatedAt = new Date().toISOString();
        } else {
          dyslexia.notes.push({ segmentId: segment.id, text, updatedAt: new Date().toISOString() });
        }
        dyslexia.lastActionMessage = "تم حفظ الملاحظة.";
        interactionType = INTERACTION_TYPES.noteAdded;
        break;
      }
      case "delete_note": {
        const segmentId = payload?.segmentId ?? dyslexia.segments[dyslexia.currentSegmentIndex]?.id;
        dyslexia.notes = dyslexia.notes.filter((item) => item.segmentId !== segmentId);
        dyslexia.lastActionMessage = "تم حذف الملاحظة.";
        break;
      }
      case "test_me": {
        const stepIndex = state.steps.findIndex((step) => step.type === "check_question");
        if (stepIndex >= 0) state.currentStepIndex = stepIndex;
        dyslexia.lastActionMessage = "تم الانتقال إلى السؤال.";
        interactionType = INTERACTION_TYPES.questionPresented;
        break;
      }
      case "mark_viewed": {
        const id = payload?.segmentId ?? dyslexia.segments[dyslexia.currentSegmentIndex]?.id;
        if (id && !dyslexia.viewedIds.includes(id)) dyslexia.viewedIds.push(id);
        interactionType = INTERACTION_TYPES.segmentViewed;
        break;
      }
      case "replay":
        dyslexia.replayCount += 1;
        dyslexia.lastActionMessage = dyslexia.replayCount >= 3
          ? "هل تريد شرحًا أبسط؟"
          : "سأعيد قراءة هذا المقطع.";
        break;
      default:
        throw new ValidationError("الإجراء غير مدعوم.");
    }

    dyslexia.lastAction = action as DyslexiaAction;
    state.dyslexia = dyslexia;
    await persistState(sessionId, ctx.studentProfileId, state);
    if (interactionType) {
      await interactionRepository.insert({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        interactionType,
        conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
        interactionData: { action, segmentId: dyslexia.segments[dyslexia.currentSegmentIndex]?.id ?? null },
      });
    }
    const refreshed = await lessonService.getSession(user, sessionId);
    if (adaptationMessage) refreshed.adaptationMessage = adaptationMessage;
    if (refreshed.dyslexia) {
      refreshed.dyslexia.lastActionMessage = dyslexia.lastActionMessage;
      refreshed.dyslexia.wordExplain = wordExplain;
    }
    return refreshed;
  },
};

async function explainWord(
  word: string,
  sentence: string,
  pageText: string,
  terms: LessonState["content"]["terms"],
): Promise<DyslexiaWordExplain> {
  const known = findConceptByWord(terms, word);
  if (known) {
    return {
      term: known.name,
      simpleExplanation: known.definition,
      contextualMeaning: sentence.includes(known.name) ? sentence : null,
      example: null,
      known: true,
    };
  }
  const ai = await teachingAiService.explainWord({
    word,
    sentence,
    pageText,
    concepts: terms.map((item) => item.name),
  });
  if (ai) {
    return { ...ai, known: false };
  }
  return {
    term: word,
    simpleExplanation: "لا توجد معلومات إضافية عن هذه الكلمة في الصفحة.",
    contextualMeaning: null,
    example: null,
    known: false,
  };
}
