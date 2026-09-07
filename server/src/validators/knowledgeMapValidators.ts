import { z } from "zod";
import { KNOWLEDGE_MAP_ACTIONS } from "../config/knowledgeMap.js";

export const mapSessionIdParam = z.string().uuid();
export const mapConceptIdParam = z.string().uuid();

export const mapActionBodySchema = z.object({
  action: z.enum(KNOWLEDGE_MAP_ACTIONS),
  conceptId: z.string().uuid("معرف المفهوم غير صالح.").optional(),
});
