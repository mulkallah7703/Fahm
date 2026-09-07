import sql from "mssql";
import { getPool } from "../config/database.js";

export interface OcrRow {
  extractedText: string;
  language: string | null;
  confidence: number | null;
  processingTimeMs: number | null;
  engine: string;
}

export const ocrRepository = {
  async latestForPage(pageId: string): Promise<OcrRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, pageId)
      .query<{
        ExtractedText: string | null;
        Language: string | null;
        ConfidenceScore: number | null;
        ProcessingTimeMs: number | null;
        Engine: string;
      }>(`
        SELECT TOP 1 ExtractedText, Language, ConfidenceScore, ProcessingTimeMs, Engine
        FROM fahm.OCRResults
        WHERE PageId = @pageId
        ORDER BY CreatedAt DESC
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      extractedText: row.ExtractedText ?? "",
      language: row.Language,
      confidence: row.ConfidenceScore === null ? null : Number(row.ConfidenceScore),
      processingTimeMs: row.ProcessingTimeMs,
      engine: row.Engine,
    };
  },

  async insert(input: {
    pageId: string;
    engine: string;
    language: string;
    text: string;
    confidence: number;
    processingTimeMs: number;
  }): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, input.pageId)
      .input("engine", sql.NVarChar(100), input.engine)
      .input("language", sql.NVarChar(20), input.language)
      .input("text", sql.NVarChar(sql.MAX), input.text)
      .input("confidence", sql.Decimal(5, 2), input.confidence)
      .input("processingTimeMs", sql.Int, input.processingTimeMs)
      .query(`
        INSERT INTO fahm.OCRResults
          (PageId, Engine, Language, ExtractedText, ConfidenceScore, ProcessingTimeMs)
        VALUES
          (@pageId, @engine, @language, @text, @confidence, @processingTimeMs)
      `);
  },

  async deleteForPage(pageId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, pageId)
      .query(`DELETE FROM fahm.OCRResults WHERE PageId = @pageId`);
  },
};
