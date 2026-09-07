import sql from "mssql";
import { getPool } from "../config/database.js";

export interface QuestionRow {
  questionId: string;
  sessionId: string;
  conceptId: string | null;
  questionType: string;
  questionText: string;
  correctAnswer: string | null;
  difficultyLevel: string | null;
  aiModel: string | null;
}

export const questionRepository = {
  async insert(input: {
    sessionId: string;
    conceptId: string | null;
    questionType: string;
    questionText: string;
    correctAnswer: string;
    difficultyLevel: string;
    aiModel: string | null;
  }): Promise<string> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, input.sessionId)
      .input("conceptId", sql.UniqueIdentifier, input.conceptId)
      .input("questionType", sql.NVarChar(50), input.questionType)
      .input("questionText", sql.NVarChar(sql.MAX), input.questionText)
      .input("correctAnswer", sql.NVarChar(sql.MAX), input.correctAnswer)
      .input("difficultyLevel", sql.NVarChar(30), input.difficultyLevel)
      .input("aiModel", sql.NVarChar(200), input.aiModel)
      .query<{ QuestionId: string }>(`
        INSERT INTO fahm.Questions
          (SessionId, ConceptId, QuestionType, QuestionText, CorrectAnswer, DifficultyLevel, AIModel)
        OUTPUT INSERTED.QuestionId
        VALUES
          (@sessionId, @conceptId, @questionType, @questionText, @correctAnswer, @difficultyLevel, @aiModel)
      `);
    return String(result.recordset[0].QuestionId);
  },

  async findById(questionId: string): Promise<QuestionRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("questionId", sql.UniqueIdentifier, questionId)
      .query<{
        QuestionId: string;
        SessionId: string;
        ConceptId: string | null;
        QuestionType: string;
        QuestionText: string;
        CorrectAnswer: string | null;
        DifficultyLevel: string | null;
        AIModel: string | null;
      }>(`
        SELECT QuestionId, SessionId, ConceptId, QuestionType, QuestionText,
               CorrectAnswer, DifficultyLevel, AIModel
        FROM fahm.Questions
        WHERE QuestionId = @questionId
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      questionId: String(row.QuestionId),
      sessionId: String(row.SessionId),
      conceptId: row.ConceptId ? String(row.ConceptId) : null,
      questionType: row.QuestionType,
      questionText: row.QuestionText,
      correctAnswer: row.CorrectAnswer,
      difficultyLevel: row.DifficultyLevel,
      aiModel: row.AIModel,
    };
  },

  async findMany(questionIds: string[]): Promise<QuestionRow[]> {
    if (questionIds.length === 0) return [];
    const pool = await getPool();
    const request = pool.request();
    const names = questionIds.map((id, index) => {
      const key = `id${index}`;
      request.input(key, sql.UniqueIdentifier, id);
      return `@${key}`;
    });
    const result = await request.query<{
      QuestionId: string;
      SessionId: string;
      ConceptId: string | null;
      QuestionType: string;
      QuestionText: string;
      CorrectAnswer: string | null;
      DifficultyLevel: string | null;
      AIModel: string | null;
    }>(`
      SELECT QuestionId, SessionId, ConceptId, QuestionType, QuestionText,
             CorrectAnswer, DifficultyLevel, AIModel
      FROM fahm.Questions
      WHERE QuestionId IN (${names.join(", ")})
    `);
    const byId = new Map(result.recordset.map((row) => [String(row.QuestionId), row]));
    return questionIds
      .map((id) => byId.get(id))
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => ({
        questionId: String(row.QuestionId),
        sessionId: String(row.SessionId),
        conceptId: row.ConceptId ? String(row.ConceptId) : null,
        questionType: row.QuestionType,
        questionText: row.QuestionText,
        correctAnswer: row.CorrectAnswer,
        difficultyLevel: row.DifficultyLevel,
        aiModel: row.AIModel,
      }));
  },
};
