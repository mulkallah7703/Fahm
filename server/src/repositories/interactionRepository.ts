import sql from "mssql";
import { getPool } from "../config/database.js";
import { INTERACTION_TYPES } from "../config/learningModes.js";

export interface InteractionInsert {
  sessionId: string;
  studentProfileId: string;
  interactionType: string;
  conceptId?: string | null;
  interactionData?: Record<string, unknown> | null;
  durationSeconds?: number | null;
}

export const interactionRepository = {
  async insert(input: InteractionInsert): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, input.sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
      .input("interactionType", sql.NVarChar(100), input.interactionType)
      .input("conceptId", sql.UniqueIdentifier, input.conceptId ?? null)
      .input(
        "interactionData",
        sql.NVarChar(sql.MAX),
        input.interactionData ? JSON.stringify(input.interactionData) : null,
      )
      .input("durationSeconds", sql.Int, input.durationSeconds ?? null)
      .query(`
        INSERT INTO fahm.LearningInteractions
          (SessionId, StudentProfileId, InteractionType, ConceptId, InteractionData, DurationSeconds)
        VALUES
          (@sessionId, @studentProfileId, @interactionType, @conceptId, @interactionData, @durationSeconds)
      `);
  },

  async latestSessionPreference(sessionId: string): Promise<{
    modeCode: string | null;
    adaptiveEnabled: boolean | null;
  } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("modeSelection", sql.NVarChar(100), INTERACTION_TYPES.modeSelection)
      .input("adaptivePreference", sql.NVarChar(100), INTERACTION_TYPES.adaptivePreference)
      .query<{ InteractionData: string | null }>(`
        SELECT TOP 1 InteractionData
        FROM fahm.LearningInteractions
        WHERE SessionId = @sessionId
          AND InteractionType IN (@modeSelection, @adaptivePreference)
        ORDER BY CreatedAt DESC
      `);

    const raw = result.recordset[0]?.InteractionData;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        modeCode?: unknown;
        adaptiveEnabled?: unknown;
      };
      return {
        modeCode: typeof parsed.modeCode === "string" ? parsed.modeCode : null,
        adaptiveEnabled:
          typeof parsed.adaptiveEnabled === "boolean" ? parsed.adaptiveEnabled : null,
      };
    } catch {
      return null;
    }
  },

  async latestByType(sessionId: string, interactionType: string): Promise<{
    interactionData: Record<string, unknown> | null;
    createdAt: Date;
  } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("interactionType", sql.NVarChar(100), interactionType)
      .query<{ InteractionData: string | null; CreatedAt: Date }>(`
        SELECT TOP 1 InteractionData, CreatedAt
        FROM fahm.LearningInteractions
        WHERE SessionId = @sessionId AND InteractionType = @interactionType
        ORDER BY CreatedAt DESC
      `);
    const row = result.recordset[0];
    if (!row) return null;
    let data: Record<string, unknown> | null = null;
    if (row.InteractionData) {
      try {
        data = JSON.parse(row.InteractionData) as Record<string, unknown>;
      } catch {
        data = null;
      }
    }
    return { interactionData: data, createdAt: row.CreatedAt };
  },

  async countTypes(
    sessionId: string,
    studentProfileId: string,
    types: string[],
  ): Promise<Record<string, number>> {
    if (types.length === 0) return {};
    const pool = await getPool();
    const request = pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId);
    const names = types.map((type, index) => {
      const key = `type${index}`;
      request.input(key, sql.NVarChar(100), type);
      return `@${key}`;
    });
    const result = await request.query<{ InteractionType: string; Cnt: number }>(`
      SELECT InteractionType, COUNT(*) AS Cnt
      FROM fahm.LearningInteractions
      WHERE SessionId = @sessionId
        AND StudentProfileId = @studentProfileId
        AND InteractionType IN (${names.join(", ")})
        AND CreatedAt > DATEADD(hour, -6, SYSUTCDATETIME())
      GROUP BY InteractionType
    `);
    const counts: Record<string, number> = {};
    for (const row of result.recordset) counts[row.InteractionType] = Number(row.Cnt);
    return counts;
  },

  async pauseSeconds(
    sessionId: string,
    studentProfileId: string,
  ): Promise<number | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ Total: number | null; Samples: number }>(`
        SELECT SUM(DurationSeconds) AS Total, COUNT(DurationSeconds) AS Samples
        FROM fahm.LearningInteractions
        WHERE SessionId = @sessionId
          AND StudentProfileId = @studentProfileId
          AND DurationSeconds IS NOT NULL
          AND DurationSeconds > 0
          AND CreatedAt > DATEADD(hour, -6, SYSUTCDATETIME())
      `);
    const row = result.recordset[0];
    if (!row || !row.Samples) return null;
    return Number(row.Total);
  },

  async incorrectAnswerCount(sessionId: string, studentProfileId: string): Promise<number> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("type", sql.NVarChar(100), INTERACTION_TYPES.answerSubmitted)
      .query<{ InteractionData: string | null }>(`
        SELECT InteractionData
        FROM fahm.LearningInteractions
        WHERE SessionId = @sessionId
          AND StudentProfileId = @studentProfileId
          AND InteractionType = @type
          AND CreatedAt > DATEADD(hour, -6, SYSUTCDATETIME())
      `);
    return result.recordset.filter((row) => {
      if (!row.InteractionData) return false;
      try {
        return (JSON.parse(row.InteractionData) as { isCorrect?: boolean }).isCorrect === false;
      } catch {
        return false;
      }
    }).length;
  },
};
