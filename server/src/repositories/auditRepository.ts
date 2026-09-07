import sql from "mssql";
import { getPool } from "../config/database.js";
import type { AuditInput } from "../types/index.js";

export const auditRepository = {
  async write(entry: AuditInput): Promise<void> {
    const pool = await getPool();
    await pool
      .request()
      .input("userId", sql.UniqueIdentifier, entry.userId ?? null)
      .input("actionType", sql.NVarChar(100), entry.actionType)
      .input("entityName", sql.NVarChar(200), entry.entityName ?? null)
      .input("entityId", sql.NVarChar(100), entry.entityId ?? null)
      .input("description", sql.NVarChar(sql.MAX), entry.description ?? null)
      .input("ipAddress", sql.NVarChar(64), entry.ipAddress ?? null)
      .input("userAgent", sql.NVarChar(1000), entry.userAgent ?? null)
      .query(`
        INSERT INTO fahm.AuditLogs
          (UserId, ActionType, EntityName, EntityId, Description, IpAddress, UserAgent)
        VALUES
          (@userId, @actionType, @entityName, @entityId, @description, @ipAddress, @userAgent)
      `);
  },
};
