import sql from "mssql";
import { getPool } from "../config/database.js";

export interface AdaptationInsert {
  sessionId: string;
  studentProfileId: string;
  conceptId?: string | null;
  previousModeId?: number | null;
  newModeId?: number | null;
  triggerReason: string;
  aiReasoning?: string | null;
}

export const adaptationRepository = {
  async insert(input: AdaptationInsert): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, input.sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
      .input("conceptId", sql.UniqueIdentifier, input.conceptId ?? null)
      .input("previousModeId", sql.Int, input.previousModeId ?? null)
      .input("newModeId", sql.Int, input.newModeId ?? null)
      .input("triggerReason", sql.NVarChar(500), input.triggerReason)
      .input("aiReasoning", sql.NVarChar(sql.MAX), input.aiReasoning ?? null)
      .query(`
        INSERT INTO fahm.AdaptationEvents
          (SessionId, StudentProfileId, ConceptId, PreviousModeId, NewModeId, TriggerReason, AIReasoning)
        VALUES
          (@sessionId, @studentProfileId, @conceptId, @previousModeId, @newModeId, @triggerReason, @aiReasoning)
      `);
  },

  async listForOwnedSession(
    sessionId: string,
    studentProfileId: string,
  ): Promise<Array<{ triggerReason: string; aiReasoning: string | null }>> {
    const pool = await getPool();
    try {
      const result = await pool
        .request()
        .input("sessionId", sql.UniqueIdentifier, sessionId)
        .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
        .query<{ TriggerReason: string; AIReasoning: string | null }>(`
          SELECT TOP 8 TriggerReason, AIReasoning
          FROM fahm.AdaptationEvents
          WHERE SessionId = @sessionId AND StudentProfileId = @studentProfileId
          ORDER BY AdaptationEventId DESC
        `);
      return result.recordset.map((row) => ({
        triggerReason: row.TriggerReason,
        aiReasoning: row.AIReasoning,
      }));
    } catch {
      return [];
    }
  },

  async listAdaptedConceptIds(sessionId: string, studentProfileId: string): Promise<string[]> {
    const pool = await getPool();
    try {
      const result = await pool
        .request()
        .input("sessionId", sql.UniqueIdentifier, sessionId)
        .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
        .query<{ ConceptId: string }>(`
          SELECT DISTINCT ConceptId
          FROM fahm.AdaptationEvents
          WHERE SessionId = @sessionId
            AND StudentProfileId = @studentProfileId
            AND ConceptId IS NOT NULL
        `);
      return result.recordset.map((row) => String(row.ConceptId));
    } catch {
      return [];
    }
  },
};
