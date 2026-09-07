import sql from "mssql";
import { getPool } from "../config/database.js";
import {
  HISTORY_HIDDEN_INTERACTIONS,
  HISTORY_INDICATOR_LIMIT,
  HISTORY_REPEAT_THRESHOLD,
  HISTORY_TIMELINE_LIMIT,
} from "../config/history.js";
import { INTERACTION_TYPES } from "../config/learningModes.js";
import { MASTERY_WEIGHTS } from "../config/learningPulse.js";
import { escapeLike } from "../services/teacher/teacherMetrics.js";
import type { MasteryRow } from "../types/index.js";

export interface HistorySessionRow {
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
}

export interface HistorySessionStats {
  sessionId: string;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  explanationRequests: number;
  adaptationCount: number;
  masteryReview: boolean;
}

export interface HistoryConceptIndicatorRow {
  sessionId: string;
  conceptId: string;
  name: string;
  importance: number;
  masteryScore: number | null;
  masteryStatus: string | null;
  attemptsCount: number;
}

export interface HistoryActivityRow {
  type: string;
  createdAt: Date;
  conceptName: string | null;
  interactionData: Record<string, unknown> | null;
}

export interface HistoryAdaptationRow {
  reason: string;
  createdAt: Date;
  conceptName: string | null;
  previousModeName: string | null;
  newModeName: string | null;
}

export interface HistoryConceptRow {
  conceptId: string;
  name: string;
}

function bindIds(request: sql.Request, ids: string[], prefix: string): string {
  if (ids.length === 0) return "NULL";
  ids.forEach((id, index) => {
    request.input(`${prefix}${index}`, sql.UniqueIdentifier, id);
  });
  return ids.map((_, index) => `@${prefix}${index}`).join(", ");
}

function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const SESSION_FIELDS = `
  s.SessionId,
  s.MaterialId,
  m.Title,
  s.SessionStatus,
  s.StartedAt,
  s.CompletedAt,
  lm.ModeCode,
  lm.ModeName,
  (SELECT MAX(p.PageNumber) FROM fahm.MaterialPages p WHERE p.MaterialId = m.MaterialId) AS PageNumber,
  (
    SELECT COUNT(*)
    FROM fahm.PageConcepts pc
    INNER JOIN fahm.MaterialPages p ON p.PageId = pc.PageId
    WHERE p.MaterialId = m.MaterialId
  ) AS ConceptCount,
  (
    SELECT TOP 1 c.Subject
    FROM fahm.PageConcepts pc
    INNER JOIN fahm.MaterialPages p ON p.PageId = pc.PageId
    INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = pc.ConceptId
    WHERE p.MaterialId = m.MaterialId
    ORDER BY pc.ImportanceScore DESC
  ) AS Subject
`;

const NEEDS_REVIEW_SQL = `
  EXISTS (
    SELECT 1
    FROM fahm.PageConcepts pc
    INNER JOIN fahm.MaterialPages p ON p.PageId = pc.PageId
    INNER JOIN fahm.StudentConceptMastery scm ON scm.ConceptId = pc.ConceptId
    WHERE p.MaterialId = s.MaterialId
      AND scm.StudentProfileId = @studentProfileId
      AND scm.AttemptsCount > 0
      AND (
        scm.MasteryScore <= @reviewMax
        OR scm.MasteryStatus IN (N'needs_review', N'weak', N'unknown')
      )
  )
  OR (
    SELECT COUNT(*)
    FROM fahm.Questions q
    INNER JOIN fahm.StudentAnswers a ON a.QuestionId = q.QuestionId
    WHERE q.SessionId = s.SessionId
      AND a.StudentProfileId = @studentProfileId
      AND a.IsCorrect = 0
  ) >= @repeatThreshold
  OR (
    SELECT COUNT(*)
    FROM fahm.LearningInteractions i
    WHERE i.SessionId = s.SessionId
      AND i.StudentProfileId = @studentProfileId
      AND i.InteractionType = @explanationType
  ) >= @repeatThreshold
  OR EXISTS (
    SELECT 1
    FROM fahm.AdaptationEvents ae
    WHERE ae.SessionId = s.SessionId
      AND ae.StudentProfileId = @studentProfileId
  )
`;

function mapSession(row: {
  SessionId: string;
  MaterialId: string | null;
  Title: string | null;
  SessionStatus: string;
  StartedAt: Date;
  CompletedAt: Date | null;
  ModeCode: string | null;
  ModeName: string | null;
  PageNumber: number | null;
  ConceptCount: number;
  Subject: string | null;
}): HistorySessionRow {
  return {
    sessionId: String(row.SessionId),
    materialId: row.MaterialId ? String(row.MaterialId) : null,
    title: row.Title?.trim() || "درس بدون عنوان",
    pageNumber: row.PageNumber,
    subject: row.Subject,
    conceptCount: Number(row.ConceptCount ?? 0),
    modeCode: row.ModeCode,
    modeName: row.ModeName,
    status: row.SessionStatus,
    startedAt: row.StartedAt,
    completedAt: row.CompletedAt,
  };
}

function applyListInputs(
  request: sql.Request,
  studentProfileId: string,
  search: string,
): sql.Request {
  request
    .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
    .input("reviewMax", sql.Decimal(5, 2), MASTERY_WEIGHTS.reviewScoreMax)
    .input("repeatThreshold", sql.Int, HISTORY_REPEAT_THRESHOLD)
    .input("explanationType", sql.NVarChar(100), INTERACTION_TYPES.explanationRequested);
  if (search) {
    request.input("search", sql.NVarChar(400), `%${escapeLike(search)}%`);
  }
  return request;
}

function listWhere(search: string, filter: "all" | "needs_review"): string {
  const searchSql = search
    ? `
      AND (
        m.Title LIKE @search
        OR EXISTS (
          SELECT 1
          FROM fahm.PageConcepts pc
          INNER JOIN fahm.MaterialPages p ON p.PageId = pc.PageId
          INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = pc.ConceptId
          WHERE p.MaterialId = m.MaterialId
            AND c.ConceptName LIKE @search
        )
      )
    `
    : "";
  const filterSql = filter === "needs_review" ? `AND (${NEEDS_REVIEW_SQL})` : "";
  return `
    WHERE s.StudentProfileId = @studentProfileId
    ${searchSql}
    ${filterSql}
  `;
}

export const historyRepository = {
  async listPage(
    studentProfileId: string,
    input: { limit: number; offset: number; search: string; filter: "all" | "needs_review" },
  ): Promise<{ items: HistorySessionRow[]; total: number }> {
    const pool = await getPool();
    const where = listWhere(input.search, input.filter);

    const countResult = await applyListInputs(pool.request(), studentProfileId, input.search).query<{
      total: number;
    }>(`
      SELECT COUNT(*) AS total
      FROM fahm.LearningSessions s
      LEFT JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
      ${where}
    `);

    const result = await applyListInputs(pool.request(), studentProfileId, input.search)
      .input("limit", sql.Int, input.limit)
      .input("offset", sql.Int, input.offset)
      .query<{
        SessionId: string;
        MaterialId: string | null;
        Title: string | null;
        SessionStatus: string;
        StartedAt: Date;
        CompletedAt: Date | null;
        ModeCode: string | null;
        ModeName: string | null;
        PageNumber: number | null;
        ConceptCount: number;
        Subject: string | null;
      }>(`
        SELECT ${SESSION_FIELDS}
        FROM fahm.LearningSessions s
        LEFT JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        ${where}
        ORDER BY s.StartedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return {
      items: result.recordset.map(mapSession),
      total: Number(countResult.recordset[0]?.total ?? 0),
    };
  },

  async findOwned(
    sessionId: string,
    studentProfileId: string,
  ): Promise<HistorySessionRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        SessionId: string;
        MaterialId: string | null;
        Title: string | null;
        SessionStatus: string;
        StartedAt: Date;
        CompletedAt: Date | null;
        ModeCode: string | null;
        ModeName: string | null;
        PageNumber: number | null;
        ConceptCount: number;
        Subject: string | null;
      }>(`
        SELECT ${SESSION_FIELDS}
        FROM fahm.LearningSessions s
        LEFT JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE s.SessionId = @sessionId
          AND s.StudentProfileId = @studentProfileId
      `);
    const row = result.recordset[0];
    return row ? mapSession(row) : null;
  },

  async statsForSessions(
    studentProfileId: string,
    sessionIds: string[],
  ): Promise<Map<string, HistorySessionStats>> {
    const map = new Map<string, HistorySessionStats>();
    for (const sessionId of sessionIds) {
      map.set(sessionId, {
        sessionId,
        questionCount: 0,
        answeredCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        explanationRequests: 0,
        adaptationCount: 0,
        masteryReview: false,
      });
    }
    if (sessionIds.length === 0) return map;

    const pool = await getPool();
    const answersReq = pool.request().input("studentProfileId", sql.UniqueIdentifier, studentProfileId);
    const answerIds = bindIds(answersReq, sessionIds, "sid");
    const answers = await answersReq.query<{
      SessionId: string;
      QuestionCount: number;
      AnsweredCount: number;
      CorrectCount: number;
      IncorrectCount: number;
    }>(`
      SELECT
        q.SessionId,
        COUNT(DISTINCT q.QuestionId) AS QuestionCount,
        COUNT(DISTINCT a.AnswerId) AS AnsweredCount,
        SUM(CASE WHEN a.IsCorrect = 1 THEN 1 ELSE 0 END) AS CorrectCount,
        SUM(CASE WHEN a.IsCorrect = 0 THEN 1 ELSE 0 END) AS IncorrectCount
      FROM fahm.Questions q
      LEFT JOIN fahm.StudentAnswers a
        ON a.QuestionId = q.QuestionId
       AND a.StudentProfileId = @studentProfileId
      WHERE q.SessionId IN (${answerIds})
      GROUP BY q.SessionId
    `);
    for (const row of answers.recordset) {
      const current = map.get(String(row.SessionId));
      if (!current) continue;
      current.questionCount = Number(row.QuestionCount ?? 0);
      current.answeredCount = Number(row.AnsweredCount ?? 0);
      current.correctCount = Number(row.CorrectCount ?? 0);
      current.incorrectCount = Number(row.IncorrectCount ?? 0);
    }

    const extraReq = pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("explanationType", sql.NVarChar(100), INTERACTION_TYPES.explanationRequested)
      .input("reviewMax", sql.Decimal(5, 2), MASTERY_WEIGHTS.reviewScoreMax);
    const extraIds = bindIds(extraReq, sessionIds, "xid");
    const extras = await extraReq.query<{
      SessionId: string;
      ExplanationRequests: number;
      AdaptationCount: number;
      MasteryReview: number;
    }>(`
      SELECT
        s.SessionId,
        (
          SELECT COUNT(*)
          FROM fahm.LearningInteractions i
          WHERE i.SessionId = s.SessionId
            AND i.StudentProfileId = @studentProfileId
            AND i.InteractionType = @explanationType
        ) AS ExplanationRequests,
        (
          SELECT COUNT(*)
          FROM fahm.AdaptationEvents ae
          WHERE ae.SessionId = s.SessionId
            AND ae.StudentProfileId = @studentProfileId
        ) AS AdaptationCount,
        CASE WHEN EXISTS (
          SELECT 1
          FROM fahm.PageConcepts pc
          INNER JOIN fahm.MaterialPages p ON p.PageId = pc.PageId
          INNER JOIN fahm.StudentConceptMastery scm ON scm.ConceptId = pc.ConceptId
          WHERE p.MaterialId = s.MaterialId
            AND scm.StudentProfileId = @studentProfileId
            AND scm.AttemptsCount > 0
            AND (
              scm.MasteryScore <= @reviewMax
              OR scm.MasteryStatus IN (N'needs_review', N'weak', N'unknown')
            )
        ) THEN 1 ELSE 0 END AS MasteryReview
      FROM fahm.LearningSessions s
      WHERE s.SessionId IN (${extraIds})
        AND s.StudentProfileId = @studentProfileId
    `);
    for (const row of extras.recordset) {
      const current = map.get(String(row.SessionId));
      if (!current) continue;
      current.explanationRequests = Number(row.ExplanationRequests ?? 0);
      current.adaptationCount = Number(row.AdaptationCount ?? 0);
      current.masteryReview = Number(row.MasteryReview ?? 0) === 1;
    }
    return map;
  },

  async indicatorsForSessions(
    studentProfileId: string,
    sessionIds: string[],
  ): Promise<Map<string, HistoryConceptIndicatorRow[]>> {
    const grouped = new Map<string, HistoryConceptIndicatorRow[]>();
    if (sessionIds.length === 0) return grouped;
    const pool = await getPool();
    const request = pool.request().input("studentProfileId", sql.UniqueIdentifier, studentProfileId);
    const ids = bindIds(request, sessionIds, "ind");
    const result = await request.query<{
      SessionId: string;
      ConceptId: string;
      ConceptName: string;
      ImportanceScore: number | null;
      MasteryScore: number | null;
      MasteryStatus: string | null;
      AttemptsCount: number | null;
    }>(`
      SELECT
        s.SessionId,
        c.ConceptId,
        c.ConceptName,
        CAST(pc.ImportanceScore AS float) AS ImportanceScore,
        CAST(m.MasteryScore AS float) AS MasteryScore,
        m.MasteryStatus,
        m.AttemptsCount
      FROM fahm.LearningSessions s
      INNER JOIN fahm.MaterialPages p ON p.MaterialId = s.MaterialId
      INNER JOIN fahm.PageConcepts pc ON pc.PageId = p.PageId
      INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = pc.ConceptId
      LEFT JOIN fahm.StudentConceptMastery m
        ON m.ConceptId = c.ConceptId
       AND m.StudentProfileId = @studentProfileId
      WHERE s.SessionId IN (${ids})
        AND s.StudentProfileId = @studentProfileId
    `);

    for (const row of result.recordset) {
      const sessionId = String(row.SessionId);
      const list = grouped.get(sessionId) ?? [];
      if (list.some((item) => item.conceptId === String(row.ConceptId))) continue;
      list.push({
        sessionId,
        conceptId: String(row.ConceptId),
        name: row.ConceptName,
        importance: Number(row.ImportanceScore ?? 0),
        masteryScore: row.MasteryScore === null ? null : Number(row.MasteryScore),
        masteryStatus: row.MasteryStatus,
        attemptsCount: Number(row.AttemptsCount ?? 0),
      });
      grouped.set(sessionId, list);
    }
    for (const [sessionId, list] of grouped) {
      list.sort((left, right) => right.importance - left.importance);
      grouped.set(sessionId, list.slice(0, HISTORY_INDICATOR_LIMIT));
    }
    return grouped;
  },

  async variantsForSessions(sessionIds: string[]): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>();
    if (sessionIds.length === 0) return map;
    const pool = await getPool();
    const request = pool
      .request()
      .input("lessonState", sql.NVarChar(100), INTERACTION_TYPES.lessonState);
    const ids = bindIds(request, sessionIds, "var");
    const result = await request.query<{ SessionId: string; InteractionData: string | null }>(`
      SELECT i.SessionId, i.InteractionData
      FROM fahm.LearningInteractions i
      INNER JOIN (
        SELECT SessionId, MAX(CreatedAt) AS LatestAt
        FROM fahm.LearningInteractions
        WHERE SessionId IN (${ids})
          AND InteractionType = @lessonState
        GROUP BY SessionId
      ) latest ON latest.SessionId = i.SessionId AND latest.LatestAt = i.CreatedAt
      WHERE i.InteractionType = @lessonState
    `);
    for (const row of result.recordset) {
      const data = parseJson(row.InteractionData);
      const strategy = data?.strategy;
      const variant =
        strategy && typeof strategy === "object" && typeof (strategy as { variant?: unknown }).variant === "string"
          ? String((strategy as { variant: string }).variant)
          : null;
      map.set(String(row.SessionId), variant);
    }
    return map;
  },

  async listActivities(
    sessionId: string,
    studentProfileId: string,
  ): Promise<HistoryActivityRow[]> {
    const pool = await getPool();
    const request = pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("limit", sql.Int, HISTORY_TIMELINE_LIMIT);
    const hidden = [...HISTORY_HIDDEN_INTERACTIONS];
    const names = hidden.map((type, index) => {
      const key = `hidden${index}`;
      request.input(key, sql.NVarChar(100), type);
      return `@${key}`;
    });
    const hiddenSql = names.length > 0 ? `AND i.InteractionType NOT IN (${names.join(", ")})` : "";
    const result = await request.query<{
      InteractionType: string;
      CreatedAt: Date;
      ConceptName: string | null;
      InteractionData: string | null;
    }>(`
      SELECT TOP (@limit)
        i.InteractionType,
        i.CreatedAt,
        c.ConceptName,
        i.InteractionData
      FROM fahm.LearningInteractions i
      LEFT JOIN fahm.KnowledgeConcepts c ON c.ConceptId = i.ConceptId
      WHERE i.SessionId = @sessionId
        AND i.StudentProfileId = @studentProfileId
        ${hiddenSql}
      ORDER BY i.CreatedAt ASC
    `);
    return result.recordset.map((row) => ({
      type: row.InteractionType,
      createdAt: row.CreatedAt,
      conceptName: row.ConceptName,
      interactionData: parseJson(row.InteractionData),
    }));
  },

  async listConcepts(
    sessionId: string,
    studentProfileId: string,
  ): Promise<HistoryConceptRow[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ ConceptId: string; ConceptName: string }>(`
        SELECT DISTINCT c.ConceptId, c.ConceptName, MAX(pc.ImportanceScore) AS ImportanceScore
        FROM fahm.LearningSessions s
        INNER JOIN fahm.MaterialPages p ON p.MaterialId = s.MaterialId
        INNER JOIN fahm.PageConcepts pc ON pc.PageId = p.PageId
        INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = pc.ConceptId
        WHERE s.SessionId = @sessionId
          AND s.StudentProfileId = @studentProfileId
        GROUP BY c.ConceptId, c.ConceptName
        ORDER BY MAX(pc.ImportanceScore) DESC
      `);
    return result.recordset.map((row) => ({
      conceptId: String(row.ConceptId),
      name: row.ConceptName,
    }));
  },

  async listAdaptations(
    sessionId: string,
    studentProfileId: string,
  ): Promise<HistoryAdaptationRow[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        TriggerReason: string;
        CreatedAt: Date;
        ConceptName: string | null;
        PreviousModeName: string | null;
        NewModeName: string | null;
      }>(`
        SELECT
          a.TriggerReason,
          a.CreatedAt,
          c.ConceptName,
          prev.ModeName AS PreviousModeName,
          next.ModeName AS NewModeName
        FROM fahm.AdaptationEvents a
        LEFT JOIN fahm.KnowledgeConcepts c ON c.ConceptId = a.ConceptId
        LEFT JOIN fahm.LearningModes prev ON prev.LearningModeId = a.PreviousModeId
        LEFT JOIN fahm.LearningModes next ON next.LearningModeId = a.NewModeId
        WHERE a.SessionId = @sessionId
          AND a.StudentProfileId = @studentProfileId
        ORDER BY a.CreatedAt ASC
      `);
    return result.recordset.map((row) => ({
      reason: row.TriggerReason,
      createdAt: row.CreatedAt,
      conceptName: row.ConceptName,
      previousModeName: row.PreviousModeName,
      newModeName: row.NewModeName,
    }));
  },

  async masteryForConcepts(
    studentProfileId: string,
    conceptIds: string[],
  ): Promise<MasteryRow[]> {
    if (conceptIds.length === 0) return [];
    const pool = await getPool();
    const request = pool.request().input("studentProfileId", sql.UniqueIdentifier, studentProfileId);
    const ids = bindIds(request, conceptIds, "cid");
    const result = await request.query<{
      ConceptId: string;
      ConceptName: string;
      Subject: string | null;
      MasteryScore: number;
      MasteryStatus: string;
      AttemptsCount: number;
      CorrectAnswers: number;
      IncorrectAnswers: number;
      ExplanationCount: number;
      LastInteractionAt: Date | null;
    }>(`
      SELECT
        m.ConceptId,
        c.ConceptName,
        c.Subject,
        CAST(m.MasteryScore AS float) AS MasteryScore,
        m.MasteryStatus,
        m.AttemptsCount,
        m.CorrectAnswers,
        m.IncorrectAnswers,
        m.ExplanationCount,
        m.LastInteractionAt
      FROM fahm.StudentConceptMastery m
      INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = m.ConceptId
      WHERE m.StudentProfileId = @studentProfileId
        AND m.ConceptId IN (${ids})
    `);
    return result.recordset.map((row) => ({
      conceptId: String(row.ConceptId),
      conceptName: row.ConceptName,
      subject: row.Subject,
      masteryScore: Number(row.MasteryScore),
      masteryStatus: row.MasteryStatus,
      attemptsCount: row.AttemptsCount,
      correctAnswers: row.CorrectAnswers,
      incorrectAnswers: row.IncorrectAnswers,
      explanationCount: row.ExplanationCount,
      lastInteractionAt: row.LastInteractionAt,
    }));
  },
};
