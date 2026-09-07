import sql from "mssql";
import { getPool } from "../config/database.js";
import { DASHBOARD_REVIEW_CONCEPT_LIMIT } from "../config/limits.js";
import { MASTERY_WEIGHTS } from "../config/learningPulse.js";
import type { MasteryRow, ReviewConcept } from "../types/index.js";

export const masteryRepository = {
  async listForStudent(studentProfileId: string): Promise<MasteryRow[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
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

  async listNeedingReview(studentProfileId: string): Promise<ReviewConcept[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("reviewMax", sql.Decimal(5, 2), MASTERY_WEIGHTS.reviewScoreMax)
      .input("limit", sql.Int, DASHBOARD_REVIEW_CONCEPT_LIMIT)
      .query<{
        ConceptId: string;
        ConceptName: string;
        Subject: string | null;
        MasteryScore: number;
        MasteryStatus: string;
      }>(`
        SELECT TOP (@limit)
          m.ConceptId,
          c.ConceptName,
          c.Subject,
          CAST(m.MasteryScore AS float) AS MasteryScore,
          m.MasteryStatus
        FROM fahm.StudentConceptMastery m
        INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = m.ConceptId
        WHERE m.StudentProfileId = @studentProfileId
          AND (
            m.MasteryScore <= @reviewMax
            OR m.MasteryStatus IN (N'needs_review', N'weak', N'unknown')
          )
        ORDER BY m.MasteryScore ASC, m.LastInteractionAt DESC
      `);

    return result.recordset.map((row) => ({
      conceptId: String(row.ConceptId),
      name: row.ConceptName,
      subject: row.Subject,
      masteryScore: Number(row.MasteryScore),
      status: row.MasteryStatus,
    }));
  },

  async findOne(studentProfileId: string, conceptId: string): Promise<MasteryRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("conceptId", sql.UniqueIdentifier, conceptId)
      .query<{
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
        WHERE m.StudentProfileId = @studentProfileId AND m.ConceptId = @conceptId
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
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
    };
  },

  async upsert(studentProfileId: string, row: MasteryRow): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("conceptId", sql.UniqueIdentifier, row.conceptId)
      .input("masteryScore", sql.Decimal(5, 2), row.masteryScore)
      .input("masteryStatus", sql.NVarChar(30), row.masteryStatus)
      .input("attemptsCount", sql.Int, row.attemptsCount)
      .input("correctAnswers", sql.Int, row.correctAnswers)
      .input("incorrectAnswers", sql.Int, row.incorrectAnswers)
      .input("explanationCount", sql.Int, row.explanationCount)
      .query(`
        MERGE fahm.StudentConceptMastery AS target
        USING (SELECT @studentProfileId AS StudentProfileId, @conceptId AS ConceptId) AS src
        ON target.StudentProfileId = src.StudentProfileId AND target.ConceptId = src.ConceptId
        WHEN MATCHED THEN
          UPDATE SET
            MasteryScore = @masteryScore,
            MasteryStatus = @masteryStatus,
            AttemptsCount = @attemptsCount,
            CorrectAnswers = @correctAnswers,
            IncorrectAnswers = @incorrectAnswers,
            ExplanationCount = @explanationCount,
            LastInteractionAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHEN NOT MATCHED THEN
          INSERT (
            StudentProfileId, ConceptId, MasteryScore, MasteryStatus,
            AttemptsCount, CorrectAnswers, IncorrectAnswers, ExplanationCount, LastInteractionAt
          )
          VALUES (
            @studentProfileId, @conceptId, @masteryScore, @masteryStatus,
            @attemptsCount, @correctAnswers, @incorrectAnswers, @explanationCount, SYSUTCDATETIME()
          );
      `);
  },
};
