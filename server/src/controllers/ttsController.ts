import type { Request, Response } from "express";
import { ttsService } from "../services/audio/ttsService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { ttsBodySchema } from "../validators/blindValidators.js";
import { sessionRepository } from "../repositories/sessionRepository.js";

export const ttsController = {
  async create(req: Request, res: Response): Promise<void> {
    const parsed = ttsBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "طلب الصوت غير صالح.");
    }
    const user = req.authUser!;
    if (!user.studentProfileId) throw new NotFoundError("لم يتم العثور على الملف.");
    if (parsed.data.sessionId) {
      const owned = await sessionRepository.belongsToStudent(parsed.data.sessionId, user.studentProfileId);
      if (!owned) throw new NotFoundError("لم يتم العثور على جلسة التعلم.");
    }
    const data = await ttsService.generate({
      text: parsed.data.text,
      studentProfileId: user.studentProfileId,
      sessionId: parsed.data.sessionId ?? null,
      voice: parsed.data.voice ?? null,
    });
    res.json({ success: true, data });
  },

  async file(req: Request, res: Response): Promise<void> {
    const id = String(req.params.id ?? "");
    const user = req.authUser!;
    if (!user.studentProfileId || !id) throw new NotFoundError("لم يتم العثور على الملف الصوتي.");
    const file = await ttsService.readOwnedFile(id, user.studentProfileId);
    if (!file) throw new NotFoundError("لم يتم العثور على الملف الصوتي.");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(file.bytes);
  },
};
