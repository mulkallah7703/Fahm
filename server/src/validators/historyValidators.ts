import { z } from "zod";
import { HISTORY_SEARCH_MAX } from "../config/history.js";

export const historyFilterSchema = z.enum(["all", "needs_review"]);

export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
  search: z.string().trim().max(HISTORY_SEARCH_MAX).optional(),
  filter: historyFilterSchema.optional(),
});

export const historySessionParam = z.string().uuid();
