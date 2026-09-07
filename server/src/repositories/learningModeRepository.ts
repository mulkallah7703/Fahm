import sql from "mssql";
import { getPool } from "../config/database.js";
import {
  isLearningModeCode,
  type LearningModeCode,
} from "../config/learningModes.js";

export interface LearningModeRow {
  learningModeId: number;
  modeCode: LearningModeCode;
  modeName: string;
  description: string | null;
  isAdaptive: boolean;
}

export const learningModeRepository = {
  async listActive(): Promise<LearningModeRow[]> {
    const pool = await getPool();
    const result = await pool.request().query<{
      LearningModeId: number;
      ModeCode: string;
      ModeName: string;
      Description: string | null;
      IsAdaptive: boolean;
    }>(`
      SELECT LearningModeId, ModeCode, ModeName, Description, IsAdaptive
      FROM fahm.LearningModes
      WHERE IsActive = 1
      ORDER BY LearningModeId
    `);

    return result.recordset.flatMap((row) => {
      if (!isLearningModeCode(row.ModeCode)) return [];
      return [
        {
          learningModeId: row.LearningModeId,
          modeCode: row.ModeCode,
          modeName: row.ModeName,
          description: row.Description,
          isAdaptive: Boolean(row.IsAdaptive),
        },
      ];
    });
  },

  async findActiveByCode(modeCode: string): Promise<LearningModeRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("modeCode", sql.NVarChar(50), modeCode)
      .query<{
        LearningModeId: number;
        ModeCode: string;
        ModeName: string;
        Description: string | null;
        IsAdaptive: boolean;
      }>(`
        SELECT TOP 1 LearningModeId, ModeCode, ModeName, Description, IsAdaptive
        FROM fahm.LearningModes
        WHERE ModeCode = @modeCode AND IsActive = 1
      `);
    const row = result.recordset[0];
    if (!row || !isLearningModeCode(row.ModeCode)) return null;
    return {
      learningModeId: row.LearningModeId,
      modeCode: row.ModeCode,
      modeName: row.ModeName,
      description: row.Description,
      isAdaptive: Boolean(row.IsAdaptive),
    };
  },
};
