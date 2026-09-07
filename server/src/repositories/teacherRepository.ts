import sql from "mssql";
import { getPool } from "../config/database.js";
import { EXPLANATION_REQUEST_TYPES } from "../config/teacher.js";
import { escapeLike } from "../services/teacher/teacherMetrics.js";
import type { MasteryRow } from "../types/index.js";

export interface TeacherProfileRow {
  teacherProfileId: string;
  schoolName: string | null;
  subject: string | null;
}

export interface AssignedStudentRow {
  studentProfileId: string;
  name: string;
  gradeLevel: string | null;
  defaultMode: string | null;
  defaultModeName: string | null;
}

export interface TeacherMasteryRow extends MasteryRow {
  studentProfileId: string;
}

export interface TeacherSessionRow {
  studentProfileId: string;
  sessionId: string;
  materialId: string | null;
  title: string | null;
  sessionStatus: string;
  completedAt: Date | null;
  startedAt: Date;
  modeCode: string | null;
  modeName: string | null;
}

function bindIds(request: sql.Request, ids: string[], prefix: string): string {
  if (ids.length === 0) return "NULL";
  ids.forEach((id, index) => {
    request.input(`${prefix}${index}`, sql.UniqueIdentifier, id);
  });
  return ids.map((_, index) => `@${prefix}${index}`).join(", ");
}

export const teacherRepository = {
  async findProfile(userId: string): Promise<TeacherProfileRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .query<{ TeacherProfileId: string; SchoolName: string | null; Subject: string | null }>(`
        SELECT TeacherProfileId, SchoolName, Subject
        FROM fahm.TeacherProfiles
        WHERE UserId = @userId
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      teacherProfileId: String(row.TeacherProfileId),
      schoolName: row.SchoolName,
      subject: row.Subject,
    };
  },

  async listAssignedStudents(teacherProfileId: string, search?: string | null): Promise<AssignedStudentRow[]> {
    const pool = await getPool();
    const request = pool.request().input("teacherProfileId", sql.UniqueIdentifier, teacherProfileId);
    const like = search ? `%${escapeLike(search)}%` : null;
    if (like) request.input("search", sql.NVarChar(200), like);
    const result = await request.query<{
      StudentProfileId: string;
      DisplayName: string | null;
      FirstName: string;
      LastName: string | null;
      GradeLevel: string | null;
      DefaultLearningMode: string | null;
      ModeName: string | null;
    }>(`
      SELECT
        sp.StudentProfileId,
        u.DisplayName,
        u.FirstName,
        u.LastName,
        sp.GradeLevel,
        sp.DefaultLearningMode,
        lm.ModeName
      FROM fahm.TeacherStudents ts
      INNER JOIN fahm.StudentProfiles sp ON sp.StudentProfileId = ts.StudentProfileId
      INNER JOIN fahm.Users u ON u.UserId = sp.UserId
      LEFT JOIN fahm.LearningModes lm ON lm.ModeCode = sp.DefaultLearningMode AND lm.IsActive = 1
      WHERE ts.TeacherProfileId = @teacherProfileId
        AND ts.IsActive = 1
        ${like ? "AND (u.DisplayName LIKE @search OR u.FirstName LIKE @search OR u.LastName LIKE @search)" : ""}
      ORDER BY u.FirstName, u.LastName
    `);
    return result.recordset.map((row) => ({
      studentProfileId: String(row.StudentProfileId),
      name: (row.DisplayName?.trim() || [row.FirstName, row.LastName].filter(Boolean).join(" ")).trim(),
      gradeLevel: row.GradeLevel,
      defaultMode: row.DefaultLearningMode,
      defaultModeName: row.ModeName,
    }));
  },

  async isAssigned(teacherProfileId: string, studentProfileId: string): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("teacherProfileId", sql.UniqueIdentifier, teacherProfileId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ Ok: number }>(`
        SELECT 1 AS Ok
        FROM fahm.TeacherStudents
        WHERE TeacherProfileId = @teacherProfileId
          AND StudentProfileId = @studentProfileId
          AND IsActive = 1
      `);
    return Boolean(result.recordset[0]);
  },

  async listMastery(studentIds: string[]): Promise<TeacherMasteryRow[]> {
    if (studentIds.length === 0) return [];
    const pool = await getPool();
    const request = pool.request();
    const list = bindIds(request, studentIds, "s");
    const result = await request.query<{
      StudentProfileId: string;
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
        m.StudentProfileId,
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
      WHERE m.StudentProfileId IN (${list})
    `);
    return result.recordset.map((row) => ({
      studentProfileId: String(row.StudentProfileId),
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

  async listSessions(studentIds: string[]): Promise<TeacherSessionRow[]> {
    if (studentIds.length === 0) return [];
    const pool = await getPool();
    const request = pool.request();
    const list = bindIds(request, studentIds, "s");
    const result = await request.query<{
      StudentProfileId: string;
      SessionId: string;
      MaterialId: string | null;
      Title: string | null;
      SessionStatus: string;
      CompletedAt: Date | null;
      StartedAt: Date;
      ModeCode: string | null;
      ModeName: string | null;
    }>(`
      SELECT
        s.StudentProfileId,
        s.SessionId,
        s.MaterialId,
        mat.Title,
        s.SessionStatus,
        s.CompletedAt,
        s.StartedAt,
        lm.ModeCode,
        lm.ModeName
      FROM fahm.LearningSessions s
      LEFT JOIN fahm.LearningMaterials mat ON mat.MaterialId = s.MaterialId
      LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
      WHERE s.StudentProfileId IN (${list})
    `);
    return result.recordset.map((row) => ({
      studentProfileId: String(row.StudentProfileId),
      sessionId: String(row.SessionId),
      materialId: row.MaterialId ? String(row.MaterialId) : null,
      title: row.Title,
      sessionStatus: row.SessionStatus,
      completedAt: row.CompletedAt,
      startedAt: row.StartedAt,
      modeCode: row.ModeCode,
      modeName: row.ModeName,
    }));
  },

  async countExplanationRequests(studentIds: string[], from: Date): Promise<number> {
    if (studentIds.length === 0) return 0;
    const pool = await getPool();
    const request = pool.request().input("from", sql.DateTime2, from);
    const list = bindIds(request, studentIds, "s");
    EXPLANATION_REQUEST_TYPES.forEach((type, index) => {
      request.input(`t${index}`, sql.NVarChar(100), type);
    });
    const types = EXPLANATION_REQUEST_TYPES.map((_, index) => `@t${index}`).join(", ");
    const result = await request.query<{ Cnt: number }>(`
      SELECT COUNT(*) AS Cnt
      FROM fahm.LearningInteractions
      WHERE StudentProfileId IN (${list})
        AND CreatedAt >= @from
        AND InteractionType IN (${types})
    `);
    return Number(result.recordset[0]?.Cnt ?? 0);
  },

  async explanationByConcept(studentIds: string[], from: Date): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (studentIds.length === 0) return map;
    const pool = await getPool();
    const request = pool.request().input("from", sql.DateTime2, from);
    const list = bindIds(request, studentIds, "s");
    EXPLANATION_REQUEST_TYPES.forEach((type, index) => {
      request.input(`t${index}`, sql.NVarChar(100), type);
    });
    const types = EXPLANATION_REQUEST_TYPES.map((_, index) => `@t${index}`).join(", ");
    const result = await request.query<{ ConceptId: string; Cnt: number }>(`
      SELECT ConceptId, COUNT(*) AS Cnt
      FROM fahm.LearningInteractions
      WHERE StudentProfileId IN (${list})
        AND CreatedAt >= @from
        AND ConceptId IS NOT NULL
        AND InteractionType IN (${types})
      GROUP BY ConceptId
    `);
    for (const row of result.recordset) map.set(String(row.ConceptId), Number(row.Cnt));
    return map;
  },

  async adaptationsByConcept(studentIds: string[], from: Date): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (studentIds.length === 0) return map;
    const pool = await getPool();
    const request = pool.request().input("from", sql.DateTime2, from);
    const list = bindIds(request, studentIds, "s");
    const result = await request.query<{ ConceptId: string; Cnt: number }>(`
      SELECT ConceptId, COUNT(*) AS Cnt
      FROM fahm.AdaptationEvents
      WHERE StudentProfileId IN (${list})
        AND CreatedAt >= @from
        AND ConceptId IS NOT NULL
      GROUP BY ConceptId
    `);
    for (const row of result.recordset) map.set(String(row.ConceptId), Number(row.Cnt));
    return map;
  },

  async listConceptsForMaterials(materialIds: string[]): Promise<Array<{
    conceptId: string;
    name: string;
    importance: number;
    materialId: string;
    title: string;
  }>> {
    if (materialIds.length === 0) return [];
    const pool = await getPool();
    const request = pool.request();
    const list = bindIds(request, materialIds, "m");
    const result = await request.query<{
      ConceptId: string;
      ConceptName: string;
      ImportanceScore: number | null;
      MaterialId: string;
      Title: string | null;
    }>(`
      SELECT
        c.ConceptId,
        c.ConceptName,
        CAST(pc.ImportanceScore AS float) AS ImportanceScore,
        mat.MaterialId,
        mat.Title
      FROM fahm.PageConcepts pc
      INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = pc.ConceptId
      INNER JOIN fahm.MaterialPages p ON p.PageId = pc.PageId
      INNER JOIN fahm.LearningMaterials mat ON mat.MaterialId = p.MaterialId
      WHERE mat.MaterialId IN (${list})
    `);
    return result.recordset.map((row) => ({
      conceptId: String(row.ConceptId),
      name: row.ConceptName,
      importance: Number(row.ImportanceScore ?? 0),
      materialId: String(row.MaterialId),
      title: row.Title?.trim() || "درس",
    }));
  },

  async latestActivity(studentIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>();
    if (studentIds.length === 0) return map;
    const pool = await getPool();
    const request = pool.request();
    const list = bindIds(request, studentIds, "s");
    const result = await request.query<{ StudentProfileId: string; LastAt: Date }>(`
      SELECT StudentProfileId, MAX(LastAt) AS LastAt
      FROM (
        SELECT StudentProfileId, StartedAt AS LastAt FROM fahm.LearningSessions WHERE StudentProfileId IN (${list})
        UNION ALL
        SELECT StudentProfileId, CreatedAt FROM fahm.LearningInteractions WHERE StudentProfileId IN (${list})
        UNION ALL
        SELECT StudentProfileId, LastInteractionAt FROM fahm.StudentConceptMastery
        WHERE StudentProfileId IN (${list}) AND LastInteractionAt IS NOT NULL
      ) x
      GROUP BY StudentProfileId
    `);
    for (const row of result.recordset) map.set(String(row.StudentProfileId), row.LastAt);
    return map;
  },

  async listRecentAnswers(studentProfileId: string): Promise<Array<{
    answeredAt: Date;
    isCorrect: boolean | null;
    conceptName: string | null;
  }>> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ CreatedAt: Date; IsCorrect: boolean | null; ConceptName: string | null }>(`
        SELECT TOP 10 a.CreatedAt, a.IsCorrect, c.ConceptName
        FROM fahm.StudentAnswers a
        INNER JOIN fahm.Questions q ON q.QuestionId = a.QuestionId
        LEFT JOIN fahm.KnowledgeConcepts c ON c.ConceptId = q.ConceptId
        WHERE a.StudentProfileId = @studentProfileId
        ORDER BY a.CreatedAt DESC
      `);
    return result.recordset.map((row) => ({
      answeredAt: row.CreatedAt,
      isCorrect: row.IsCorrect,
      conceptName: row.ConceptName,
    }));
  },

  async listRecentInteractions(studentProfileId: string): Promise<Array<{
    type: string;
    createdAt: Date;
    conceptName: string | null;
  }>> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ InteractionType: string; CreatedAt: Date; ConceptName: string | null }>(`
        SELECT TOP 12 i.InteractionType, i.CreatedAt, c.ConceptName
        FROM fahm.LearningInteractions i
        LEFT JOIN fahm.KnowledgeConcepts c ON c.ConceptId = i.ConceptId
        WHERE i.StudentProfileId = @studentProfileId
          AND i.InteractionType <> N'lesson_state'
        ORDER BY i.CreatedAt DESC
      `);
    return result.recordset.map((row) => ({
      type: row.InteractionType,
      createdAt: row.CreatedAt,
      conceptName: row.ConceptName,
    }));
  },

  async listAdaptations(studentProfileId: string): Promise<Array<{
    reason: string;
    createdAt: Date;
    conceptName: string | null;
  }>> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ TriggerReason: string; CreatedAt: Date; ConceptName: string | null }>(`
        SELECT TOP 8 a.TriggerReason, a.CreatedAt, c.ConceptName
        FROM fahm.AdaptationEvents a
        LEFT JOIN fahm.KnowledgeConcepts c ON c.ConceptId = a.ConceptId
        WHERE a.StudentProfileId = @studentProfileId
        ORDER BY a.CreatedAt DESC
      `);
    return result.recordset.map((row) => ({
      reason: row.TriggerReason,
      createdAt: row.CreatedAt,
      conceptName: row.ConceptName,
    }));
  },
};
