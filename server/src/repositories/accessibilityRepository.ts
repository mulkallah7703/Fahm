import sql from "mssql";
import { getPool } from "../config/database.js";
import type { AccessibilitySignals } from "../types/learning.js";

export const accessibilityRepository = {
  async findForStudent(studentProfileId: string): Promise<AccessibilitySignals | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{
        VisualSupport: boolean;
        AudioSupport: boolean;
        SimplifiedLanguage: boolean;
        FocusSupport: boolean;
        DyslexiaSupport: boolean;
        BlindSupport: boolean;
        FontSize: number | null;
        LineSpacing: number | null;
        SpeechRate: number | null;
        PreferredVoice: string | null;
      }>(`
        SELECT TOP 1
          VisualSupport,
          AudioSupport,
          SimplifiedLanguage,
          FocusSupport,
          DyslexiaSupport,
          BlindSupport,
          FontSize,
          CAST(LineSpacing AS float) AS LineSpacing,
          CAST(SpeechRate AS float) AS SpeechRate,
          PreferredVoice
        FROM fahm.AccessibilityPreferences
        WHERE StudentProfileId = @studentProfileId
      `);

    const row = result.recordset[0];
    if (!row) return null;
    return {
      visualSupport: Boolean(row.VisualSupport),
      audioSupport: Boolean(row.AudioSupport),
      simplifiedLanguage: Boolean(row.SimplifiedLanguage),
      focusSupport: Boolean(row.FocusSupport),
      dyslexiaSupport: Boolean(row.DyslexiaSupport),
      blindSupport: Boolean(row.BlindSupport),
      fontSize: row.FontSize,
      lineSpacing: row.LineSpacing === null ? null : Number(row.LineSpacing),
      speechRate: row.SpeechRate === null ? null : Number(row.SpeechRate),
      preferredVoice: row.PreferredVoice,
    };
  },

  async updateReadingPrefs(
    studentProfileId: string,
    input: { fontSize?: number; lineSpacing?: number },
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("fontSize", sql.Int, input.fontSize ?? null)
      .input("lineSpacing", sql.Float, input.lineSpacing ?? null)
      .query(`
        UPDATE fahm.AccessibilityPreferences
        SET FontSize = COALESCE(@fontSize, FontSize),
            LineSpacing = COALESCE(@lineSpacing, LineSpacing)
        WHERE StudentProfileId = @studentProfileId
      `);
  },

  async updateSpeechPrefs(
    studentProfileId: string,
    input: { speechRate?: number; preferredVoice?: string | null },
  ): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("speechRate", sql.Float, input.speechRate ?? null)
      .input("preferredVoice", sql.NVarChar(200), input.preferredVoice ?? null)
      .query(`
        UPDATE fahm.AccessibilityPreferences
        SET SpeechRate = COALESCE(@speechRate, SpeechRate),
            PreferredVoice = COALESCE(@preferredVoice, PreferredVoice)
        WHERE StudentProfileId = @studentProfileId
      `);
  },
};
