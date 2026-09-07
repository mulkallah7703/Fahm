import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sql from "mssql";
import { getPool, storageRoot } from "../config/database.js";
import { logger } from "../utils/logger.js";

export interface AudioGenerationRecord {
  id: string;
  studentProfileId: string;
  sessionId: string | null;
  provider: string;
  voice: string | null;
  contentHash: string;
  durationSeconds: number | null;
}

function ttsDir(): string {
  return path.join(storageRoot(), "tts");
}

export function audioContentHash(text: string, voice: string, provider: string): string {
  return createHash("sha256").update(`${provider}|${voice}|${text}`).digest("hex");
}

export function audioFilePath(hash: string): string {
  return path.join(ttsDir(), `${hash}.mp3`);
}

export const audioGenerationRepository = {
  async findByHash(contentHash: string): Promise<AudioGenerationRecord | null> {
    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("hash", sql.NVarChar(128), contentHash)
        .query<{
          AudioGenerationId: string;
          StudentProfileId: string;
          SessionId: string | null;
          Provider: string;
          Voice: string | null;
          ContentHash: string;
          DurationSeconds: number | null;
        }>(`
          SELECT TOP 1
            AudioGenerationId,
            StudentProfileId,
            SessionId,
            Provider,
            Voice,
            ContentHash,
            DurationSeconds
          FROM fahm.AudioGenerations
          WHERE ContentHash = @hash
          ORDER BY CreatedAt DESC
        `);
      const row = result.recordset[0];
      if (!row) return null;
      return {
        id: String(row.AudioGenerationId),
        studentProfileId: String(row.StudentProfileId),
        sessionId: row.SessionId ? String(row.SessionId) : null,
        provider: row.Provider,
        voice: row.Voice,
        contentHash: row.ContentHash,
        durationSeconds: row.DurationSeconds,
      };
    } catch (error) {
      logger.warn("audio_generations_lookup_skipped", {
        reason: error instanceof Error ? error.message : "schema",
      });
      return null;
    }
  },

  async insert(input: {
    studentProfileId: string;
    sessionId: string | null;
    provider: string;
    voice: string | null;
    contentHash: string;
    sourceText: string;
    durationSeconds: number | null;
  }): Promise<string | null> {
    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
        .input("sessionId", sql.UniqueIdentifier, input.sessionId)
        .input("provider", sql.NVarChar(80), input.provider)
        .input("voice", sql.NVarChar(200), input.voice)
        .input("contentHash", sql.NVarChar(128), input.contentHash)
        .input("sourceText", sql.NVarChar(4000), input.sourceText.slice(0, 4000))
        .input("durationSeconds", sql.Int, input.durationSeconds)
        .query<{ AudioGenerationId: string }>(`
          INSERT INTO fahm.AudioGenerations
            (StudentProfileId, SessionId, Provider, Voice, ContentHash, SourceText, DurationSeconds, Status)
          OUTPUT INSERTED.AudioGenerationId
          VALUES
            (@studentProfileId, @sessionId, @provider, @voice, @contentHash, @sourceText, @durationSeconds, N'ready')
        `);
      return result.recordset[0] ? String(result.recordset[0].AudioGenerationId) : input.contentHash;
    } catch (error) {
      logger.warn("audio_generations_insert_skipped", {
        reason: error instanceof Error ? error.message : "schema",
      });
      return input.contentHash;
    }
  },

  async findOwned(id: string, studentProfileId: string): Promise<AudioGenerationRecord | null> {
    try {
      const pool = await getPool();
      const result = await pool
        .request()
        .input("id", sql.NVarChar(128), id)
        .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
        .query<{
          AudioGenerationId: string;
          StudentProfileId: string;
          SessionId: string | null;
          Provider: string;
          Voice: string | null;
          ContentHash: string;
          DurationSeconds: number | null;
        }>(`
          SELECT TOP 1
            AudioGenerationId,
            StudentProfileId,
            SessionId,
            Provider,
            Voice,
            ContentHash,
            DurationSeconds
          FROM fahm.AudioGenerations
          WHERE (CAST(AudioGenerationId AS nvarchar(64)) = @id OR ContentHash = @id)
            AND StudentProfileId = @studentProfileId
        `);
      const row = result.recordset[0];
      if (!row) return null;
      return {
        id: String(row.AudioGenerationId),
        studentProfileId: String(row.StudentProfileId),
        sessionId: row.SessionId ? String(row.SessionId) : null,
        provider: row.Provider,
        voice: row.Voice,
        contentHash: row.ContentHash,
        durationSeconds: row.DurationSeconds,
      };
    } catch {
      return null;
    }
  },

  async saveFile(hash: string, bytes: Buffer): Promise<void> {
    await mkdir(ttsDir(), { recursive: true });
    await writeFile(audioFilePath(hash), bytes);
  },

  async readFile(hash: string): Promise<Buffer | null> {
    try {
      return await readFile(audioFilePath(hash));
    } catch {
      return null;
    }
  },
};
