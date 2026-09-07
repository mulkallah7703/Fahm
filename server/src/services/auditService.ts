import { auditRepository } from "../repositories/auditRepository.js";
import type { AuditInput } from "../types/index.js";
import { logger } from "../utils/logger.js";

export const auditService = {
  async record(entry: AuditInput): Promise<void> {
    try {
      await auditRepository.write(entry);
    } catch {
      logger.error("audit_failed", {
        actionType: entry.actionType,
        entityName: entry.entityName ?? null,
      });
    }
  },
};
