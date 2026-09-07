import type { Request, Response } from "express";
import { analysisService } from "../services/analysis/analysisService.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { clientIp } from "../utils/sanitize.js";
import {
  analyzeBodySchema,
  materialIdParam,
  ocrCorrectionSchema,
  startLearningSchema,
} from "../validators/analysisValidators.js";

function materialId(req: Request): string {
  const parsed = materialIdParam.safeParse(req.params.materialId);
  if (!parsed.success) {
    throw new NotFoundError("لم يتم العثور على الصفحة.");
  }
  return parsed.data;
}

export const analysisController = {
  async get(req: Request, res: Response): Promise<void> {
    const data = await analysisService.getAnalysis(req.authUser!, materialId(req));
    res.json({ success: true, data });
  },

  async analyze(req: Request, res: Response): Promise<void> {
    const body = analyzeBodySchema.safeParse(req.body ?? {});
    const data = await analysisService.startAnalysis(req.authUser!, materialId(req), {
      force: body.success ? body.data.force : false,
      ipAddress: clientIp(req),
      userAgent: req.header("user-agent") ?? null,
    });
    const status = data.status === "completed" ? 200 : 202;
    res.status(status).json({ success: true, data });
  },

  async correctOcr(req: Request, res: Response): Promise<void> {
    const parsed = ocrCorrectionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "النص غير صالح.");
    }
    const data = await analysisService.saveOcrCorrection(
      req.authUser!,
      materialId(req),
      parsed.data.text,
    );
    res.json({ success: true, data });
  },

  async startLearning(req: Request, res: Response): Promise<void> {
    const parsed = startLearningSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new ValidationError("طريقة الشرح غير صالحة.");
    }
    const data = await analysisService.startLearning(
      req.authUser!,
      materialId(req),
      parsed.data.modeCode,
    );
    res.json({ success: true, data });
  },
};
