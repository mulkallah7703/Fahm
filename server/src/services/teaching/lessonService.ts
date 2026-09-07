import {
  INTERACTION_TYPES,
  LEARNING_MODE_CONFIGS,
  MODE_PRESENTATION,
  isLearningModeCode,
  type LearningModeCode,
} from "../../config/learningModes.js";
import { ANSWER_MAX_LENGTH } from "../../config/teaching.js";
import { accessibilityRepository } from "../../repositories/accessibilityRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { masteryRepository } from "../../repositories/masteryRepository.js";
import { questionRepository } from "../../repositories/questionRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import { studentAnswerRepository } from "../../repositories/studentAnswerRepository.js";
import type { AuthUser } from "../../types/index.js";
import type { AnalysisDto } from "../../types/analysis.js";
import type {
  LessonFeedback,
  LessonSessionDto,
  LessonState,
  PublicQuestion,
} from "../../types/teaching.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { analysisService } from "../analysis/analysisService.js";
import { learningPulseService } from "../learningPulseService.js";
import { learningInteractionService } from "../learning/learningInteractionService.js";
import { decideAdaptation } from "./adaptiveTeachingService.js";
import {
  attachAdaptiveState,
  buildInsight,
  collectEvidence,
  evidenceFingerprint,
} from "./adaptiveEvidence.js";
import { commitAdaptation, publicAdaptive, shouldUseAdaptiveExperience } from "./adaptiveExperience.js";
import { ensureAssessmentPlan, publicAssessment } from "./assessmentExperience.js";
import { evaluateAnswer, feedbackFor } from "./answerEvaluationService.js";
import { groundedHint, teachingAiService } from "./teachingAiService.js";
import {
  buildLessonPlan,
  isLessonState,
  modeEnglish,
  progressLabel,
  strategyFrom,
} from "./lessonPlanService.js";
import { teachingAiContext } from "./teachingContentService.js";
import { buildTeachingPlan } from "./teachingPlan.js";
import {
  applyTeachingToState,
  composeGroundedTeaching,
  overlayAnalysisWithUnderstanding,
  shouldRefreshTeaching,
} from "../gemini/teachingOrchestrator.js";
import { applyAnswerToMastery } from "./masteryUpdateService.js";
import {
  buildFollowUpQuestion,
  buildGroundedQuestion,
  parseSecret,
  toPublicQuestion,
} from "./questionFactory.js";
import { attachBlindState, publicBlind, shouldUseBlindExperience } from "./blindNarrativeService.js";
import { attachDyslexiaState, publicDyslexia, shouldUseDyslexiaExperience } from "./dyslexiaReadingService.js";

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
  if (!row?.interactionData || !isLessonState(row.interactionData)) return null;
  return row.interactionData;
}

async function persistState(
  sessionId: string,
  studentProfileId: string,
  state: LessonState,
): Promise<void> {
  await interactionRepository.insert({
    sessionId,
    studentProfileId,
    interactionType: INTERACTION_TYPES.lessonState,
    conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
    interactionData: state as unknown as Record<string, unknown>,
  });
}

function modeOf(code: string | null): LearningModeCode {
  return isLearningModeCode(code ?? "") ? (code as LearningModeCode) : "adaptive";
}

async function hydrateGrounded(
  analysis: AnalysisDto,
  state: LessonState,
  ctx: Awaited<ReturnType<typeof loadOwned>>,
  prefs?: { speechRate: number | null; fontSize: number | null },
  force = false,
): Promise<AnalysisDto> {
  const composed = await composeGroundedTeaching({
    analysis,
    mode: state.strategy.mode,
    variant: state.strategy.variant,
    state,
    fileUrl: ctx.fileUrl,
    mimeType: ctx.mimeType,
    imageUrl: ctx.imageUrl,
    speechRate: prefs?.speechRate,
    fontSize: prefs?.fontSize,
    force,
  });
  applyTeachingToState(state, composed);
  return overlayAnalysisWithUnderstanding(analysis, composed.understanding);
}

function analysisForTeaching(analysis: AnalysisDto, state: LessonState): AnalysisDto {
  return state.materialUnderstanding
    ? overlayAnalysisWithUnderstanding(analysis, state.materialUnderstanding)
    : analysis;
}

async function ensureQuestion(
  sessionId: string,
  state: LessonState,
  analysis: AnalysisDto,
): Promise<{ question: PublicQuestion | null; created: boolean }> {
  const step = state.steps[state.currentStepIndex];
  if (!step || step.type !== "check_question") return { question: null, created: false };
    if (step.questionId) {
    const existing = await questionRepository.findById(step.questionId);
    if (existing) {
      const built = buildGroundedQuestion(analysis, state.difficulty, state.strategy.mode);
      return {
        question: {
          id: existing.questionId,
          type: existing.questionType as PublicQuestion["type"],
          text: existing.questionText,
          options: parseSecret(existing.correctAnswer)?.options ?? built?.options ?? null,
          difficulty: (existing.difficultyLevel as PublicQuestion["difficulty"]) ?? state.difficulty,
        },
        created: false,
      };
    }
  }
  const built = buildGroundedQuestion(analysis, state.difficulty, state.strategy.mode);
  if (!built) return { question: null, created: false };
  const questionId = await questionRepository.insert({
    sessionId,
    conceptId: built.conceptId,
    questionType: built.type,
    questionText: built.text,
    correctAnswer: JSON.stringify(built.secret),
    difficultyLevel: built.difficulty,
    aiModel: "grounded-factory",
  });
  step.questionId = questionId;
  step.conceptId = built.conceptId;
  return { question: toPublicQuestion(questionId, built), created: true };
}

async function toDto(input: {
  ctx: Awaited<ReturnType<typeof loadOwned>>;
  analysis: AnalysisDto;
  state: LessonState;
  question: PublicQuestion | null;
  feedback: LessonFeedback | null;
  adaptationMessage: string | null;
  prefs?: { speechRate: number | null; preferredVoice: string | null; fontSize: number | null; lineSpacing?: number | null };
}): Promise<LessonSessionDto> {
  const { ctx, state } = input;
  const mode = state.strategy.mode;
  const current = Math.min(state.currentStepIndex + 1, state.steps.length);
  const pulse = await learningPulseService.getPulse(ctx.studentProfileId);
  const mastery = await masteryRepository.listForStudent(ctx.studentProfileId);
  const completion = state.completed
    ? {
        message: "أحسنت، أكملت الدرس.",
        pulse: { previous: null, current: pulse?.score ?? null },
        concepts: mastery
          .filter((row) => state.content.terms.some((term) => term.conceptId === row.conceptId))
          .map((row) => ({
            name: row.conceptName,
            masteryScore: row.masteryScore,
            needsReview: row.masteryScore <= 69,
          })),
        reviewNeeded: mastery.some((row) => row.masteryScore <= 69),
      }
    : null;

  const dto: LessonSessionDto = {
    session: {
      id: ctx.sessionId,
      status: ctx.sessionStatus,
      completed: state.completed || ctx.sessionStatus === "completed",
    },
    material: {
      id: ctx.materialId,
      title: ctx.title?.trim() || input.analysis.material.title,
      pageNumber: ctx.pageNumber,
      hasFile: Boolean(ctx.fileUrl || ctx.imageUrl),
      subject: input.analysis.concepts[0]?.subject ?? null,
    },
    mode: {
      code: mode,
      name: MODE_PRESENTATION[mode].name,
      englishName: modeEnglish(mode),
    },
    strategy: state.strategy,
    config: LEARNING_MODE_CONFIGS[mode],
    progress: {
      current,
      total: state.steps.length,
      label: progressLabel(current, state.steps.length),
    },
    steps: state.steps,
    currentStep: state.steps[state.currentStepIndex] ?? state.steps[0],
    content: state.content,
    question: input.question,
    feedback: input.feedback,
    adaptationMessage: input.adaptationMessage,
    completion,
    blind: publicBlind(state, input.analysis, input.prefs ?? {
      speechRate: null,
      preferredVoice: null,
      fontSize: null,
    }),
    dyslexia: publicDyslexia(state, input.prefs?.speechRate ?? null),
    adaptive: await publicAdaptive(state, input.analysis, ctx.sessionId, ctx.studentProfileId),
    assessment: null,
    teachingPlan: buildTeachingPlan({
      analysis: analysisForTeaching(input.analysis, state),
      mode,
      variant: state.strategy.variant,
    }),
  };
  const assessment = await publicAssessment(state, input.analysis, ctx.studentProfileId, mastery, pulse);
  dto.assessment = assessment;
  if (assessment?.active && assessment.question) {
    dto.question = assessment.question;
  }
  return dto;
}

export const lessonService = {
  async getSession(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const ctx = await loadOwned(user, sessionId);
    let analysis = await analysisService.getAnalysis(user, ctx.materialId);
    const prefs = (await accessibilityRepository.findForStudent(ctx.studentProfileId)) ?? {
      speechRate: null,
      preferredVoice: null,
      fontSize: null,
      lineSpacing: null,
    };
    const mode = modeOf(ctx.modeCode);
    let state = await loadState(sessionId);
    let modeChanged = false;
    if (state && shouldRefreshTeaching(state, mode, state.strategy.variant) && state.strategy.mode === mode) {
      analysis = await hydrateGrounded(analysis, state, ctx, prefs);
      modeChanged = true;
    }
    if (state && state.strategy.mode !== mode) {
      const nextPlan = buildLessonPlan({
        analysis,
        mode,
        adaptiveEnabled: state.adaptiveEnabled,
      });
      nextPlan.consecutiveCorrect = state.consecutiveCorrect;
      nextPlan.consecutiveIncorrect = state.consecutiveIncorrect;
      nextPlan.hintsUsed = state.hintsUsed;
      nextPlan.explanationRequests = state.explanationRequests;
      nextPlan.examplesRequested = state.examplesRequested;
      nextPlan.difficulty = state.difficulty;
      nextPlan.materialUnderstanding = state.materialUnderstanding;
      state = nextPlan;
      analysis = await hydrateGrounded(analysis, state, ctx, prefs, true);
      modeChanged = true;
    }
    if (!state) {
      state = buildLessonPlan({
        analysis,
        mode,
        adaptiveEnabled: true,
      });
      const pref = await interactionRepository.latestSessionPreference(sessionId);
      if (pref?.adaptiveEnabled !== null && pref?.adaptiveEnabled !== undefined) {
        state.adaptiveEnabled = pref.adaptiveEnabled;
      }
      analysis = await hydrateGrounded(analysis, state, ctx, prefs, true);
      await persistState(sessionId, ctx.studentProfileId, state);
      await interactionRepository.insert({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        interactionType: INTERACTION_TYPES.lessonStarted,
        conceptId: state.steps[0]?.conceptId ?? null,
        interactionData: { mode: state.strategy.mode },
      });
      await auditService.record({
        userId: user.userId,
        actionType: "LESSON_STARTED",
        entityName: "LearningSessions",
        entityId: sessionId,
        description: state.strategy.mode,
      });
    }
    analysis = analysisForTeaching(analysis, state);
    const ensured = await ensureQuestion(sessionId, state, analysis);
    let blindChanged = false;
    if (shouldUseBlindExperience(state.strategy.mode, state.strategy.variant)) {
      const before = state.blind?.contentHash;
      attachBlindState(state, analysis, ensured.question, prefs.speechRate ?? undefined);
      blindChanged = state.blind?.contentHash !== before || !before;
    }
    let dyslexiaChanged = false;
    if (shouldUseDyslexiaExperience(state.strategy.mode)) {
      const before = state.dyslexia?.contentHash;
      attachDyslexiaState(state, analysis, prefs);
      dyslexiaChanged = state.dyslexia?.contentHash !== before || !before;
      if (dyslexiaChanged) {
        await auditService.record({
          userId: user.userId,
          actionType: "DYSLEXIA_MODE_STARTED",
          entityName: "LearningSessions",
          entityId: sessionId,
          description: "reading",
        });
      }
    }
    if (shouldUseAdaptiveExperience(state.strategy.mode)) attachAdaptiveState(state);
    let assessmentChanged = false;
    const onCheck = state.steps[state.currentStepIndex]?.type === "check_question";
    if (onCheck && !state.completed && !state.assessment?.completed) {
      const masteryRows = await masteryRepository.listForStudent(ctx.studentProfileId);
      const planned = await ensureAssessmentPlan(sessionId, state, analysis, masteryRows);
      if (state.assessment) state.assessment.active = true;
      assessmentChanged = planned.created || Boolean(state.assessment?.active);
    }
    if (ensured.created || blindChanged || dyslexiaChanged || modeChanged || assessmentChanged) {
      await persistState(sessionId, ctx.studentProfileId, state);
    }
    return toDto({
      ctx,
      analysis,
      state,
      question: ensured.question,
      feedback: null,
      adaptationMessage: null,
      prefs,
    });
  },

  async advance(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    let state = await loadState(sessionId);
    if (!state) {
      await this.getSession(user, sessionId);
      state = await loadState(sessionId);
    }
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    const step = state.steps[state.currentStepIndex];
    if (!step) throw new ValidationError("لا توجد خطوة تالية.");
    if (step.type === "check_question" && step.status !== "completed") {
      throw new ValidationError("أجب عن سؤال التحقق أولًا.");
    }
    step.status = "completed";
    if (state.currentStepIndex < state.steps.length - 1) {
      state.currentStepIndex += 1;
      state.steps[state.currentStepIndex].status = "in_progress";
    } else {
      state.completed = true;
    }
    await interactionRepository.insert({
      sessionId,
      studentProfileId: ctx.studentProfileId,
      interactionType: INTERACTION_TYPES.explanationViewed,
      conceptId: step.conceptId,
      interactionData: { stepType: step.type },
    });
    const ensured = await ensureQuestion(sessionId, state, analysis);
    if (shouldUseBlindExperience(state.strategy.mode, state.strategy.variant)) {
      attachBlindState(state, analysis, ensured.question);
    }
    if (shouldUseDyslexiaExperience(state.strategy.mode)) attachDyslexiaState(state, analysis);
    await persistState(sessionId, ctx.studentProfileId, state);
    return toDto({
      ctx,
      analysis,
      state,
      question: ensured.question,
      feedback: null,
      adaptationMessage: null,
    });
  },

  async submitAnswer(
    user: AuthUser,
    sessionId: string,
    input: { questionId: string; answer: string; responseTimeSeconds?: number | null },
  ): Promise<LessonSessionDto> {
    const answer = input.answer.trim();
    if (!answer || answer.length > ANSWER_MAX_LENGTH) {
      throw new ValidationError("الإجابة غير صالحة.");
    }
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    const state = await loadState(sessionId);
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    const question = await questionRepository.findById(input.questionId);
    if (!question || question.sessionId.toLowerCase() !== sessionId.toLowerCase()) {
      throw new NotFoundError("لم يتم العثور على السؤال.");
    }

    const existing = await studentAnswerRepository.findForQuestion(
      question.questionId,
      ctx.studentProfileId,
    );
    if (existing) {
      const publicQuestion = await ensureQuestion(sessionId, state, analysis);
      return toDto({
        ctx,
        analysis,
        state,
        question: publicQuestion.question,
        feedback: feedbackFor(Boolean(existing.isCorrect), false, null),
        adaptationMessage: null,
      });
    }

    const secret = parseSecret(question.correctAnswer);
    if (!secret) throw new ValidationError("تعذر تقييم السؤال.");
    const usedHint = state.lastHintQuestionId === question.questionId;
    const result = evaluateAnswer({
      type: question.questionType as "multiple_choice" | "true_false" | "short_answer",
      submitted: answer,
      secret,
    });
    const conceptName = analysis.concepts.find((item) => item.id === question.conceptId)?.name ?? null;
    const explanation = result.isCorrect
      ? null
      : conceptName
        ? `هذه الفكرة مرتبطة بـ «${conceptName}» كما وردت في الصفحة. لنراجعها معًا.`
        : `يبدو أن هذه النقطة تحتاج توضيحًا إضافيًا. راجع: ${state.content.mainIdea}`;

    const answerId = await studentAnswerRepository.insert({
      questionId: question.questionId,
      studentProfileId: ctx.studentProfileId,
      answerText: answer,
      isCorrect: result.isCorrect,
      score: result.score,
      explanation,
      responseTimeSeconds: input.responseTimeSeconds ?? null,
    });

    if (question.conceptId) {
      const current = await masteryRepository.findOne(ctx.studentProfileId, question.conceptId);
      const concept = analysis.concepts.find((item) => item.id === question.conceptId);
      const updated = applyAnswerToMastery(current, {
        conceptId: question.conceptId,
        conceptName: concept?.name ?? "مفهوم",
        subject: concept?.subject ?? null,
        correct: result.isCorrect,
        usedHint,
        explanationRequested: state.explanationRequests > 0,
      });
      await masteryRepository.upsert(ctx.studentProfileId, updated);
    }

    await learningPulseService.getPulse(ctx.studentProfileId);
    await interactionRepository.insert({
      sessionId,
      studentProfileId: ctx.studentProfileId,
      interactionType: INTERACTION_TYPES.answerSubmitted,
      conceptId: question.conceptId,
      interactionData: { answerId, isCorrect: result.isCorrect, usedHint },
    });

    if (result.isCorrect) {
      state.consecutiveCorrect += 1;
      state.consecutiveIncorrect = 0;
    } else {
      state.consecutiveIncorrect += 1;
      state.consecutiveCorrect = 0;
    }

    const decision = decideAdaptation({
      adaptiveEnabled: state.adaptiveEnabled,
      currentVariant: state.strategy.variant,
      currentDifficulty: state.difficulty,
      consecutiveCorrect: state.consecutiveCorrect,
      consecutiveIncorrect: state.consecutiveIncorrect,
      explanationRequests: state.explanationRequests,
      usedHintOnLastCorrect: result.isCorrect && usedHint,
    });

    let adaptationMessage: string | null = null;
    if (decision.changed) {
      const evidence = collectEvidence(state, {
        replayCount: 0,
        incorrectAnswers: state.consecutiveIncorrect,
        pauseSeconds: null,
      });
      const insight = buildInsight(evidence, decision.reasonCode, decision.nextVariant) ?? decision.explainWhy;
      commitAdaptation(state, decision, evidenceFingerprint(evidence), insight);
      state.strategy = strategyFrom(state.strategy.mode, decision.nextVariant);
      state.strategy.difficulty = decision.nextDifficulty;
      state.difficulty = decision.nextDifficulty;
      await hydrateGrounded(analysis, state, ctx, undefined, true);
      adaptationMessage = decision.studentMessage;
      await learningInteractionService.recordAdaptation({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        conceptId: question.conceptId,
        previousModeId: ctx.learningModeId,
        newModeId: ctx.learningModeId,
        triggerReason: `VARIANT:${decision.reasonCode}`.slice(0, 500),
        aiReasoning: decision.explainWhy,
      });
      await interactionRepository.insert({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        interactionType: INTERACTION_TYPES.adaptationTriggered,
        conceptId: question.conceptId,
        interactionData: { reason: decision.reasonCode, variant: decision.nextVariant },
      });
      await auditService.record({
        userId: user.userId,
        actionType: "ADAPTATION_OCCURRED",
        entityName: "AdaptationEvents",
        entityId: sessionId,
        description: decision.reasonCode,
      });
    }

    const step = state.steps[state.currentStepIndex];
    let publicQuestion: PublicQuestion = {
      id: question.questionId,
      type: question.questionType as PublicQuestion["type"],
      text: question.questionText,
      options: secret.options ?? null,
      difficulty: state.difficulty,
    };
    if (step?.type === "check_question") {
      if (result.isCorrect) {
        step.status = "completed";
        const assessmentOpen = Boolean(state.assessment?.active && !state.assessment.completed);
        if (state.currentStepIndex >= state.steps.length - 1 && !assessmentOpen) {
          state.completed = true;
        }
      } else {
        step.status = "needs_review";
        const followUp = state.assessment?.active
          ? null
          : buildFollowUpQuestion(analysis, question.conceptId, state.difficulty);
        if (followUp) {
          const followId = await questionRepository.insert({
            sessionId,
            conceptId: followUp.conceptId,
            questionType: followUp.type,
            questionText: followUp.text,
            correctAnswer: JSON.stringify(followUp.secret),
            difficultyLevel: followUp.difficulty,
            aiModel: "grounded-followup",
          });
          step.questionId = followId;
          publicQuestion = toPublicQuestion(followId, followUp);
        }
      }
    }

    if (shouldUseBlindExperience(state.strategy.mode, state.strategy.variant)) {
      attachBlindState(state, analysis, publicQuestion);
    }
    if (shouldUseDyslexiaExperience(state.strategy.mode)) attachDyslexiaState(state, analysis);
    await persistState(sessionId, ctx.studentProfileId, state);
    await auditService.record({
      userId: user.userId,
      actionType: "ANSWER_SUBMITTED",
      entityName: "StudentAnswers",
      entityId: answerId,
      description: result.isCorrect ? "correct" : "incorrect",
    });

    return toDto({
      ctx,
      analysis,
      state,
      question: publicQuestion,
      feedback: feedbackFor(result.isCorrect, usedHint, explanation),
      adaptationMessage,
    });
  },

  async hint(user: AuthUser, sessionId: string): Promise<{ hint: string } & LessonSessionDto> {
    const dto = await this.getSession(user, sessionId);
    const ctx = await loadOwned(user, sessionId);
    const state = await loadState(sessionId);
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    const hint = groundedHint({
      questionText: dto.question?.text ?? "",
      conceptName: state.content.terms[0]?.name ?? null,
      mainIdea: state.content.mainIdea,
    });
    const hintedId = state.assessment?.active
      ? (state.assessment.itemIds[state.assessment.currentIndex] ?? dto.question?.id)
      : dto.question?.id;
    if (hintedId) state.lastHintQuestionId = hintedId;
    state.hintsUsed += 1;
    await interactionRepository.insert({
      sessionId,
      studentProfileId: ctx.studentProfileId,
      interactionType: INTERACTION_TYPES.hintRequested,
      conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
      interactionData: { questionId: dto.question?.id ?? null },
    });
    await persistState(sessionId, ctx.studentProfileId, state);
    return { ...dto, hint };
  },

  async simplify(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    const state = await loadState(sessionId);
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    state.explanationRequests += 1;
    const previous = state.strategy.variant;
    if (previous !== "simplified") {
      const evidence = collectEvidence(state, {
        replayCount: 0,
        incorrectAnswers: state.consecutiveIncorrect,
        pauseSeconds: null,
      });
      commitAdaptation(
        state,
        {
          previousVariant: previous,
          nextVariant: "simplified",
          reasonCode: "STUDENT_SIMPLIFY",
          explainWhy: "طلب الطالب شرحًا أبسط.",
        },
        evidenceFingerprint(evidence),
        buildInsight(evidence, "STUDENT_SIMPLIFY") ?? "طلبت تبسيط الفكرة.",
      );
    }
    state.strategy = strategyFrom(state.strategy.mode, "simplified");
    await hydrateGrounded(analysis, state, ctx, undefined, true);
    if (!state.content.simplifiedExplanation) {
      const rewritten = await teachingAiService.rewrite({
        instruction: "Rewrite a shorter simpler explanation. Keep the same facts. Arabic.",
        context: teachingAiContext(analysisForTeaching(analysis, state), state.content),
        concept: state.content.terms[0]?.name ?? null,
        mode: state.strategy.mode,
        allowedConcepts: state.content.terms.map((item) => item.name),
        allowVisual: false,
        sourceSnippets: [state.content.coreIdea ?? state.content.mainIdea, ...state.content.keyPoints.map((item) => item.text)],
      });
      if (rewritten) state.content.simplifiedExplanation = rewritten;
    }
    await interactionRepository.insert({
      sessionId,
      studentProfileId: ctx.studentProfileId,
      interactionType: INTERACTION_TYPES.explanationRequested,
      conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
      interactionData: { action: "simplify" },
    });
    if (previous !== "simplified") {
      await learningInteractionService.recordAdaptation({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
        previousModeId: ctx.learningModeId,
        newModeId: ctx.learningModeId,
        triggerReason: "VARIANT:STUDENT_SIMPLIFY",
        aiReasoning: "طلب الطالب شرحًا أبسط.",
      });
    }
    const ensured = await ensureQuestion(sessionId, state, analysis);
    if (shouldUseBlindExperience(state.strategy.mode, state.strategy.variant)) {
      attachBlindState(state, analysis, ensured.question);
    }
    if (shouldUseDyslexiaExperience(state.strategy.mode)) attachDyslexiaState(state, analysis);
    await persistState(sessionId, ctx.studentProfileId, state);
    return toDto({
      ctx,
      analysis,
      state,
      question: ensured.question,
      feedback: null,
      adaptationMessage: previous === "simplified" ? null : "سأشرح هذه النقطة بطريقة أبسط.",
    });
  },

  async example(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    const state = await loadState(sessionId);
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    state.examplesRequested += 1;
    const previous = state.strategy.variant;
    if (previous !== "example") {
      const evidence = collectEvidence(state, {
        replayCount: 0,
        incorrectAnswers: state.consecutiveIncorrect,
        pauseSeconds: null,
      });
      commitAdaptation(
        state,
        {
          previousVariant: previous,
          nextVariant: "example",
          reasonCode: "STUDENT_EXAMPLE",
          explainWhy: "طلب الطالب مثالًا.",
        },
        evidenceFingerprint(evidence),
        buildInsight(evidence, "STUDENT_EXAMPLE") ?? "طلبت مثالًا أقرب إلى الحياة اليومية.",
      );
    }
    state.strategy = strategyFrom(state.strategy.mode, "example");
    await hydrateGrounded(analysis, state, ctx, undefined, true);
    if (!state.content.example) {
      const rewritten = await teachingAiService.rewrite({
        instruction: "Give one short example grounded only in the CONTEXT. Arabic. Do not invent facts.",
        context: teachingAiContext(analysisForTeaching(analysis, state), state.content),
        concept: state.content.terms[0]?.name ?? null,
        mode: state.strategy.mode,
        allowedConcepts: state.content.terms.map((item) => item.name),
        allowVisual: false,
        sourceSnippets: [state.content.coreIdea ?? state.content.mainIdea, ...state.content.keyPoints.map((item) => item.text)],
      });
      if (rewritten && !rewritten.includes("لا أجد")) state.content.example = rewritten;
    }
    await interactionRepository.insert({
      sessionId,
      studentProfileId: ctx.studentProfileId,
      interactionType: INTERACTION_TYPES.exampleRequested,
      conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
      interactionData: { action: "example" },
    });
    if (previous !== "example") {
      await learningInteractionService.recordAdaptation({
        sessionId,
        studentProfileId: ctx.studentProfileId,
        conceptId: state.steps[state.currentStepIndex]?.conceptId ?? null,
        previousModeId: ctx.learningModeId,
        newModeId: ctx.learningModeId,
        triggerReason: "VARIANT:STUDENT_EXAMPLE",
        aiReasoning: "طلب الطالب مثالًا.",
      });
    }
    const ensured = await ensureQuestion(sessionId, state, analysis);
    if (shouldUseBlindExperience(state.strategy.mode, state.strategy.variant)) {
      attachBlindState(state, analysis, ensured.question);
    }
    if (shouldUseDyslexiaExperience(state.strategy.mode)) attachDyslexiaState(state, analysis);
    await persistState(sessionId, ctx.studentProfileId, state);
    return toDto({
      ctx,
      analysis,
      state,
      question: ensured.question,
      feedback: null,
      adaptationMessage: "إليك مثالًا أقرب إلى محتوى الصفحة.",
    });
  },

  async focusConcept(user: AuthUser, sessionId: string, conceptId: string): Promise<void> {
    const ctx = await loadOwned(user, sessionId);
    if (!(await loadState(sessionId))) {
      await this.getSession(user, sessionId);
    }
    const state = await loadState(sessionId);
    if (!state) return;
    const explainIndex = state.steps.findIndex(
      (step) => step.conceptId === conceptId && step.type !== "check_question",
    );
    const anyIndex = state.steps.findIndex((step) => step.conceptId === conceptId);
    const target = explainIndex >= 0 ? explainIndex : anyIndex;
    if (target < 0) return;
    state.currentStepIndex = target;
    await persistState(sessionId, ctx.studentProfileId, state);
  },

  async ask(user: AuthUser, sessionId: string, question: string): Promise<{ reply: string }> {
    const { askFahmService } = await import("./askFahmService.js");
    const data = await askFahmService.sendMessage(user, sessionId, question);
    return { reply: data.reply ?? "لا أجد هذه المعلومة في الصفحة الحالية." };
  },

  async complete(user: AuthUser, sessionId: string): Promise<LessonSessionDto> {
    const ctx = await loadOwned(user, sessionId);
    const analysis = await analysisService.getAnalysis(user, ctx.materialId);
    const state = await loadState(sessionId);
    if (!state) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    state.steps.forEach((step) => {
      if (step.status !== "completed") step.status = "completed";
    });
    state.completed = true;
    await sessionRepository.markCompleted(sessionId);
    await persistState(sessionId, ctx.studentProfileId, state);
    await interactionRepository.insert({
      sessionId,
      studentProfileId: ctx.studentProfileId,
      interactionType: INTERACTION_TYPES.lessonCompleted,
      interactionData: { completed: true },
    });
    await auditService.record({
      userId: user.userId,
      actionType: "LESSON_COMPLETED",
      entityName: "LearningSessions",
      entityId: sessionId,
      description: "completed",
    });
    const ensured = await ensureQuestion(sessionId, state, analysis);
    return toDto({
      ctx,
      analysis,
      state,
      question: ensured.question,
      feedback: null,
      adaptationMessage: null,
    });
  },
};
