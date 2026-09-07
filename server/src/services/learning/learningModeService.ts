import {
  LEARNING_MODE_CONFIGS,
  MODE_DISPLAY_ORDER,
  MODE_PRESENTATION,
  isLearningModeCode,
  type LearningModeCode,
} from "../../config/learningModes.js";
import { analysisRepository } from "../../repositories/analysisRepository.js";
import { accessibilityRepository } from "../../repositories/accessibilityRepository.js";
import { interactionRepository } from "../../repositories/interactionRepository.js";
import { learningModeRepository } from "../../repositories/learningModeRepository.js";
import { masteryRepository } from "../../repositories/masteryRepository.js";
import { sessionRepository } from "../../repositories/sessionRepository.js";
import { userRepository } from "../../repositories/userRepository.js";
import type { AuthUser } from "../../types/index.js";
import type {
  CatalogMode,
  LearningSessionState,
  LearningSetup,
  ModeRecommendation,
  TeachingStrategyContract,
} from "../../types/learning.js";
import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { auditService } from "../auditService.js";
import { analysisService } from "../analysis/analysisService.js";
import { learningPulseService } from "../learningPulseService.js";
import {
  contentComplexityService,
  explicitPreferenceFromAccess,
  scoreContentComplexity,
} from "./contentComplexityService.js";
import { adaptiveRecommendationService } from "./adaptiveRecommendationService.js";
import { learningInteractionService } from "./learningInteractionService.js";
import { modeEffectivenessService } from "./modeEffectivenessService.js";

function scoreUnknownComplexity() {
  return scoreContentComplexity({
    conceptCount: 0,
    relationshipCount: 0,
    wordCount: 0,
    sectionCount: 0,
    hasDiagram: false,
    hasTable: false,
    analysisReady: false,
  });
}

function requireStudent(user: AuthUser): string {
  if (!user.studentProfileId) {
    throw new NotFoundError("لم يتم العثور على الصفحة.");
  }
  return user.studentProfileId;
}

async function loadOwned(user: AuthUser, materialId: string) {
  const ctx = await analysisRepository.findOwnedContext(materialId, requireStudent(user));
  if (!ctx) {
    throw new NotFoundError("لم يتم العثور على الصفحة.");
  }
  return ctx;
}

function toCatalog(
  rows: Awaited<ReturnType<typeof learningModeRepository.listActive>>,
  recommended: LearningModeCode | null,
): CatalogMode[] {
  const byCode = new Map(rows.map((row) => [row.modeCode, row]));
  return MODE_DISPLAY_ORDER.flatMap((code) => {
    const row = byCode.get(code);
    if (!row) return [];
    const presentation = MODE_PRESENTATION[code];
    return [
      {
        code,
        name: presentation.name,
        englishName: presentation.englishName,
        description: presentation.description,
        features: presentation.features,
        comparison: presentation.comparison,
        recommended: recommended === code,
        isAdaptive: row.isAdaptive,
        config: LEARNING_MODE_CONFIGS[code],
      },
    ];
  });
}

function masterySignals(rows: Awaited<ReturnType<typeof masteryRepository.listForStudent>>) {
  if (rows.length === 0) {
    return { recentMastery: null, recentErrorRate: null, explanationNeed: null };
  }
  const mastery =
    rows.reduce((sum, row) => sum + Math.min(100, Math.max(0, row.masteryScore)), 0) /
    rows.length /
    100;
  const attempts = rows.reduce((sum, row) => sum + row.attemptsCount, 0);
  const incorrect = rows.reduce((sum, row) => sum + row.incorrectAnswers, 0);
  const explanations = rows.reduce((sum, row) => sum + row.explanationCount, 0);
  return {
    recentMastery: Math.round(mastery * 100) / 100,
    recentErrorRate: attempts > 0 ? Math.round((incorrect / attempts) * 100) / 100 : null,
    explanationNeed:
      rows.length > 0 ? Math.min(1, Math.round((explanations / rows.length / 4) * 100) / 100) : null,
  };
}

async function buildRecommendation(
  user: AuthUser,
  materialId: string,
): Promise<{
  recommendation: ModeRecommendation;
  complexity: ReturnType<typeof contentComplexityService.fromAnalysis>;
  session: LearningSessionState;
  analysisStatus: string;
  conceptCount: number;
  wordCount: number;
  gradeLevel: string | null;
  adaptiveDefault: boolean;
  explicitPreference: LearningModeCode | null;
}> {
  const studentId = requireStudent(user);
  const ctx = await loadOwned(user, materialId);
  const student = await userRepository.findStudentByUserId(user.userId);
  if (!student) {
    throw new NotFoundError("لم يتم العثور على ملف التعلم.");
  }

  const [analysis, access, mastery, pulse, effectiveness, incomplete, storedPref] =
    await Promise.all([
      analysisService.getAnalysis(user, materialId),
      accessibilityRepository.findForStudent(studentId),
      masteryRepository.listForStudent(studentId),
      learningPulseService.getPulse(studentId),
      modeEffectivenessService.forStudent(studentId),
      sessionRepository.findIncompleteForMaterial(studentId, materialId),
      interactionRepository.latestSessionPreference(ctx.sessionId),
    ]);

  const complexity = contentComplexityService.fromAnalysis(analysis);
  const performance = masterySignals(mastery);
  const recommendation = adaptiveRecommendationService.recommend({
    accessibility: access,
    defaultLearningMode: student.defaultLearningMode,
    complexity,
    recentMastery: performance.recentMastery,
    recentErrorRate: performance.recentErrorRate,
    explanationNeed: performance.explanationNeed,
    pulseScore: pulse ? pulse.score / 100 : null,
    reviewConceptCount: mastery.filter((row) => row.masteryScore <= 69).length,
    effectiveness,
  });

  const selectedMode = isLearningModeCode(incomplete?.modeCode ?? ctx.modeCode ?? "")
    ? ((incomplete?.modeCode ?? ctx.modeCode) as LearningModeCode)
    : isLearningModeCode(storedPref?.modeCode ?? "")
      ? (storedPref?.modeCode as LearningModeCode)
      : null;

  const adaptiveEnabled =
    storedPref?.adaptiveEnabled ?? student.aiAdaptationEnabled;

  return {
    recommendation,
    complexity,
    session: {
      sessionId: incomplete?.sessionId ?? ctx.sessionId,
      materialId: ctx.materialId,
      pageId: ctx.pageId,
      pageNumber: ctx.pageNumber,
      selectedMode,
      selectedModeName: incomplete?.modeName ?? ctx.modeName,
      adaptiveEnabled,
      sessionStatus: incomplete?.sessionStatus ?? "active",
      isResume: Boolean(incomplete),
    },
    analysisStatus: analysis.status,
    conceptCount: analysis.concepts.length,
    wordCount: analysis.wordCount,
    gradeLevel: student.gradeLevel,
    adaptiveDefault: student.aiAdaptationEnabled,
    explicitPreference: access ? explicitPreferenceFromAccess(access) : null,
  };
}

export const learningModeService = {
  async listModes(): Promise<CatalogMode[]> {
    const rows = await learningModeRepository.listActive();
    return toCatalog(rows, null);
  },

  async getRecommendation(user: AuthUser, materialId: string): Promise<ModeRecommendation> {
    const built = await buildRecommendation(user, materialId);
    return built.recommendation;
  },

  async getSession(user: AuthUser, materialId: string): Promise<LearningSessionState> {
    const built = await buildRecommendation(user, materialId);
    return built.session;
  },

  async getSetup(user: AuthUser, materialId: string): Promise<LearningSetup> {
    const ctx = await loadOwned(user, materialId);
    const rows = await learningModeRepository.listActive();
    try {
      const built = await buildRecommendation(user, materialId);
      return {
        material: {
          id: ctx.materialId,
          title: ctx.title?.trim() || "صفحة كتاب",
          pageNumber: ctx.pageNumber,
          conceptCount: built.conceptCount,
          wordCount: built.wordCount,
          analysisStatus: built.analysisStatus,
        },
        modes: toCatalog(rows, built.recommendation.recommendedMode),
        recommendation: built.recommendation,
        recommendationError: false,
        session: built.session,
        student: {
          gradeLevel: built.gradeLevel,
          isNewLearner: built.recommendation.isNewLearner,
          adaptiveEnabledDefault: built.adaptiveDefault,
        },
      };
    } catch {
      const student = await userRepository.findStudentByUserId(user.userId);
      const incomplete = await sessionRepository.findIncompleteForMaterial(
        requireStudent(user),
        materialId,
      );
      return {
        material: {
          id: ctx.materialId,
          title: ctx.title?.trim() || "صفحة كتاب",
          pageNumber: ctx.pageNumber,
          conceptCount: 0,
          wordCount: 0,
          analysisStatus: "unknown",
        },
        modes: toCatalog(rows, null),
        recommendation: null,
        recommendationError: true,
        session: {
          sessionId: incomplete?.sessionId ?? ctx.sessionId,
          materialId: ctx.materialId,
          pageId: ctx.pageId,
          pageNumber: ctx.pageNumber,
          selectedMode: isLearningModeCode(incomplete?.modeCode ?? ctx.modeCode ?? "")
            ? ((incomplete?.modeCode ?? ctx.modeCode) as LearningModeCode)
            : null,
          selectedModeName: incomplete?.modeName ?? ctx.modeName,
          adaptiveEnabled: student?.aiAdaptationEnabled ?? true,
          sessionStatus: incomplete?.sessionStatus ?? "active",
          isResume: Boolean(incomplete),
        },
        student: {
          gradeLevel: student?.gradeLevel ?? null,
          isNewLearner: true,
          adaptiveEnabledDefault: student?.aiAdaptationEnabled ?? true,
        },
      };
    }
  },

  async selectMode(
    user: AuthUser,
    materialId: string,
    input: { modeCode: string; adaptiveEnabled: boolean; startLesson?: boolean },
    meta?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<TeachingStrategyContract> {
    if (!isLearningModeCode(input.modeCode)) {
      throw new ValidationError("طريقة الشرح غير صالحة.", "INVALID_MODE");
    }
    const mode = await learningModeRepository.findActiveByCode(input.modeCode);
    if (!mode) {
      throw new ValidationError("طريقة الشرح غير صالحة.", "INVALID_MODE");
    }

    const studentId = requireStudent(user);
    const ctx = await loadOwned(user, materialId);

    let recommendation: ModeRecommendation | null = null;
    let complexity = scoreUnknownComplexity();
    let gradeLevel: string | null = null;
    let explicitPreference: LearningModeCode | null = null;
    let hasHistory = false;
    try {
      const built = await buildRecommendation(user, materialId);
      recommendation = built.recommendation;
      complexity = built.complexity;
      gradeLevel = built.gradeLevel;
      explicitPreference = built.explicitPreference;
      hasHistory = !built.recommendation.isNewLearner;
    } catch {
      const student = await userRepository.findStudentByUserId(user.userId);
      const access = await accessibilityRepository.findForStudent(studentId);
      gradeLevel = student?.gradeLevel ?? null;
      explicitPreference = access ? explicitPreferenceFromAccess(access) : null;
    }

    const resumed = await sessionRepository.resumeOrCreate({
      studentProfileId: studentId,
      materialId,
      learningModeId: mode.learningModeId,
    });
    const sessionId = resumed.sessionId;

    const selection = learningInteractionService.selectionPayload(
      mode.modeCode,
      input.adaptiveEnabled,
    );
    await interactionRepository.insert({
      sessionId,
      studentProfileId: studentId,
      interactionType: selection.type,
      interactionData: selection.data,
    });

    await auditService.record({
      userId: user.userId,
      actionType: input.startLesson
        ? "LESSON_STARTED"
        : mode.modeCode === "adaptive"
          ? "ADAPTIVE_MODE_SELECTED"
          : "MODE_SELECTED",
      entityName: "LearningSessions",
      entityId: sessionId,
      description: `${mode.modeCode}:${input.adaptiveEnabled ? "adaptive_on" : "adaptive_off"}`,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    });

    return {
      sessionId,
      materialId,
      pageId: ctx.pageId,
      selectedMode: mode.modeCode,
      adaptiveEnabled: input.adaptiveEnabled,
      initialRecommendation: recommendation
        ? {
            recommendedMode: recommendation.recommendedMode,
            reasonCode: recommendation.reasonCode,
            reasonText: recommendation.reasonText,
            isNewLearner: recommendation.isNewLearner,
          }
        : null,
      contentComplexity: complexity,
      studentContext: {
        gradeLevel,
        hasHistory,
        explicitPreferenceCode: explicitPreference,
      },
      teachingStrategy: LEARNING_MODE_CONFIGS[mode.modeCode],
    };
  },
};
