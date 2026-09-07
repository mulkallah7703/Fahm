import type { Request, Response } from "express";
import { learningModeService } from "../services/learning/learningModeService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { clientIp } from "../utils/sanitize.js";
import {
  learningMaterialParam,
  selectModeSchema,
} from "../validators/learningValidators.js";

function materialId(req: Request): string {
  const parsed = learningMaterialParam.safeParse(req.params.materialId);
  if (!parsed.success) {
    throw new NotFoundError("لم يتم العثور على الصفحة.");
  }
  return parsed.data;
}

export const learningController = {
  async listModes(_req: Request, res: Response): Promise<void> {
    const modes = await learningModeService.listModes();
    res.json({ success: true, data: { modes } });
  },

  async setup(req: Request, res: Response): Promise<void> {
    const data = await learningModeService.getSetup(req.authUser!, materialId(req));
    res.json({ success: true, data });
  },

  async recommendation(req: Request, res: Response): Promise<void> {
    const data = await learningModeService.getRecommendation(req.authUser!, materialId(req));
    res.json({ success: true, data });
  },

  async session(req: Request, res: Response): Promise<void> {
    const data = await learningModeService.getSession(req.authUser!, materialId(req));
    res.json({ success: true, data });
  },

  async selectMode(req: Request, res: Response): Promise<void> {
    const parsed = selectModeSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "طريقة الشرح غير صالحة.",
        "INVALID_MODE",
      );
    }
    const data = await learningModeService.selectMode(
      req.authUser!,
      materialId(req),
      parsed.data,
      {
        ipAddress: clientIp(req),
        userAgent: req.header("user-agent") ?? null,
      },
    );
    res.json({ success: true, data });
  },
};
