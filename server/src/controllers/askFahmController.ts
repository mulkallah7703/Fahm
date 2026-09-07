import type { Request, Response } from "express";
import { askFahmService } from "../services/teaching/askFahmService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { sessionIdParam } from "../validators/lessonValidators.js";
import { askActionBodySchema, askMessageBodySchema, askMessageText } from "../validators/askFahmValidators.js";

function sessionId(req: Request): string {
  const parsed = sessionIdParam.safeParse(req.params.sessionId);
  if (!parsed.success) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return parsed.data;
}

export const askFahmController = {
  async get(req: Request, res: Response): Promise<void> {
    const data = await askFahmService.getExperience(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async send(req: Request, res: Response): Promise<void> {
    const parsed = askMessageBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "السؤال غير صالح.");
    }
    const data = await askFahmService.sendMessage(
      req.authUser!,
      sessionId(req),
      askMessageText(parsed.data),
      parsed.data.conceptId,
    );
    res.json({ success: true, data });
  },

  async action(req: Request, res: Response): Promise<void> {
    const parsed = askActionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "الإجراء غير صالح.");
    }
    const data = await askFahmService.performAction(req.authUser!, sessionId(req), parsed.data.action);
    res.json({ success: true, data });
  },
};
