import sql from "mssql";
import { getPool } from "../config/database.js";
import type { LearningPulseResult } from "../types/index.js";

export const pulseRepository = {
  async latestOverall(studentProfileId: string): Promise<LearningPulseResult | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        UnderstandingScore: number;
        Status: string;
        RecommendedAction: string | null;
      }>(`
        SELECT TOP 1
          CAST(UnderstandingScore AS float) AS UnderstandingScore,
          Status,
          RecommendedAction
        FROM fahm.LearningPulse
        WHERE StudentProfileId = @studentProfileId
          AND ConceptId IS NULL
        ORDER BY GeneratedAt DESC
      `);

    const row = result.recordset[0];
    if (!row) return null;
    return {
      score: Math.round(Number(row.UnderstandingScore)),
      status: row.Status,
      recommendedAction: row.RecommendedAction,
    };
  },

  async insertOverall(
    studentProfileId: string,
    pulse: LearningPulseResult,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("score", sql.Decimal(5, 2), pulse.score)
      .input("status", sql.NVarChar(30), pulse.status)
      .input("recommendedAction", sql.NVarChar(500), pulse.recommendedAction)
      .query(`
        INSERT INTO fahm.LearningPulse
          (StudentProfileId, ConceptId, UnderstandingScore, Status, RecommendedAction)
        VALUES
          (@studentProfileId, NULL, @score, @status, @recommendedAction)
      `);
  },
};
