import type { Request, Response } from "express";
import { adaptiveSessionService } from "../services/teaching/adaptiveSessionService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { sessionIdParam } from "../validators/lessonValidators.js";
import { adaptiveActionBodySchema } from "../validators/adaptiveValidators.js";

function sessionId(req: Request): string {
  const parsed = sessionIdParam.safeParse(req.params.sessionId);
  if (!parsed.success) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return parsed.data;
}

export const adaptiveController = {
  async get(req: Request, res: Response): Promise<void> {
    const data = await adaptiveSessionService.getExperience(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async action(req: Request, res: Response): Promise<void> {
    const parsed = adaptiveActionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "الإجراء غير صالح.");
    }
    const data = await adaptiveSessionService.performAction(
      req.authUser!,
      sessionId(req),
      parsed.data.action,
    );
    res.json({ success: true, data });
  },
};
