import type { Request, Response } from "express";
import { lessonService } from "../services/teaching/lessonService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { answerBodySchema, askBodySchema, sessionIdParam } from "../validators/lessonValidators.js";

function sessionId(req: Request): string {
  const parsed = sessionIdParam.safeParse(req.params.sessionId);
  if (!parsed.success) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
  return parsed.data;
}

export const lessonController = {
  async get(req: Request, res: Response): Promise<void> {
    const data = await lessonService.getSession(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async currentStep(req: Request, res: Response): Promise<void> {
    const data = await lessonService.getSession(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async advance(req: Request, res: Response): Promise<void> {
    const data = await lessonService.advance(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async answer(req: Request, res: Response): Promise<void> {
    const parsed = answerBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "الإجابة غير صالحة.");
    }
    const data = await lessonService.submitAnswer(req.authUser!, sessionId(req), parsed.data);
    res.json({ success: true, data });
  },

  async hint(req: Request, res: Response): Promise<void> {
    const data = await lessonService.hint(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async simplify(req: Request, res: Response): Promise<void> {
    const data = await lessonService.simplify(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async example(req: Request, res: Response): Promise<void> {
    const data = await lessonService.example(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },

  async ask(req: Request, res: Response): Promise<void> {
    const parsed = askBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "السؤال غير صالح.");
    }
    const data = await lessonService.ask(req.authUser!, sessionId(req), parsed.data.question);
    res.json({ success: true, data });
  },

  async complete(req: Request, res: Response): Promise<void> {
    const data = await lessonService.complete(req.authUser!, sessionId(req));
    res.json({ success: true, data });
  },
};
