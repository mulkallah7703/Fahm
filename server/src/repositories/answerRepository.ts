import sql from "mssql";
import { getPool } from "../config/database.js";
import { LEARNING_RECENT_ANSWER_LIMIT } from "../config/limits.js";

export interface RecentAnswerRow {
  isCorrect: boolean | null;
  modeCode: string | null;
  createdAt: Date;
}

export const answerRepository = {
  async listRecentWithMode(studentProfileId: string): Promise<RecentAnswerRow[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("limit", sql.Int, LEARNING_RECENT_ANSWER_LIMIT)
      .query<{
        IsCorrect: boolean | null;
        ModeCode: string | null;
        CreatedAt: Date;
      }>(`
        SELECT TOP (@limit)
          a.IsCorrect,
          lm.ModeCode,
          a.CreatedAt
        FROM fahm.StudentAnswers a
        INNER JOIN fahm.Questions q ON q.QuestionId = a.QuestionId
        INNER JOIN fahm.LearningSessions s ON s.SessionId = q.SessionId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE a.StudentProfileId = @studentProfileId
        ORDER BY a.CreatedAt DESC
      `);

    return result.recordset.map((row) => ({
      isCorrect: row.IsCorrect,
      modeCode: row.ModeCode,
      createdAt: row.CreatedAt,
    }));
  },
};
