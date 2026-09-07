import sql from "mssql";
import { getPool } from "../config/database.js";

export interface VisionRow {
  summary: string | null;
  visualDescription: string | null;
  structuredContent: string | null;
  modelName: string | null;
  processingTimeMs: number | null;
}

export const visionRepository = {
  async latestForPage(pageId: string): Promise<VisionRow | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, pageId)
      .query<{
        Summary: string | null;
        VisualDescription: string | null;
        StructuredContent: string | null;
        ModelName: string | null;
        ProcessingTimeMs: number | null;
      }>(`
        SELECT TOP 1 Summary, VisualDescription, StructuredContent, ModelName, ProcessingTimeMs
        FROM fahm.VisionAnalyses
        WHERE PageId = @pageId
        ORDER BY CreatedAt DESC
      `);
    return result.recordset[0]
      ? {
          summary: result.recordset[0].Summary,
          visualDescription: result.recordset[0].VisualDescription,
          structuredContent: result.recordset[0].StructuredContent,
          modelName: result.recordset[0].ModelName,
          processingTimeMs: result.recordset[0].ProcessingTimeMs,
        }
      : null;
  },

  async insert(input: {
    pageId: string;
    modelName: string;
    summary: string;
    visualDescription: string | null;
    structuredContent: string;
    rawResponse: string | null;
    processingTimeMs: number;
  }): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, input.pageId)
      .input("modelName", sql.NVarChar(200), input.modelName)
      .input("summary", sql.NVarChar(sql.MAX), input.summary)
      .input("visualDescription", sql.NVarChar(sql.MAX), input.visualDescription)
      .input("structuredContent", sql.NVarChar(sql.MAX), input.structuredContent)
      .input("rawResponse", sql.NVarChar(sql.MAX), input.rawResponse)
      .input("processingTimeMs", sql.Int, input.processingTimeMs)
      .query(`
        INSERT INTO fahm.VisionAnalyses
          (PageId, ModelName, Summary, VisualDescription, StructuredContent, RawResponse, ProcessingTimeMs)
        VALUES
          (@pageId, @modelName, @summary, @visualDescription, @structuredContent, @rawResponse, @processingTimeMs)
      `);
  },

  async deleteForPage(pageId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, pageId)
      .query(`DELETE FROM fahm.VisionAnalyses WHERE PageId = @pageId`);
  },
};
