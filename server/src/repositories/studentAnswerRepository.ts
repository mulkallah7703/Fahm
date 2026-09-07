import sql from "mssql";
import { getPool } from "../config/database.js";

export interface StoredAnswer {
  answerId: string;
  questionId: string;
  isCorrect: boolean | null;
  answerText: string | null;
}

export const studentAnswerRepository = {
  async findForQuestion(
    questionId: string,
    studentProfileId: string,
  ): Promise<StoredAnswer | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("questionId", sql.UniqueIdentifier, questionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        AnswerId: string;
        QuestionId: string;
        IsCorrect: boolean | null;
        AnswerText: string | null;
      }>(`
        SELECT TOP 1 AnswerId, QuestionId, IsCorrect, AnswerText
        FROM fahm.StudentAnswers
        WHERE QuestionId = @questionId AND StudentProfileId = @studentProfileId
        ORDER BY CreatedAt ASC
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      answerId: String(row.AnswerId),
      questionId: String(row.QuestionId),
      isCorrect: row.IsCorrect,
      answerText: row.AnswerText,
    };
  },

  async insert(input: {
    questionId: string;
    studentProfileId: string;
    answerText: string;
    isCorrect: boolean;
    score: number;
    explanation: string | null;
    responseTimeSeconds: number | null;
  }): Promise<string> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("questionId", sql.UniqueIdentifier, input.questionId)
      .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
      .input("answerText", sql.NVarChar(sql.MAX), input.answerText)
      .input("isCorrect", sql.Bit, input.isCorrect)
      .input("score", sql.Decimal(5, 2), input.score)
      .input("explanation", sql.NVarChar(sql.MAX), input.explanation)
      .input("responseTimeSeconds", sql.Int, input.responseTimeSeconds)
      .query<{ AnswerId: string }>(`
        INSERT INTO fahm.StudentAnswers
          (QuestionId, StudentProfileId, AnswerText, IsCorrect, Score, AIExplanation, ResponseTimeSeconds)
        OUTPUT INSERTED.AnswerId
        VALUES
          (@questionId, @studentProfileId, @answerText, @isCorrect, @score, @explanation, @responseTimeSeconds)
      `);
    return String(result.recordset[0].AnswerId);
  },

  async listForQuestions(
    studentProfileId: string,
    questionIds: string[],
  ): Promise<Array<{ questionId: string; isCorrect: boolean | null; responseTimeSeconds: number | null }>> {
    if (questionIds.length === 0) return [];
    const pool = await getPool();
    const request = pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId);
    const names = questionIds.map((id, index) => {
      const key = `id${index}`;
      request.input(key, sql.UniqueIdentifier, id);
      return `@${key}`;
    });
    const result = await request.query<{
      QuestionId: string;
      IsCorrect: boolean | null;
      ResponseTimeSeconds: number | null;
    }>(`
      SELECT QuestionId, IsCorrect, ResponseTimeSeconds
      FROM fahm.StudentAnswers
      WHERE StudentProfileId = @studentProfileId
        AND QuestionId IN (${names.join(", ")})
    `);
    return result.recordset.map((row) => ({
      questionId: String(row.QuestionId),
      isCorrect: row.IsCorrect,
      responseTimeSeconds: row.ResponseTimeSeconds === null ? null : Number(row.ResponseTimeSeconds),
    }));
  },
};
