import sql from "mssql";
import { getPool } from "../config/database.js";
import { conceptNameVariants, normalizeConceptName } from "../utils/conceptName.js";

export interface PageConceptRow {
  conceptId: string;
  name: string;
  description: string | null;
  subject: string | null;
  importanceScore: number;
  confidenceScore: number;
}

export interface RelationshipRow {
  source: string;
  target: string;
  type: string;
  confidenceScore: number | null;
}

export interface RelationshipDetailRow {
  relationshipId: string;
  sourceConceptId: string;
  targetConceptId: string;
  source: string;
  target: string;
  type: string;
  confidenceScore: number | null;
}

export interface StudentConceptRow extends PageConceptRow {
  materialId: string;
  sessionId: string | null;
  title: string;
  pageNumber: number | null;
}

export const conceptRepository = {
  async findByName(name: string): Promise<{ conceptId: string; name: string } | null> {
    const variants = conceptNameVariants(name);
    const pool = await getPool();
    const request = pool.request();
    variants.forEach((variant, index) => {
      request.input(`n${index}`, sql.NVarChar(300), variant);
    });
    const inList = variants.map((_, index) => `@n${index}`).join(", ");
    const result = await request.query<{ ConceptId: string; ConceptName: string }>(`
      SELECT ConceptId, ConceptName
      FROM fahm.KnowledgeConcepts
      WHERE ConceptName IN (${inList})
    `);
    const exact = result.recordset.find(
      (row) => normalizeConceptName(row.ConceptName) === normalizeConceptName(name),
    ) ?? result.recordset[0];
    if (!exact) return null;
    return { conceptId: String(exact.ConceptId), name: exact.ConceptName };
  },

  async create(input: {
    name: string;
    description: string | null;
    subject: string | null;
  }): Promise<string> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("name", sql.NVarChar(300), input.name.slice(0, 300))
      .input("description", sql.NVarChar(sql.MAX), input.description)
      .input("subject", sql.NVarChar(200), input.subject)
      .query<{ ConceptId: string }>(`
        INSERT INTO fahm.KnowledgeConcepts (ConceptName, Description, Subject)
        OUTPUT INSERTED.ConceptId
        VALUES (@name, @description, @subject)
      `);
    return String(result.recordset[0].ConceptId);
  },

  async linkPage(input: {
    pageId: string;
    conceptId: string;
    importance: number;
    confidence: number;
  }): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, input.pageId)
      .input("conceptId", sql.UniqueIdentifier, input.conceptId)
      .input("importance", sql.Decimal(5, 2), input.importance)
      .input("confidence", sql.Decimal(5, 2), input.confidence)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM fahm.PageConcepts
          WHERE PageId = @pageId AND ConceptId = @conceptId
        )
        INSERT INTO fahm.PageConcepts (PageId, ConceptId, ImportanceScore, ConfidenceScore)
        VALUES (@pageId, @conceptId, @importance, @confidence)
        ELSE
        UPDATE fahm.PageConcepts
        SET ImportanceScore = @importance, ConfidenceScore = @confidence
        WHERE PageId = @pageId AND ConceptId = @conceptId
      `);
  },

  async relate(input: {
    sourceId: string;
    targetId: string;
    type: string;
    confidence: number | null;
  }): Promise<void> {
    if (input.sourceId === input.targetId) return;
    const pool = await getPool();
    await pool
      .request()
      .input("sourceId", sql.UniqueIdentifier, input.sourceId)
      .input("targetId", sql.UniqueIdentifier, input.targetId)
      .input("type", sql.NVarChar(100), input.type.slice(0, 100))
      .input("confidence", sql.Decimal(5, 2), input.confidence)
      .query(`
        IF NOT EXISTS (
          SELECT 1 FROM fahm.KnowledgeRelationships
          WHERE SourceConceptId = @sourceId
            AND TargetConceptId = @targetId
            AND RelationshipType = @type
        )
        INSERT INTO fahm.KnowledgeRelationships
          (SourceConceptId, TargetConceptId, RelationshipType, ConfidenceScore)
        VALUES (@sourceId, @targetId, @type, @confidence)
      `);
  },

  async listForPage(pageId: string): Promise<PageConceptRow[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, pageId)
      .query<{
        ConceptId: string;
        ConceptName: string;
        Description: string | null;
        Subject: string | null;
        ImportanceScore: number | null;
        ConfidenceScore: number | null;
      }>(`
        SELECT c.ConceptId, c.ConceptName, c.Description, c.Subject,
               CAST(pc.ImportanceScore AS float) AS ImportanceScore,
               CAST(pc.ConfidenceScore AS float) AS ConfidenceScore
        FROM fahm.PageConcepts pc
        INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = pc.ConceptId
        WHERE pc.PageId = @pageId
        ORDER BY pc.ImportanceScore DESC
      `);
    return result.recordset.map((row) => ({
      conceptId: String(row.ConceptId),
      name: row.ConceptName,
      description: row.Description,
      subject: row.Subject,
      importanceScore: Number(row.ImportanceScore ?? 0),
      confidenceScore: Number(row.ConfidenceScore ?? 0),
    }));
  },

  async listRelationships(conceptIds: string[]): Promise<RelationshipRow[]> {
    if (conceptIds.length === 0) return [];
    const pool = await getPool();
    const request = pool.request();
    conceptIds.forEach((id, index) => {
      request.input(`id${index}`, sql.UniqueIdentifier, id);
    });
    const list = conceptIds.map((_, index) => `@id${index}`).join(", ");
    const result = await request.query<{
      SourceName: string;
      TargetName: string;
      RelationshipType: string;
      ConfidenceScore: number | null;
    }>(`
      SELECT s.ConceptName AS SourceName, t.ConceptName AS TargetName,
             r.RelationshipType, CAST(r.ConfidenceScore AS float) AS ConfidenceScore
      FROM fahm.KnowledgeRelationships r
      INNER JOIN fahm.KnowledgeConcepts s ON s.ConceptId = r.SourceConceptId
      INNER JOIN fahm.KnowledgeConcepts t ON t.ConceptId = r.TargetConceptId
      WHERE r.SourceConceptId IN (${list}) AND r.TargetConceptId IN (${list})
    `);
    return result.recordset.map((row) => ({
      source: row.SourceName,
      target: row.TargetName,
      type: row.RelationshipType,
      confidenceScore: row.ConfidenceScore === null ? null : Number(row.ConfidenceScore),
    }));
  },

  async listRelationshipDetails(conceptIds: string[]): Promise<RelationshipDetailRow[]> {
    if (conceptIds.length === 0) return [];
    const pool = await getPool();
    const request = pool.request();
    conceptIds.forEach((id, index) => {
      request.input(`id${index}`, sql.UniqueIdentifier, id);
    });
    const list = conceptIds.map((_, index) => `@id${index}`).join(", ");
    const result = await request.query<{
      RelationshipId: string;
      SourceConceptId: string;
      TargetConceptId: string;
      SourceName: string;
      TargetName: string;
      RelationshipType: string;
      ConfidenceScore: number | null;
    }>(`
      SELECT r.RelationshipId, r.SourceConceptId, r.TargetConceptId,
             s.ConceptName AS SourceName, t.ConceptName AS TargetName,
             r.RelationshipType, CAST(r.ConfidenceScore AS float) AS ConfidenceScore
      FROM fahm.KnowledgeRelationships r
      INNER JOIN fahm.KnowledgeConcepts s ON s.ConceptId = r.SourceConceptId
      INNER JOIN fahm.KnowledgeConcepts t ON t.ConceptId = r.TargetConceptId
      WHERE r.SourceConceptId IN (${list}) AND r.TargetConceptId IN (${list})
    `);
    return result.recordset.map((row) => ({
      relationshipId: String(row.RelationshipId),
      sourceConceptId: String(row.SourceConceptId),
      targetConceptId: String(row.TargetConceptId),
      source: row.SourceName,
      target: row.TargetName,
      type: row.RelationshipType,
      confidenceScore: row.ConfidenceScore === null ? null : Number(row.ConfidenceScore),
    }));
  },

  async listForStudent(studentProfileId: string): Promise<StudentConceptRow[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        ConceptId: string;
        ConceptName: string;
        Description: string | null;
        Subject: string | null;
        ImportanceScore: number | null;
        ConfidenceScore: number | null;
        MaterialId: string;
        SessionId: string | null;
        Title: string | null;
        PageNumber: number | null;
      }>(`
        SELECT
          c.ConceptId,
          c.ConceptName,
          c.Description,
          c.Subject,
          CAST(pc.ImportanceScore AS float) AS ImportanceScore,
          CAST(pc.ConfidenceScore AS float) AS ConfidenceScore,
          mat.MaterialId,
          sess.SessionId,
          mat.Title,
          p.PageNumber
        FROM fahm.PageConcepts pc
        INNER JOIN fahm.KnowledgeConcepts c ON c.ConceptId = pc.ConceptId
        INNER JOIN fahm.MaterialPages p ON p.PageId = pc.PageId
        INNER JOIN fahm.LearningMaterials mat ON mat.MaterialId = p.MaterialId
        OUTER APPLY (
          SELECT TOP 1 s.SessionId
          FROM fahm.LearningSessions s
          WHERE s.MaterialId = mat.MaterialId
            AND s.StudentProfileId = @studentProfileId
          ORDER BY s.StartedAt DESC
        ) sess
        WHERE mat.StudentProfileId = @studentProfileId
        ORDER BY pc.ImportanceScore DESC
      `);
    const unique = new Map<string, StudentConceptRow>();
    for (const row of result.recordset) {
      const conceptId = String(row.ConceptId);
      const current = unique.get(conceptId);
      const next: StudentConceptRow = {
        conceptId,
        name: row.ConceptName,
        description: row.Description,
        subject: row.Subject,
        importanceScore: Number(row.ImportanceScore ?? 0),
        confidenceScore: Number(row.ConfidenceScore ?? 0),
        materialId: String(row.MaterialId),
        sessionId: row.SessionId ? String(row.SessionId) : null,
        title: row.Title?.trim() || "درس",
        pageNumber: row.PageNumber,
      };
      if (!current || next.importanceScore > current.importanceScore) unique.set(conceptId, next);
    }
    return [...unique.values()];
  },

  async unlinkPage(pageId: string): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("pageId", sql.UniqueIdentifier, pageId)
      .query(`DELETE FROM fahm.PageConcepts WHERE PageId = @pageId`);
  },
};
