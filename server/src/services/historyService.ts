import { HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT } from "../config/limits.js";
import { HISTORY_NOT_FOUND } from "../config/history.js";
import { historyRepository } from "../repositories/historyRepository.js";
import type { AuthUser } from "../types/index.js";
import type {
  HistoryFilter,
  HistoryIndicator,
  HistoryListItem,
  HistoryListResult,
  HistorySessionDetail,
} from "../types/history.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { computeOverallPulse } from "./masteryCalculationService.js";
import {
  activityLabel,
  conceptSummaryFrom,
  durationFromTimestamps,
  historyRecommendation,
  parseAnswerCorrectness,
  progressRatio,
  resolveHistoryPaging,
  sessionNeedsReview,
  teachingVariantLabel,
} from "./history/historyLogic.js";
import { assessedMastery } from "./teacher/teacherMetrics.js";

function requireStudent(user: AuthUser): string {
  if (!user.studentProfileId) {
    throw new ForbiddenError("لا يوجد ملف تعلم مرتبط بهذا الحساب.");
  }
  return user.studentProfileId;
}

function indicatorFrom(row: {
  conceptId: string;
  name: string;
  masteryScore: number | null;
  masteryStatus: string | null;
  attemptsCount: number;
}): HistoryIndicator {
  const summary = conceptSummaryFrom(
    row.masteryScore == null
      ? undefined
      : {
          conceptId: row.conceptId,
          conceptName: row.name,
          subject: null,
          masteryScore: row.masteryScore,
          masteryStatus: row.masteryStatus ?? "unknown",
          attemptsCount: row.attemptsCount,
          correctAnswers: 0,
          incorrectAnswers: 0,
          explanationCount: 0,
          lastInteractionAt: null,
        },
    row.conceptId,
    row.name,
  );
  return {
    conceptId: summary.conceptId,
    name: summary.name,
    status: summary.status,
    label: summary.masteryLabel,
  };
}

function toListItem(
  session: {
    sessionId: string;
    materialId: string | null;
    title: string;
    pageNumber: number | null;
    subject: string | null;
    conceptCount: number;
    modeCode: string | null;
    modeName: string | null;
    status: string;
    startedAt: Date;
    completedAt: Date | null;
  },
  stats: {
    questionCount: number;
    answeredCount: number;
    correctCount: number;
    incorrectCount: number;
    explanationRequests: number;
    adaptationCount: number;
    masteryReview: boolean;
  },
  indicatorRows: Array<{
    conceptId: string;
    name: string;
    masteryScore: number | null;
    masteryStatus: string | null;
    attemptsCount: number;
  }>,
  variant: string | null,
): HistoryListItem {
  const indicators = indicatorRows.map(indicatorFrom);
  return {
    id: session.sessionId,
    sessionId: session.sessionId,
    materialId: session.materialId,
    title: session.title,
    pageNumber: session.pageNumber,
    subject: session.subject,
    conceptCount: session.conceptCount,
    modeCode: session.modeCode,
    modeName: session.modeName,
    status: session.status,
    lastAccessedAt: new Date(session.startedAt).toISOString(),
    startedAt: new Date(session.startedAt).toISOString(),
    completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
    durationSeconds: durationFromTimestamps(session.startedAt, session.completedAt),
    mode: session.modeCode,
    variant,
    variantLabel: teachingVariantLabel(variant),
    progress: progressRatio(stats.answeredCount, stats.questionCount),
    questionCount: stats.questionCount,
    answeredCount: stats.answeredCount,
    correctCount: stats.correctCount,
    needsReview:
      stats.masteryReview ||
      sessionNeedsReview({
        mastery: [],
        incorrectAnswers: stats.incorrectCount,
        explanationRequests: stats.explanationRequests,
        adaptationCount: stats.adaptationCount,
      }),
    indicators,
  };
}

async function enrichSessions(
  studentProfileId: string,
  sessions: Awaited<ReturnType<typeof historyRepository.listPage>>["items"],
): Promise<HistoryListItem[]> {
  const sessionIds = sessions.map((item) => item.sessionId);
  const [statsMap, indicatorMap, variantMap] = await Promise.all([
    historyRepository.statsForSessions(studentProfileId, sessionIds),
    historyRepository.indicatorsForSessions(studentProfileId, sessionIds),
    historyRepository.variantsForSessions(sessionIds),
  ]);
  return sessions.map((session) => {
    const stats = statsMap.get(session.sessionId) ?? {
      sessionId: session.sessionId,
      questionCount: 0,
      answeredCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      explanationRequests: 0,
      adaptationCount: 0,
      masteryReview: false,
    };
    return toListItem(
      session,
      stats,
      indicatorMap.get(session.sessionId) ?? [],
      variantMap.get(session.sessionId) ?? null,
    );
  });
}

export const historyService = {
  async list(
    user: AuthUser,
    query: {
      page?: number;
      pageSize?: number;
      limit?: number;
      offset?: number;
      search?: string;
      filter?: HistoryFilter;
    } = {},
  ): Promise<HistoryListResult> {
    const studentProfileId = requireStudent(user);
    const paging = resolveHistoryPaging({
      page: query.page,
      pageSize: query.pageSize,
      limit: query.limit,
      offset: query.offset,
      defaultSize: HISTORY_DEFAULT_LIMIT,
      maxSize: HISTORY_MAX_LIMIT,
    });
    const search = query.search?.trim() ?? "";
    const filter = query.filter ?? "all";
    const result = await historyRepository.listPage(studentProfileId, {
      limit: paging.pageSize,
      offset: paging.offset,
      search,
      filter,
    });
    const items = await enrichSessions(studentProfileId, result.items);
    return {
      items,
      total: result.total,
      pagination: {
        page: paging.page,
        pageSize: paging.pageSize,
        total: result.total,
        hasNext: paging.offset + items.length < result.total,
      },
    };
  },

  async get(user: AuthUser, sessionId: string): Promise<HistorySessionDetail> {
    const studentProfileId = requireStudent(user);
    const session = await historyRepository.findOwned(sessionId, studentProfileId);
    if (!session) throw new NotFoundError(HISTORY_NOT_FOUND);

    const [items, activityRows, conceptRows, adaptationRows] = await Promise.all([
      enrichSessions(studentProfileId, [session]),
      historyRepository.listActivities(session.sessionId, studentProfileId),
      historyRepository.listConcepts(session.sessionId, studentProfileId),
      historyRepository.listAdaptations(session.sessionId, studentProfileId),
    ]);
    const item = items[0];
    if (!item) throw new NotFoundError(HISTORY_NOT_FOUND);

    const mastery = await historyRepository.masteryForConcepts(
      studentProfileId,
      conceptRows.map((row) => row.conceptId),
    );
    const byId = new Map(mastery.map((row) => [row.conceptId, row]));
    const concepts = conceptRows.map((row) => conceptSummaryFrom(byId.get(row.conceptId), row.conceptId, row.name));
    const assessed = assessedMastery(mastery);
    const pulse = computeOverallPulse(assessed);

    const activities = activityRows.flatMap((row, index) => {
      const label = activityLabel(row.type, parseAnswerCorrectness(row.interactionData));
      if (!label) return [];
      return [
        {
          id: `${row.type}-${new Date(row.createdAt).toISOString()}-${index}`,
          type: row.type,
          label,
          at: new Date(row.createdAt).toISOString(),
          conceptName: row.conceptName,
        },
      ];
    });

    return {
      session: item,
      material: {
        materialId: item.materialId,
        title: item.title,
        pageNumber: item.pageNumber,
      },
      activities,
      answers: {
        questionCount: item.questionCount,
        answeredCount: item.answeredCount,
        correctCount: item.correctCount,
        incorrectCount: Math.max(item.answeredCount - item.correctCount, 0),
        accuracy:
          item.answeredCount > 0 ? Math.round((item.correctCount / item.answeredCount) * 100) : null,
      },
      concepts,
      adaptations: adaptationRows.map((row) => ({
        fromLabel: row.previousModeName,
        toLabel: row.newModeName,
        reason: row.reason,
        at: new Date(row.createdAt).toISOString(),
        conceptName: row.conceptName,
      })),
      recommendation: historyRecommendation(concepts),
      pulse: pulse ? { score: pulse.score, status: pulse.status } : null,
    };
  },
};
