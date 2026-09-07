import type { Request, Response } from "express";
import { dyslexiaTeachingService } from "../services/teaching/dyslexiaTeachingService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { sessionIdParam } from "../validators/lessonValidators.js";
import { dyslexiaActionBodySchema } from "../validators/dyslexiaValidators.js";

function sessionId(req: Request): string {
  const parsed = sessionIdParam.safeParse(req.params.sessionId);
  if (!parsed.success) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return parsed.data;
}

export const dyslexiaController = {
  async get(req: Request, res: Response): Promise<void> {
    const data = await dyslexiaTeachingService.getExperience(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async action(req: Request, res: Response): Promise<void> {
    const parsed = dyslexiaActionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "الإجراء غير صالح.");
    }
    const data = await dyslexiaTeachingService.performAction(
      req.authUser!,
      sessionId(req),
      parsed.data.action,
      parsed.data,
    );
    res.json({ success: true, data });
  },
};
