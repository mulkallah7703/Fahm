import type { Request, Response } from "express";
import { HISTORY_NOT_FOUND } from "../config/history.js";
import { historyService } from "../services/historyService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { historyQuerySchema, historySessionParam } from "../validators/historyValidators.js";

export const historyController = {
  async list(req: Request, res: Response): Promise<void> {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError("معاملات التصفح غير صالحة.");
    }
    const data = await historyService.list(req.authUser!, parsed.data);
    res.json({ success: true, data });
  },

  async get(req: Request, res: Response): Promise<void> {
    const parsed = historySessionParam.safeParse(req.params.sessionId);
    if (!parsed.success) {
      throw new NotFoundError(HISTORY_NOT_FOUND);
    }
    const data = await historyService.get(req.authUser!, parsed.data);
    res.json({ success: true, data });
  },
};
