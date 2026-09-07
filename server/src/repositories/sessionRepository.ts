import sql from "mssql";
import { getPool, withTransaction } from "../config/database.js";
import {
  DASHBOARD_RECENT_LESSON_LIMIT,
  HISTORY_MAX_LIMIT,
} from "../config/limits.js";
import type { ContinueLearning, RecentLesson } from "../types/index.js";

interface SessionRow {
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
  StoppedAtConcept: string | null;
}

function toRecent(row: SessionRow): RecentLesson {
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
    lastAccessedAt: new Date(row.StartedAt).toISOString(),
  };
}

const SESSION_SELECT = `
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
  ) AS Subject,
  (
    SELECT TOP 1 c.ConceptName
    FROM fahm.LearningInteractions i
    INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = i.ConceptId
    WHERE i.SessionId = s.SessionId
    ORDER BY i.CreatedAt DESC
  ) AS StoppedAtConcept
`;

export const sessionRepository = {
  async findIncomplete(
    studentProfileId: string,
  ): Promise<ContinueLearning | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<SessionRow>(`
        SELECT TOP 1 ${SESSION_SELECT}
        FROM fahm.LearningSessions s
        LEFT JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE s.StudentProfileId = @studentProfileId
          AND s.CompletedAt IS NULL
          AND s.SessionStatus <> N'completed'
        ORDER BY s.StartedAt DESC
      `);

    const row = result.recordset[0];
    if (!row) return null;
    return {
      sessionId: String(row.SessionId),
      materialId: row.MaterialId ? String(row.MaterialId) : null,
      title: row.Title?.trim() || "درس بدون عنوان",
      pageNumber: row.PageNumber,
      stoppedAtConcept: row.StoppedAtConcept,
      conceptCount: Number(row.ConceptCount ?? 0),
      modeCode: row.ModeCode,
      modeName: row.ModeName,
    };
  },

  async listRecent(
    studentProfileId: string,
    limit = DASHBOARD_RECENT_LESSON_LIMIT,
  ): Promise<RecentLesson[]> {
    const pool = await getPool();
    const safeLimit = Math.min(Math.max(limit, 1), HISTORY_MAX_LIMIT);
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("limit", sql.Int, safeLimit)
      .query<SessionRow>(`
        SELECT TOP (@limit) ${SESSION_SELECT}
        FROM fahm.LearningSessions s
        LEFT JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE s.StudentProfileId = @studentProfileId
        ORDER BY s.StartedAt DESC
      `);
    return result.recordset.map(toRecent);
  },

  async listHistory(
    studentProfileId: string,
    limit: number,
    offset: number,
  ): Promise<{ items: RecentLesson[]; total: number }> {
    const pool = await getPool();
    const safeLimit = Math.min(Math.max(limit, 1), HISTORY_MAX_LIMIT);
    const safeOffset = Math.max(offset, 0);

    const countResult = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ total: number }>(`
        SELECT COUNT(*) AS total
        FROM fahm.LearningSessions
        WHERE StudentProfileId = @studentProfileId
      `);

    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("limit", sql.Int, safeLimit)
      .input("offset", sql.Int, safeOffset)
      .query<SessionRow>(`
        SELECT ${SESSION_SELECT}
        FROM fahm.LearningSessions s
        LEFT JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE s.StudentProfileId = @studentProfileId
        ORDER BY s.StartedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return {
      items: result.recordset.map(toRecent),
      total: Number(countResult.recordset[0]?.total ?? 0),
    };
  },

  async belongsToStudent(
    sessionId: string,
    studentProfileId: string,
  ): Promise<boolean> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ found: number }>(`
        SELECT CASE WHEN EXISTS (
          SELECT 1 FROM fahm.LearningSessions
          WHERE SessionId = @sessionId AND StudentProfileId = @studentProfileId
        ) THEN 1 ELSE 0 END AS found
      `);
    return result.recordset[0]?.found === 1;
  },

  async findIncompleteForMaterial(
    studentProfileId: string,
    materialId: string,
  ): Promise<{
    sessionId: string;
    learningModeId: number | null;
    modeCode: string | null;
    modeName: string | null;
    sessionStatus: string;
  } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("materialId", sql.UniqueIdentifier, materialId)
      .query<{
        SessionId: string;
        LearningModeId: number | null;
        ModeCode: string | null;
        ModeName: string | null;
        SessionStatus: string;
      }>(`
        SELECT TOP 1
          s.SessionId,
          s.LearningModeId,
          lm.ModeCode,
          lm.ModeName,
          s.SessionStatus
        FROM fahm.LearningSessions s
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE s.StudentProfileId = @studentProfileId
          AND s.MaterialId = @materialId
          AND s.CompletedAt IS NULL
          AND s.SessionStatus <> N'completed'
        ORDER BY s.StartedAt DESC
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      sessionId: String(row.SessionId),
      learningModeId: row.LearningModeId,
      modeCode: row.ModeCode,
      modeName: row.ModeName,
      sessionStatus: row.SessionStatus,
    };
  },

  async create(input: {
    studentProfileId: string;
    materialId: string;
    learningModeId: number;
  }): Promise<string> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
      .input("materialId", sql.UniqueIdentifier, input.materialId)
      .input("learningModeId", sql.Int, input.learningModeId)
      .query<{ SessionId: string }>(`
        INSERT INTO fahm.LearningSessions
          (StudentProfileId, MaterialId, LearningModeId, SessionStatus)
        OUTPUT INSERTED.SessionId
        VALUES
          (@studentProfileId, @materialId, @learningModeId, N'active')
      `);
    return String(result.recordset[0].SessionId);
  },

  async resumeOrCreate(input: {
    studentProfileId: string;
    materialId: string;
    learningModeId: number;
  }): Promise<{ sessionId: string; created: boolean }> {
    return withTransaction(async (_tx, request) => {
      const existing = await request()
        .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
        .input("materialId", sql.UniqueIdentifier, input.materialId)
        .query<{ SessionId: string }>(`
          SELECT TOP 1 SessionId
          FROM fahm.LearningSessions
          WHERE StudentProfileId = @studentProfileId
            AND MaterialId = @materialId
            AND CompletedAt IS NULL
            AND SessionStatus <> N'completed'
          ORDER BY StartedAt DESC
        `);

      const current = existing.recordset[0];
      if (current) {
        await request()
          .input("sessionId", sql.UniqueIdentifier, current.SessionId)
          .input("learningModeId", sql.Int, input.learningModeId)
          .query(`
            UPDATE fahm.LearningSessions
            SET LearningModeId = @learningModeId
            WHERE SessionId = @sessionId
          `);
        return { sessionId: String(current.SessionId), created: false };
      }

      const created = await request()
        .input("createStudentId", sql.UniqueIdentifier, input.studentProfileId)
        .input("createMaterialId", sql.UniqueIdentifier, input.materialId)
        .input("createModeId", sql.Int, input.learningModeId)
        .query<{ SessionId: string }>(`
          INSERT INTO fahm.LearningSessions
            (StudentProfileId, MaterialId, LearningModeId, SessionStatus)
          OUTPUT INSERTED.SessionId
          VALUES
            (@createStudentId, @createMaterialId, @createModeId, N'active')
        `);
      return { sessionId: String(created.recordset[0].SessionId), created: true };
    });
  },

  async findOwnedLesson(
    sessionId: string,
    studentProfileId: string,
  ): Promise<{
    sessionId: string;
    studentProfileId: string;
    materialId: string;
    learningModeId: number | null;
    sessionStatus: string;
    completedAt: Date | null;
    title: string | null;
    fileUrl: string | null;
    mimeType: string | null;
    materialType: string;
    pageId: string;
    pageNumber: number;
    imageUrl: string | null;
    originalText: string | null;
    modeCode: string | null;
    modeName: string | null;
  } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        SessionId: string;
        StudentProfileId: string;
        MaterialId: string;
        LearningModeId: number | null;
        SessionStatus: string;
        CompletedAt: Date | null;
        Title: string | null;
        FileUrl: string | null;
        MimeType: string | null;
        MaterialType: string;
        PageId: string;
        PageNumber: number;
        ImageUrl: string | null;
        OriginalText: string | null;
        ModeCode: string | null;
        ModeName: string | null;
      }>(`
        SELECT TOP 1
          s.SessionId,
          s.StudentProfileId,
          s.MaterialId,
          s.LearningModeId,
          s.SessionStatus,
          s.CompletedAt,
          m.Title,
          m.FileUrl,
          m.MimeType,
          m.MaterialType,
          p.PageId,
          p.PageNumber,
          p.ImageUrl,
          p.OriginalText,
          lm.ModeCode,
          lm.ModeName
        FROM fahm.LearningSessions s
        INNER JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
        INNER JOIN fahm.MaterialPages p ON p.MaterialId = m.MaterialId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE s.SessionId = @sessionId
          AND s.StudentProfileId = @studentProfileId
        ORDER BY p.PageNumber ASC
      `);
    const row = result.recordset[0];
    if (!row || !row.MaterialId) return null;
    return {
      sessionId: String(row.SessionId),
      studentProfileId: String(row.StudentProfileId),
      materialId: String(row.MaterialId),
      learningModeId: row.LearningModeId,
      sessionStatus: row.SessionStatus,
      completedAt: row.CompletedAt,
      title: row.Title,
      fileUrl: row.FileUrl,
      mimeType: row.MimeType,
      materialType: row.MaterialType,
      pageId: String(row.PageId),
      pageNumber: row.PageNumber,
      imageUrl: row.ImageUrl,
      originalText: row.OriginalText,
      modeCode: row.ModeCode,
      modeName: row.ModeName,
    };
  },

  async markCompleted(sessionId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .query(`
        UPDATE fahm.LearningSessions
        SET SessionStatus = N'completed',
            CompletedAt = SYSUTCDATETIME()
        WHERE SessionId = @sessionId
          AND CompletedAt IS NULL
      `);
  },

  async updateMode(sessionId: string, learningModeId: number): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("learningModeId", sql.Int, learningModeId)
      .query(`
        UPDATE fahm.LearningSessions
        SET LearningModeId = @learningModeId
        WHERE SessionId = @sessionId
      `);
  },
};
