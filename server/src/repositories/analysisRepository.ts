import sql from "mssql";
import { getPool } from "../config/database.js";

export interface OwnedMaterialContext {
  materialId: string;
  studentProfileId: string;
  title: string | null;
  materialType: string;
  mimeType: string | null;
  fileUrl: string | null;
  pageId: string;
  pageNumber: number;
  imageUrl: string | null;
  originalText: string | null;
  sessionId: string;
  modeCode: string | null;
  modeName: string | null;
}

export const analysisRepository = {
  async findOwnedContext(
    materialId: string,
    studentProfileId: string,
  ): Promise<OwnedMaterialContext | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("materialId", sql.UniqueIdentifier, materialId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        MaterialId: string;
        StudentProfileId: string;
        Title: string | null;
        MaterialType: string;
        MimeType: string | null;
        FileUrl: string | null;
        PageId: string;
        PageNumber: number;
        ImageUrl: string | null;
        OriginalText: string | null;
        SessionId: string;
        ModeCode: string | null;
        ModeName: string | null;
      }>(`
        SELECT TOP 1
          m.MaterialId,
          m.StudentProfileId,
          m.Title,
          m.MaterialType,
          m.MimeType,
          m.FileUrl,
          p.PageId,
          p.PageNumber,
          p.ImageUrl,
          p.OriginalText,
          s.SessionId,
          lm.ModeCode,
          lm.ModeName
        FROM fahm.LearningMaterials m
        INNER JOIN fahm.MaterialPages p ON p.MaterialId = m.MaterialId
        INNER JOIN fahm.LearningSessions s ON s.MaterialId = m.MaterialId
        LEFT JOIN fahm.LearningModes lm ON lm.LearningModeId = s.LearningModeId
        WHERE m.MaterialId = @materialId
          AND m.StudentProfileId = @studentProfileId
        ORDER BY p.PageNumber ASC, s.StartedAt DESC
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      materialId: String(row.MaterialId),
      studentProfileId: String(row.StudentProfileId),
      title: row.Title,
      materialType: row.MaterialType,
      mimeType: row.MimeType,
      fileUrl: row.FileUrl,
      pageId: String(row.PageId),
      pageNumber: row.PageNumber,
      imageUrl: row.ImageUrl,
      originalText: row.OriginalText,
      sessionId: String(row.SessionId),
      modeCode: row.ModeCode,
      modeName: row.ModeName,
    };
  },

  async updatePageText(
    pageId: string,
    text: string,
    language: string | null,
    confidence: number | null,
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, pageId)
      .input("text", sql.NVarChar(sql.MAX), text)
      .input("language", sql.NVarChar(20), language)
      .input("confidence", sql.Decimal(5, 2), confidence)
      .query(`
        UPDATE fahm.MaterialPages
        SET OriginalText = @text,
            DetectedLanguage = COALESCE(@language, DetectedLanguage),
            OCRConfidence = @confidence
        WHERE PageId = @pageId
      `);
  },

  async updateMaterialTitle(materialId: string, title: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("materialId", sql.UniqueIdentifier, materialId)
      .input("title", sql.NVarChar(300), title.slice(0, 300))
      .query(`
        UPDATE fahm.LearningMaterials
        SET Title = @title, UpdatedAt = SYSUTCDATETIME()
        WHERE MaterialId = @materialId
          AND (Title IS NULL OR Title IN (N'صفحة كتاب', N'نص ملصق') OR Title LIKE N'fahm-%')
      `);
  },
};
