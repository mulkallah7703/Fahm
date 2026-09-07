import type { Request, Response } from "express";
import { materialService } from "../services/materialService.js";
import { ValidationError } from "../utils/errors.js";
import { clientIp } from "../utils/sanitize.js";
import { textMaterialSchema } from "../validators/materialValidators.js";

export const materialController = {
  async upload(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      throw new ValidationError("اختر ملفاً أولاً.", "FILE_REQUIRED");
    }

    const data = await materialService.uploadFile({
      user: req.authUser!,
      buffer: file.buffer,
      originalName: file.originalname || "upload",
      declaredMime: file.mimetype,
      ipAddress: clientIp(req),
      userAgent: req.header("user-agent") ?? null,
    });

    res.status(201).json({ success: true, data });
  },

  async createFromText(req: Request, res: Response): Promise<void> {
    const parsed = textMaterialSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "النص غير صالح.",
      );
    }

    const data = await materialService.createFromText({
      user: req.authUser!,
      text: parsed.data.text,
      title: parsed.data.title,
      ipAddress: clientIp(req),
      userAgent: req.header("user-agent") ?? null,
    });

    res.status(201).json({ success: true, data });
  },

  async file(req: Request, res: Response): Promise<void> {
    const materialId = req.params.materialId;
    if (!materialId) {
      throw new ValidationError("معرف المادة مطلوب.");
    }
    const file = await materialService.readOwnedFile({
      user: req.authUser!,
      materialId,
    });
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    );
    res.send(file.buffer);
  },
};
