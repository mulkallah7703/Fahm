import sql from "mssql";
import { getPool, withTransaction } from "../config/database.js";
import { LEARNING_MODE_ADAPTIVE } from "../config/learningPulse.js";

export interface MaterialInsert {
  studentProfileId: string;
  title: string;
  materialType: string;
  originalFileName: string | null;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  language: string;
  pageImageUrl: string | null;
  originalText: string | null;
}

export interface CreatedMaterial {
  materialId: string;
  pageId: string;
  sessionId: string;
}

export const materialRepository = {
  async createWithPageAndSession(input: MaterialInsert): Promise<CreatedMaterial> {
    return withTransaction(async (_tx, request) => {
      const material = await request()
        .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
        .input("title", sql.NVarChar(300), input.title)
        .input("materialType", sql.NVarChar(50), input.materialType)
        .input("originalFileName", sql.NVarChar(500), input.originalFileName)
        .input("fileUrl", sql.NVarChar(2000), input.fileUrl)
        .input("fileSizeBytes", sql.BigInt, input.fileSizeBytes)
        .input("mimeType", sql.NVarChar(200), input.mimeType)
        .input("language", sql.NVarChar(20), input.language)
        .query<{ MaterialId: string }>(`
          INSERT INTO fahm.LearningMaterials
            (StudentProfileId, Title, MaterialType, OriginalFileName, FileUrl,
             FileSizeBytes, MimeType, Language)
          OUTPUT INSERTED.MaterialId
          VALUES
            (@studentProfileId, @title, @materialType, @originalFileName, @fileUrl,
             @fileSizeBytes, @mimeType, @language)
        `);

      const materialId = String(material.recordset[0].MaterialId);

      const page = await request()
        .input("materialId", sql.UniqueIdentifier, materialId)
        .input("pageNumber", sql.Int, 1)
        .input("imageUrl", sql.NVarChar(2000), input.pageImageUrl)
        .input("originalText", sql.NVarChar(sql.MAX), input.originalText)
        .input("detectedLanguage", sql.NVarChar(20), input.language)
        .query<{ PageId: string }>(`
          INSERT INTO fahm.MaterialPages
            (MaterialId, PageNumber, ImageUrl, OriginalText, DetectedLanguage)
          OUTPUT INSERTED.PageId
          VALUES
            (@materialId, @pageNumber, @imageUrl, @originalText, @detectedLanguage)
        `);

      const pageId = String(page.recordset[0].PageId);

      const session = await request()
        .input("sessionStudentId", sql.UniqueIdentifier, input.studentProfileId)
        .input("sessionMaterialId", sql.UniqueIdentifier, materialId)
        .input("learningModeId", sql.Int, LEARNING_MODE_ADAPTIVE)
        .query<{ SessionId: string }>(`
          INSERT INTO fahm.LearningSessions
            (StudentProfileId, MaterialId, LearningModeId, SessionStatus)
          OUTPUT INSERTED.SessionId
          VALUES
            (@sessionStudentId, @sessionMaterialId, @learningModeId, N'active')
        `);

      return {
        materialId,
        pageId,
        sessionId: String(session.recordset[0].SessionId),
      };
    });
  },

  async findOwned(
    materialId: string,
    studentProfileId: string,
  ): Promise<{ fileUrl: string | null; mimeType: string | null; originalFileName: string | null } | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("materialId", sql.UniqueIdentifier, materialId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        FileUrl: string | null;
        MimeType: string | null;
        OriginalFileName: string | null;
      }>(`
        SELECT FileUrl, MimeType, OriginalFileName
        FROM fahm.LearningMaterials
        WHERE MaterialId = @materialId AND StudentProfileId = @studentProfileId
      `);
    const row = result.recordset[0];
    if (!row) return null;
    return {
      fileUrl: row.FileUrl,
      mimeType: row.MimeType,
      originalFileName: row.OriginalFileName,
    };
  },
};
