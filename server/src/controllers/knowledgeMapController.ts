import type { Request, Response } from "express";
import { MAP_NOT_FOUND } from "../config/knowledgeMap.js";
import { knowledgeMapService } from "../services/knowledgeMap/knowledgeMapService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import {
  mapActionBodySchema,
  mapConceptIdParam,
  mapSessionIdParam,
} from "../validators/knowledgeMapValidators.js";

function sessionId(req: Request): string {
  const parsed = mapSessionIdParam.safeParse(req.params.sessionId);
  if (!parsed.success) throw new NotFoundError(MAP_NOT_FOUND);
  return parsed.data;
}

function conceptId(req: Request): string {
  const parsed = mapConceptIdParam.safeParse(req.params.conceptId);
  if (!parsed.success) throw new NotFoundError(MAP_NOT_FOUND);
  return parsed.data;
}

export const knowledgeMapController = {
  async studentMap(req: Request, res: Response): Promise<void> {
    const data = await knowledgeMapService.getStudentMap(req.authUser!);
    res.json({ success: true, data });
  },

  async sessionMap(req: Request, res: Response): Promise<void> {
    const data = await knowledgeMapService.getSessionMap(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async concept(req: Request, res: Response): Promise<void> {
    const data = await knowledgeMapService.getConcept(req.authUser!, sessionId(req), conceptId(req));
    res.json({ success: true, data });
  },

  async action(req: Request, res: Response): Promise<void> {
    const parsed = mapActionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "الإجراء غير صالح.");
    }
    const data = await knowledgeMapService.performAction(
      req.authUser!,
      sessionId(req),
      parsed.data.action,
      parsed.data.conceptId,
    );
    res.json({ success: true, data });
  },
};
