import sql from "mssql";
import { getPool } from "../config/database.js";
import { ASK_CONVERSATION_LIMIT, ASK_HISTORY_LIMIT } from "../config/askFahm.js";

export interface ChatMessageRow {
  messageId: string;
  senderType: "student" | "fahm";
  messageText: string;
  aiModel: string | null;
  createdAt: Date;
}

export const chatRepository = {
  async createConversation(input: {
    studentProfileId: string;
    sessionId: string;
    title: string;
  }): Promise<string> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, input.studentProfileId)
      .input("sessionId", sql.UniqueIdentifier, input.sessionId)
      .input("title", sql.NVarChar(300), input.title)
      .query<{ ConversationId: string }>(`
        INSERT INTO fahm.ChatConversations (StudentProfileId, SessionId, Title)
        OUTPUT INSERTED.ConversationId
        VALUES (@studentProfileId, @sessionId, @title)
      `);
    return String(result.recordset[0].ConversationId);
  },

  async addMessage(input: {
    conversationId: string;
    senderType: "student" | "fahm";
    messageText: string;
    aiModel: string | null;
  }): Promise<{ messageId: string; createdAt: Date }> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("conversationId", sql.UniqueIdentifier, input.conversationId)
      .input("senderType", sql.NVarChar(30), input.senderType)
      .input("messageText", sql.NVarChar(sql.MAX), input.messageText)
      .input("aiModel", sql.NVarChar(200), input.aiModel)
      .query<{ MessageId: string; CreatedAt: Date }>(`
        INSERT INTO fahm.ChatMessages (ConversationId, SenderType, MessageText, AIModel)
        OUTPUT INSERTED.MessageId, INSERTED.CreatedAt
        VALUES (@conversationId, @senderType, @messageText, @aiModel)
      `);
    await pool
      .request()
      .input("conversationId", sql.UniqueIdentifier, input.conversationId)
      .query(`
        UPDATE fahm.ChatConversations
        SET UpdatedAt = SYSUTCDATETIME()
        WHERE ConversationId = @conversationId
      `);
    const row = result.recordset[0];
    return { messageId: String(row.MessageId), createdAt: row.CreatedAt };
  },

  async latestConversationId(sessionId: string, studentProfileId: string): Promise<string | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("sessionId", sql.UniqueIdentifier, sessionId)
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .query<{ ConversationId: string }>(`
        SELECT TOP 1 ConversationId
        FROM fahm.ChatConversations
        WHERE SessionId = @sessionId AND StudentProfileId = @studentProfileId
        ORDER BY UpdatedAt DESC
      `);
    return result.recordset[0] ? String(result.recordset[0].ConversationId) : null;
  },

  async listMessages(conversationId: string, limit = ASK_HISTORY_LIMIT): Promise<ChatMessageRow[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("conversationId", sql.UniqueIdentifier, conversationId)
      .input("limit", sql.Int, limit)
      .query<{
        MessageId: string;
        SenderType: string;
        MessageText: string;
        AIModel: string | null;
        CreatedAt: Date;
      }>(`
        SELECT TOP (@limit) MessageId, SenderType, MessageText, AIModel, CreatedAt
        FROM fahm.ChatMessages
        WHERE ConversationId = @conversationId
        ORDER BY CreatedAt DESC
      `);
    return result.recordset
      .reverse()
      .map((row) => ({
        messageId: String(row.MessageId),
        senderType: row.SenderType === "fahm" ? "fahm" : "student",
        messageText: row.MessageText,
        aiModel: row.AIModel,
        createdAt: row.CreatedAt,
      }));
  },

  async listRecentForStudent(studentProfileId: string): Promise<Array<{ sessionId: string; title: string }>> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("studentProfileId", sql.UniqueIdentifier, studentProfileId)
      .input("limit", sql.Int, ASK_CONVERSATION_LIMIT)
      .query<{ SessionId: string; Title: string | null; MaterialTitle: string | null }>(`
        SELECT TOP (@limit)
          c.SessionId,
          c.Title,
          m.Title AS MaterialTitle
        FROM fahm.ChatConversations c
        INNER JOIN fahm.LearningSessions s ON s.SessionId = c.SessionId
        LEFT JOIN fahm.LearningMaterials m ON m.MaterialId = s.MaterialId
        WHERE c.StudentProfileId = @studentProfileId
        ORDER BY c.UpdatedAt DESC
      `);
    return result.recordset.map((row) => ({
      sessionId: String(row.SessionId),
      title: (row.MaterialTitle ?? row.Title ?? "محادثة").trim(),
    }));
  },
};
