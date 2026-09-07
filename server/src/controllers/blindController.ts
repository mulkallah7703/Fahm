import type { Request, Response } from "express";
import { blindTeachingService } from "../services/teaching/blindTeachingService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { sessionIdParam } from "../validators/lessonValidators.js";
import { blindActionBodySchema, blindAudioBodySchema } from "../validators/blindValidators.js";

function sessionId(req: Request): string {
  const parsed = sessionIdParam.safeParse(req.params.sessionId);
  if (!parsed.success) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return parsed.data;
}

export const blindController = {
  async get(req: Request, res: Response): Promise<void> {
    const data = await blindTeachingService.getExperience(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async segments(req: Request, res: Response): Promise<void> {
    const data = await blindTeachingService.getExperience(req.authUser!, sessionId(req));
    res.json({ success: true, data: data.blind });
  },

  async action(req: Request, res: Response): Promise<void> {
    const parsed = blindActionBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "الإجراء غير صالح.");
    }
    const data = await blindTeachingService.performAction(req.authUser!, sessionId(req), parsed.data.action, {
      paragraphIndex: parsed.data.paragraphIndex,
      speed: parsed.data.speed,
      segmentId: parsed.data.segmentId,
    });
    res.json({ success: true, data });
  },

  async audio(req: Request, res: Response): Promise<void> {
    const parsed = blindAudioBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "طلب الصوت غير صالح.");
    }
    const data = await blindTeachingService.generateSegmentAudio(
      req.authUser!,
      sessionId(req),
      parsed.data.segmentId,
    );
    res.json({ success: true, data });
  },
};
